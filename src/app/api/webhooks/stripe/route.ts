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
  
  console.log(`✅ Payment received via Stripe Connect: €${amountPaid}`)
  
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
  
  const newPaidCount = (offer.paidInstallments || 0) + 1
  await adminDb.collection('offers').doc(offerId).update({
    installments: updatedInstallments,
    paidInstallments: newPaidCount,
    status: newPaidCount >= offer.totalSessions ? 'fully_paid' : 'active',
    updatedAt: FieldValue.serverTimestamp(),
  })
  
  await adminDb.collection('transactions').add({
    type: 'coaching_payment',
    offerId,
    coachId,
    coacheeId,
    sessionNumber: instNum,
    offerTitle: offer.title,
    amountPaid,
    coachPayout,
    platformFee,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    payoutMethod: 'stripe_connect_automatic',
    createdAt: FieldValue.serverTimestamp(),
  })
  
  // Invia email
  await sendPaymentEmails(offer, instNum, amountPaid, coachPayout)
}

async function sendPaymentEmails(offer: any, sessionNumber: number, amountPaid: number, coachPayout: number) {
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
          note: 'Il pagamento è stato accreditato automaticamente sul tuo account Stripe.'
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

async function handleCoachSubscriptionCreated(session: Stripe.Checkout.Session) {
  const coachId = session.metadata?.coachId
  const tier = session.metadata?.tier || 'professional'
  const billingCycle = session.metadata?.billingCycle || 'monthly'
  
  if (!coachId) {
    console.error('No coachId in coach_subscription session metadata')
    return
  }
  
  console.log(`✅ Coach subscription created: ${coachId} - ${tier} (${billingCycle})`)
  
  // Update coachApplications with subscription info
  await adminDb.collection('coachApplications').doc(coachId).update({
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    subscriptionBillingCycle: billingCycle,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    subscriptionStartDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  
  // Also update the user document
  await adminDb.collection('users').doc(coachId).update({
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

async function handleCoachSubscriptionUpdated(subscription: Stripe.Subscription) {
  const coachId = subscription.metadata?.coachId
  if (!coachId) return
  
  const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'expired'
  const tier = subscription.metadata?.tier || 'professional'
  
  // Calculate subscription end date
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
  
  console.log(`📋 Coach subscription updated: ${coachId} - ${status} - ${tier}`)
  
  await adminDb.collection('coachApplications').doc(coachId).update({
    subscriptionStatus: status,
    subscriptionTier: tier,
    stripeSubscriptionStatus: subscription.status,
    subscriptionEndDate: currentPeriodEnd,
    updatedAt: FieldValue.serverTimestamp(),
  })
  
  await adminDb.collection('users').doc(coachId).update({
    subscriptionStatus: status,
    subscriptionTier: tier,
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
