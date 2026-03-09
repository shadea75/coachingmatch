// src/app/api/webhooks/stripe/route.ts
// Webhook Stripe per Stripe Connect - SEMPLIFICATO

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

const COACH_PERCENT = 70
const PLATFORM_PERCENT = 30

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.metadata?.type === 'coaching_session') {
          await handleCoachingPayment(session)
        } else if (session.metadata?.type === 'community_subscription') {
          await handleCommunitySubscriptionCreated(session)
        } else if (session.metadata?.type === 'coach_subscription') {
          await handleCoachSubscriptionCreated(session)
        }
        break
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.metadata?.type === 'community_subscription') {
          await handleSubscriptionUpdated(subscription)
        } else if (subscription.metadata?.type === 'coach_subscription') {
          await handleCoachSubscriptionUpdated(subscription)
        }
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.metadata?.type === 'community_subscription') {
          await handleSubscriptionCancelled(subscription)
        } else if (subscription.metadata?.type === 'coach_subscription') {
          await handleCoachSubscriptionCancelled(subscription)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        // Gestisci rinnovi abbonamento coach
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
          if (sub.metadata?.type === 'coach_subscription') {
            await handleCoachSubscriptionRenewed(sub, invoice)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
          if (sub.metadata?.type === 'coach_subscription' && sub.metadata?.coachId) {
            console.log(`⚠️ Pagamento fallito per coach ${sub.metadata.coachId}`)
            await adminDb.collection('coachApplications').doc(sub.metadata.coachId).update({
              stripeSubscriptionStatus: 'past_due',
              updatedAt: FieldValue.serverTimestamp(),
            })
          }
        }
        break
      }
      
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
    
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleCoachingPayment(session: Stripe.Checkout.Session) {
  const { offerId, installmentNumber, coachId, coacheeId } = session.metadata!
  
  if (!offerId) {
    console.error('No offerId in session metadata')
    return
  }
  
  const offerDoc = await adminDb.collection('offers').doc(offerId).get()
  if (!offerDoc.exists) {
    console.error('Offer not found:', offerId)
    return
  }
  
  const offer = offerDoc.data() as any
  const instNum = parseInt(installmentNumber)
  
  const amountPaid = (session.amount_total || 0) / 100
  const coachPayout = amountPaid * (COACH_PERCENT / 100)
  const platformFee = amountPaid * (PLATFORM_PERCENT / 100)
  
  // payoutMethod salvato nei metadata dal checkout
  const payoutMethod = session.metadata?.payoutMethod || 'bank_transfer'
  
  console.log(`✅ Pagamento: €${amountPaid} | metodo coach: ${payoutMethod}`)
  
  // 1. Aggiorna installment
  const updatedInstallments = [...(offer.installments || [])]
  if (updatedInstallments[instNum - 1]) {
    updatedInstallments[instNum - 1] = {
      ...updatedInstallments[instNum - 1],
      status: 'paid',
      paidAt: new Date().toISOString(),
      amount: amountPaid,
      coachPayout,
      platformFee,
      payoutMethod,
      coachPayoutStatus: payoutMethod === 'stripe' ? 'automatic' : 'pending',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
    }
  }
  
  const newPaidCount = (offer.paidInstallments || 0) + 1
  await adminDb.collection('offers').doc(offerId).update({
    installments: updatedInstallments,
    paidInstallments: newPaidCount,
    status: newPaidCount >= offer.totalSessions ? 'fully_paid' : 'active',
    updatedAt: FieldValue.serverTimestamp(),
  })
  
  // 2. Solo per bonifico → scrivi in coachPayouts per dashboard admin
  if (payoutMethod === 'bank_transfer') {
    const payoutDocId = `${offerId}_${instNum}`
    await adminDb.collection('coachPayouts').doc(payoutDocId).set({
      offerId,
      offerTitle: offer.title,
      coachId: coachId || offer.coachId,
      coachName: offer.coachName,
      coachEmail: offer.coachEmail,
      coacheeId: coacheeId || offer.coacheeId,
      coacheeName: offer.coacheeName,
      sessionNumber: instNum,
      totalSessions: offer.totalSessions,
      amountPaid,       // 100% pagato dal coachee
      coachPayout,      // 70% da bonificare al coach
      platformFee,      // 30% resta a CoachaMi
      payoutMethod: 'bank_transfer',
      status: 'pending',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      paidAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    console.log(`🏦 coachPayouts creato: ${payoutDocId} — da bonificare €${coachPayout}`)
  }
  // Se stripe → il transfer è già avvenuto automaticamente, niente da fare
  
  // 3. Transazione
  await adminDb.collection('transactions').add({
    type: 'coaching_payment',
    offerId,
    coachId: coachId || offer.coachId,
    coacheeId: coacheeId || offer.coacheeId,
    sessionNumber: instNum,
    offerTitle: offer.title,
    amountPaid,
    coachPayout,
    platformFee,
    payoutMethod,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    createdAt: FieldValue.serverTimestamp(),
  })
  
  // 4. Email
  await sendPaymentEmails(offer, instNum, amountPaid, coachPayout, payoutMethod)
}

async function sendPaymentEmails(offer: any, sessionNumber: number, amountPaid: number, coachPayout: number, payoutMethod: string = 'bank_transfer') {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment-success',
        data: {
          coacheeEmail: offer.coacheeEmail,
          coacheeName: offer.coacheeName,
          coachName: offer.coachName,
          coachEmail: offer.coachEmail,
          offerTitle: offer.title,
          sessionNumber,
          totalSessions: offer.totalSessions,
          amountPaid,
        }
      })
    })
    
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment-success',
        data: {
          coachEmail: offer.coachEmail,
          coachName: offer.coachName,
          coacheeName: offer.coacheeName,
          coacheeEmail: offer.coacheeEmail,
          offerTitle: offer.title,
          sessionNumber,
          amountPaid,
          coachPayout,
          note: payoutMethod === 'stripe' ? 'Il pagamento è stato trasferito automaticamente sul tuo account Stripe.' : 'Riceverai il bonifico da CoachaMi entro lunedì prossimo. Ricorda di emettere fattura/ricevuta a CoachaMi.'
        }
      })
    })
  } catch (error) {
    console.error('Error sending payment emails:', error)
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  const coachId = account.metadata?.coachId
  if (!coachId) return
  
  await adminDb.collection('coachStripeAccounts').doc(coachId).update({
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    onboardingComplete: account.details_submitted,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

async function handleCommunitySubscriptionCreated(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) return
  
  await adminDb.collection('users').doc(userId).update({
    membershipStatus: 'active',
    membershipType: 'community',
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    membershipStartDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return
  
  const status = subscription.status === 'active' ? 'active' : 'inactive'
  
  await adminDb.collection('users').doc(userId).update({
    membershipStatus: status,
    stripeSubscriptionStatus: subscription.status,
    updatedAt: FieldValue.serverTimestamp()
  })
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return
  
  await adminDb.collection('users').doc(userId).update({
    membershipStatus: 'cancelled',
    membershipEndDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  })
}

// ===== COACH SUBSCRIPTION HANDLERS =====

async function handleCoachSubscriptionRenewed(subscription: Stripe.Subscription, invoice: Stripe.Invoice) {
  const coachId = subscription.metadata?.coachId
  if (!coachId) return

  const tier = subscription.metadata?.tier || 'professional'
  const priceAmount = parseFloat(subscription.metadata?.priceAmount || '0')
  const newPeriodEnd = new Date(subscription.current_period_end * 1000)

  console.log(`🔄 Coach subscription renewed: ${coachId} - ${tier} - nuova scadenza: ${newPeriodEnd.toISOString()}`)

  const updateData: any = {
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    stripeSubscriptionStatus: 'active',
    subscriptionEndDate: newPeriodEnd,
    trialEndDate: null,
    updatedAt: FieldValue.serverTimestamp(),
  }
  if (priceAmount > 0) updateData.subscriptionPrice = priceAmount

  await adminDb.collection('coachApplications').doc(coachId).update(updateData)
  await adminDb.collection('users').doc(coachId).update({
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    ...(priceAmount > 0 ? { subscriptionPrice: priceAmount } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

async function handleCoachSubscriptionCreated(session: Stripe.Checkout.Session) {
  const coachId = session.metadata?.coachId
  const tier = session.metadata?.tier || 'professional'
  const billingCycle = session.metadata?.billingCycle || 'monthly'
  const priceAmount = parseFloat(session.metadata?.priceAmount || '0')
  
  if (!coachId) {
    console.error('No coachId in coach_subscription session metadata')
    return
  }
  
  console.log(`✅ Coach subscription created: ${coachId} - ${tier} (${billingCycle}) €${priceAmount}`)
  
  // Recupera i dettagli della subscription per avere current_period_end
  let subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  if (session.subscription) {
    try {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      subscriptionEndDate = new Date(sub.current_period_end * 1000)
    } catch (e) {
      console.error('Errore recupero subscription:', e)
    }
  }

  await adminDb.collection('coachApplications').doc(coachId).update({
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    subscriptionPrice: priceAmount,
    subscriptionBillingCycle: billingCycle,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    stripeSubscriptionStatus: 'active',
    subscriptionStartDate: FieldValue.serverTimestamp(),
    subscriptionEndDate: subscriptionEndDate,
    trialEndDate: null,
    updatedAt: FieldValue.serverTimestamp(),
  })
  
  await adminDb.collection('users').doc(coachId).update({
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    subscriptionPrice: priceAmount,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

async function handleCoachSubscriptionUpdated(subscription: Stripe.Subscription) {
  const coachId = subscription.metadata?.coachId
  if (!coachId) return
  
  const stripeStatus = subscription.status
  const tier = subscription.metadata?.tier || 'professional'
  const priceAmount = parseFloat(subscription.metadata?.priceAmount || '0')
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  // Mappa stati Stripe → stati interni
  // 'trialing' = abbonamento creato ma non ancora pagato (trial gratuito Stripe)
  // 'active' = pagamento avvenuto, abbonamento attivo
  let status: 'active' | 'trial' | 'expired'
  if (stripeStatus === 'active') {
    status = 'active'
  } else if (stripeStatus === 'trialing') {
    status = 'trial'
  } else {
    status = 'expired'
  }
  
  console.log(`📋 Coach subscription updated: ${coachId} - ${status} (stripe: ${stripeStatus}) - ${tier}`)
  
  const updateData: any = {
    subscriptionStatus: status,
    subscriptionTier: tier,
    stripeSubscriptionStatus: stripeStatus,
    subscriptionEndDate: currentPeriodEnd,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (priceAmount > 0) {
    updateData.subscriptionPrice = priceAmount
  }

  // Se diventa active (ha pagato), azzera trialEndDate
  if (status === 'active') {
    updateData.trialEndDate = null
    updateData.subscriptionStartDate = FieldValue.serverTimestamp()
  }

  // Se trialing, imposta trialEndDate
  if (status === 'trial' && subscription.trial_end) {
    updateData.trialEndDate = new Date(subscription.trial_end * 1000)
  }

  await adminDb.collection('coachApplications').doc(coachId).update(updateData)
  
  await adminDb.collection('users').doc(coachId).update({
    subscriptionStatus: status,
    subscriptionTier: tier,
    ...(priceAmount > 0 ? { subscriptionPrice: priceAmount } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

async function handleCoachSubscriptionCancelled(subscription: Stripe.Subscription) {
  const coachId = subscription.metadata?.coachId
  if (!coachId) return
  
  console.log(`❌ Coach subscription cancelled: ${coachId}`)
  
  await adminDb.collection('coachApplications').doc(coachId).update({
    subscriptionStatus: 'expired',
    subscriptionEndDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  
  await adminDb.collection('users').doc(coachId).update({
    subscriptionStatus: 'expired',
    updatedAt: FieldValue.serverTimestamp(),
  })
}
