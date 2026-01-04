// src/app/api/webhooks/stripe/route.ts
// Webhook Stripe per Modello A (Marketplace) - CALCOLI CORRETTI

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
  Timestamp
} from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Configurazione split 70/30
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
      
      // Fattura Stripe finalizzata (per il coachee)
      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.metadata?.offerId) {
          await handleInvoiceFinalized(invoice)
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
      
      // Stripe Connect events
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }
      
      // Transfer completato (payout al coach)
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        await handleTransferCreated(transfer)
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

// ============= COACHING PAYMENT (MODELLO A) - CALCOLI CORRETTI =============

async function handleCoachingPayment(session: Stripe.Checkout.Session) {
  const { offerId, installmentNumber, coachId, coacheeId, coachName, coachEmail } = session.metadata!
  
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
  
  // IMPORTO PAGATO DAL COACHEE (in euro)
  const amountPaid = (session.amount_total || 0) / 100 // Es: €100
  
  // CALCOLI CORRETTI - Split 70/30 sul LORDO
  const coachPayout = amountPaid * (COACH_PERCENT / 100) // €70 - va al coach
  const platformFee = amountPaid * (PLATFORM_PERCENT / 100) // €30 - resta a CoachaMi
  const platformFeeNet = platformFee / 1.22 // €24,59 - guadagno netto CoachaMi (dopo IVA)
  const platformVat = platformFee - platformFeeNet // €5,41 - IVA da versare
  
  console.log(`Payment received: €${amountPaid}`)
  console.log(`- Coach payout (70%): €${coachPayout.toFixed(2)}`)
  console.log(`- Platform fee (30%): €${platformFee.toFixed(2)}`)
  console.log(`- Platform net: €${platformFeeNet.toFixed(2)}`)
  
  // Aggiorna rata come pagata
  const updatedInstallments = [...(offer.installments || [])]
  if (updatedInstallments[instNum - 1]) {
    updatedInstallments[instNum - 1] = {
      ...updatedInstallments[instNum - 1],
      status: 'paid',
      paidAt: new Date().toISOString(),
      // Salva i valori CORRETTI
      amount: amountPaid, // €100 - pagato dal coachee
      coachPayout: coachPayout, // €70 - al coach
      platformFee: platformFee, // €30 - a CoachaMi
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      stripeInvoiceId: session.invoice,
    }
  }
  
  // Calcola prossimo lunedì per il payout
  const nextMonday = getNextMonday()
  
  // Aggiorna offerta
  const newPaidCount = (offer.paidInstallments || 0) + 1
  await updateDoc(offerRef, {
    installments: updatedInstallments,
    paidInstallments: newPaidCount,
    status: newPaidCount >= offer.totalSessions ? 'fully_paid' : 'active',
    updatedAt: serverTimestamp(),
  })
  
  // Crea record payout pendente (per tracciare il pagamento al coach)
  const payoutRef = await addDoc(collection(db, 'pendingPayouts'), {
    // Riferimenti
    offerId,
    coachId,
    coacheeId,
    sessionNumber: instNum,
    offerTitle: offer.title,
    coachName: offer.coachName,
    coachEmail: offer.coachEmail,
    
    // IMPORTI CORRETTI
    amountPaid: amountPaid, // €100 - pagato dal coachee
    coachPayout: coachPayout, // €70 - da pagare al coach
    platformFee: platformFee, // €30 - commissione CoachaMi
    platformFeeNet: platformFeeNet, // €24,59 - guadagno netto
    platformVat: platformVat, // €5,41 - IVA
    
    // Stripe references
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    stripeInvoiceId: session.invoice,
    stripeTransferId: null,
    
    // Fattura coach → CoachaMi
    coachInvoice: {
      required: true,
      received: false,
      number: null,
      receivedAt: null,
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
      notes: null,
    },
    
    // Stato payout
    payoutStatus: 'awaiting_invoice',
    scheduledPayoutDate: Timestamp.fromDate(nextMonday),
    completedAt: null,
    failureReason: null,
    
    // Metadata
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  console.log(`Payout ${payoutRef.id} created for offer ${offerId}, session ${instNum}`)
  console.log(`Coach will receive: €${coachPayout.toFixed(2)}`)
  
  // Invia email al coach: notifica pagamento ricevuto
  await sendCoachPaymentNotification(offer, instNum, coachPayout, nextMonday)
  
  // Invia email conferma pagamento al coachee
  await sendPaymentConfirmationEmail(offer, instNum, amountPaid)
}

// Calcola il prossimo lunedì alle 9:00
function getNextMonday(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = domenica, 1 = lunedì, ...
  
  let daysUntilMonday: number
  if (dayOfWeek === 0) {
    daysUntilMonday = 1 // Domenica → Lunedì = 1 giorno
  } else if (dayOfWeek === 1) {
    // Se è lunedì, vai al prossimo lunedì (7 giorni)
    // A meno che non siano prima delle 9:00
    const hour = now.getHours()
    daysUntilMonday = hour < 9 ? 0 : 7
  } else {
    daysUntilMonday = 8 - dayOfWeek // Martedì=6, Mercoledì=5, ecc.
  }
  
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(9, 0, 0, 0)
  
  return nextMonday
}

// Email al coach: notifica pagamento ricevuto
async function sendCoachPaymentNotification(
  offer: any, 
  sessionNumber: number, 
  amount: number,
  payoutDate: Date
) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment-success', // Usa il tipo esistente
        data: {
          coachEmail: offer.coachEmail,
          coachName: offer.coachName,
          coacheeName: offer.coacheeName,
          offerTitle: offer.title,
          sessionNumber,
          amount: amount, // €70 - quello che riceverà il coach
        }
      })
    })
  } catch (error) {
    console.error('Error sending coach payment notification:', error)
  }
}

// Email al coachee: conferma pagamento
async function sendPaymentConfirmationEmail(
  offer: any,
  sessionNumber: number,
  amount: number
) {
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
          amount: amount, // €100 - quello che ha pagato
        }
      })
    })
  } catch (error) {
    console.error('Error sending payment confirmation email:', error)
  }
}

// Fattura Stripe finalizzata
async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  const offerId = invoice.metadata?.offerId
  
  if (!offerId) return
  
  try {
    const offerRef = doc(db, 'offers', offerId)
    
    // Salva riferimenti fattura per il coachee
    await updateDoc(offerRef, {
      [`platformInvoices.${invoice.id}`]: {
        stripeInvoiceId: invoice.id,
        invoiceNumber: invoice.number,
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        amount: (invoice.amount_paid || 0) / 100,
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    })
    
    console.log(`Invoice ${invoice.id} saved for offer ${offerId}`)
  } catch (error) {
    console.error('Error handling invoice finalized:', error)
  }
}

// ============= COMMUNITY SUBSCRIPTION HANDLERS =============

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

// ============= STRIPE CONNECT HANDLERS =============

async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Stripe Connect account updated: ${account.id}`)
  console.log(`- Charges enabled: ${account.charges_enabled}`)
  console.log(`- Payouts enabled: ${account.payouts_enabled}`)
  
  // Aggiorna stato in Firebase se necessario
  const coachId = account.metadata?.coachId
  if (coachId) {
    try {
      await updateDoc(doc(db, 'coachStripeAccounts', coachId), {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Error updating coach stripe account:', error)
    }
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  const payoutId = transfer.metadata?.payoutId
  
  if (payoutId) {
    console.log(`Transfer ${transfer.id} created for payout ${payoutId}`)
    // Il payout viene già aggiornato dall'endpoint batch-payout
  }
}
