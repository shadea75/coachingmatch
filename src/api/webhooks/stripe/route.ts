// src/app/api/webhooks/stripe/route.ts
// Webhook Stripe per Modello B (Stripe Connect) - SEMPLIFICATO

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection,
  serverTimestamp,
} from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Configurazione split (per logging/tracking)
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
      // Pagamento completato
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.metadata?.type === 'coaching_session') {
          await handleCoachingPayment(session)
        } else if (session.metadata?.type === 'community_subscription') {
          await handleCommunitySubscriptionCreated(session)
        }
        break
      }
      
      // Subscription events (community)
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.metadata?.type === 'community_subscription') {
          await handleSubscriptionUpdated(subscription)
        }
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.metadata?.type === 'community_subscription') {
          await handleSubscriptionCancelled(subscription)
        }
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await handleSubscriptionPaymentFailed(invoice)
        }
        break
      }
      
      // Stripe Connect: Account coach aggiornato
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

// ============= COACHING PAYMENT (STRIPE CONNECT) - SEMPLIFICATO =============

async function handleCoachingPayment(session: Stripe.Checkout.Session) {
  const { offerId, installmentNumber, coachId, coacheeId } = session.metadata!
  
  if (!offerId) {
    console.error('No offerId in session metadata')
    return
  }
  
  const offerRef = doc(db, 'offers', offerId)
  const offerDoc = await getDoc(offerRef)
  
  if (!offerDoc.exists()) {
    console.error('Offer not found:', offerId)
    return
  }
  
  const offer = offerDoc.data()
  const instNum = parseInt(installmentNumber)
  
  // Importo pagato dal coachee (in euro)
  const amountPaid = (session.amount_total || 0) / 100
  
  // Calcoli per logging/tracking (lo split è già stato fatto da Stripe!)
  const coachPayout = amountPaid * (COACH_PERCENT / 100)
  const platformFee = amountPaid * (PLATFORM_PERCENT / 100)
  
  console.log(`✅ Payment received via Stripe Connect: €${amountPaid}`)
  console.log(`   - Coach receives (automatic): €${coachPayout.toFixed(2)}`)
  console.log(`   - Platform fee (automatic): €${platformFee.toFixed(2)}`)
  
  // Aggiorna rata come pagata
  const updatedInstallments = [...(offer.installments || [])]
  if (updatedInstallments[instNum - 1]) {
    updatedInstallments[instNum - 1] = {
      ...updatedInstallments[instNum - 1],
      status: 'paid',
      paidAt: new Date().toISOString(),
      amount: amountPaid,
      coachPayout: coachPayout,
      platformFee: platformFee,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
    }
  }
  
  // Aggiorna offerta
  const newPaidCount = (offer.paidInstallments || 0) + 1
  await updateDoc(offerRef, {
    installments: updatedInstallments,
    paidInstallments: newPaidCount,
    status: newPaidCount >= offer.totalSessions ? 'fully_paid' : 'active',
    updatedAt: serverTimestamp(),
  })
  
  // Salva record transazione (per storico/report)
  await addDoc(collection(db, 'transactions'), {
    type: 'coaching_payment',
    offerId,
    coachId,
    coacheeId,
    sessionNumber: instNum,
    offerTitle: offer.title,
    
    // Importi
    amountPaid,
    coachPayout,
    platformFee,
    
    // Stripe references
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    
    // Note: con Stripe Connect il payout al coach è automatico!
    payoutMethod: 'stripe_connect_automatic',
    
    createdAt: serverTimestamp(),
  })
  
  // Invia email di conferma
  await sendPaymentEmails(offer, instNum, amountPaid, coachPayout)
  
  console.log(`Payment processed for offer ${offerId}, session ${instNum}`)
}

// Email di conferma pagamento
async function sendPaymentEmails(
  offer: any, 
  sessionNumber: number, 
  amountPaid: number,
  coachPayout: number
) {
  try {
    // Email al coachee
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
    
    // Email al coach
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
          // Nota per il coach
          note: 'Il pagamento è stato accreditato automaticamente sul tuo account Stripe.'
        }
      })
    })
  } catch (error) {
    console.error('Error sending payment emails:', error)
  }
}

// ============= STRIPE CONNECT: Account coach aggiornato =============

async function handleAccountUpdated(account: Stripe.Account) {
  const coachId = account.metadata?.coachId
  
  if (!coachId) {
    console.log(`Stripe account ${account.id} updated (no coachId in metadata)`)
    return
  }
  
  console.log(`Stripe Connect account updated for coach ${coachId}`)
  console.log(`   - Charges enabled: ${account.charges_enabled}`)
  console.log(`   - Payouts enabled: ${account.payouts_enabled}`)
  console.log(`   - Details submitted: ${account.details_submitted}`)
  
  try {
    await updateDoc(doc(db, 'coachStripeAccounts', coachId), {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete: account.details_submitted,
      updatedAt: serverTimestamp(),
    })
    
    // Se l'onboarding è appena stato completato, notifica il coach
    if (account.charges_enabled && account.payouts_enabled) {
      // TODO: Invia email "Il tuo account pagamenti è attivo!"
    }
  } catch (error) {
    console.error('Error updating coach stripe account:', error)
  }
}

// ============= COMMUNITY SUBSCRIPTION HANDLERS (invariati) =============

async function handleCommunitySubscriptionCreated(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  
  if (!userId) {
    console.error('No userId in subscription session metadata')
    return
  }
  
  await updateDoc(doc(db, 'users', userId), {
    membershipStatus: 'active',
    membershipType: 'community',
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    membershipStartDate: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  
  console.log(`Community subscription created for user ${userId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return
  
  const status = subscription.status === 'active' ? 'active' : 'inactive'
  
  await updateDoc(doc(db, 'users', userId), {
    membershipStatus: status,
    stripeSubscriptionStatus: subscription.status,
    updatedAt: serverTimestamp()
  })
  
  console.log(`Subscription updated for user ${userId}: ${status}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return
  
  await updateDoc(doc(db, 'users', userId), {
    membershipStatus: 'cancelled',
    membershipEndDate: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  
  console.log(`Subscription cancelled for user ${userId}`)
}

async function handleSubscriptionPaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Subscription payment failed for customer: ${invoice.customer}`)
  // TODO: Invia email di avviso pagamento fallito
}
