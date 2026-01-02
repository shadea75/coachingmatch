import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection,
  serverTimestamp 
} from 'firebase/firestore'
import { PLATFORM_CONFIG, calculatePayoutDate } from '@/types/payments'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

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
        await handleCheckoutCompleted(session)
        break
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSucceeded(paymentIntent)
        break
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(paymentIntent)
        break
      }
      
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleRefund(charge)
        break
      }
      
      // Stripe Connect events
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }
      
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

// Gestisce checkout completato
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const offerId = session.metadata?.offerId
  
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
  
  // Aggiorna offerta
  await updateDoc(offerRef, {
    status: 'paid',
    paidAt: serverTimestamp(),
    stripePaymentIntentId: session.payment_intent,
    stripeSessionId: session.id,
    updatedAt: serverTimestamp()
  })
  
  // Crea transazione
  const payoutDate = calculatePayoutDate(new Date())
  
  await addDoc(collection(db, 'transactions'), {
    offerId,
    coachId: offer.coachId,
    coacheeId: offer.coacheeId,
    type: 'payment',
    status: 'completed',
    amount: offer.priceTotal,
    netAmount: offer.priceNet,
    vatAmount: offer.vatAmount,
    platformFee: offer.platformFee,
    coachPayout: offer.coachPayout,
    stripePaymentIntentId: session.payment_intent,
    stripeSessionId: session.id,
    payoutScheduledAt: payoutDate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  
  // Crea pacchetto se è un package
  if (offer.type === 'package') {
    await addDoc(collection(db, 'purchasedPackages'), {
      offerId,
      coachId: offer.coachId,
      coacheeId: offer.coacheeId,
      title: offer.title,
      totalSessions: offer.sessionsIncluded,
      usedSessions: 0,
      remainingSessions: offer.sessionsIncluded,
      sessionDuration: offer.sessionDuration,
      purchasedAt: serverTimestamp(),
      isActive: true
    })
  }
  
  // Aggiorna statistiche coach
  await updateCoachEarnings(offer.coachId, offer.coachPayout)
  
  // TODO: Invia email di conferma
  console.log(`Payment completed for offer ${offerId}`)
}

// Gestisce pagamento riuscito
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`)
  // La maggior parte della logica è in handleCheckoutCompleted
}

// Gestisce pagamento fallito
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const offerId = paymentIntent.metadata?.offerId
  
  if (offerId) {
    await updateDoc(doc(db, 'offers', offerId), {
      stripePaymentStatus: 'failed',
      updatedAt: serverTimestamp()
    })
  }
  
  console.log(`Payment failed: ${paymentIntent.id}`)
  // TODO: Invia email di notifica
}

// Gestisce rimborso
async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string
  
  // Trova la transazione
  // TODO: Query per paymentIntentId e aggiorna stato
  
  console.log(`Refund processed for charge: ${charge.id}`)
  // TODO: Invia email di conferma rimborso
}

// Gestisce aggiornamento account Stripe Connect
async function handleAccountUpdated(account: Stripe.Account) {
  // Trova coach con questo stripeAccountId
  // Aggiorna stato onboarding
  
  console.log(`Account updated: ${account.id}`)
  console.log(`Charges enabled: ${account.charges_enabled}`)
  console.log(`Payouts enabled: ${account.payouts_enabled}`)
}

// Gestisce trasferimento creato (payout al coach)
async function handleTransferCreated(transfer: Stripe.Transfer) {
  const offerId = transfer.metadata?.offerId
  
  if (offerId) {
    // Aggiorna transazione con payout completato
    console.log(`Transfer created for offer ${offerId}: ${transfer.id}`)
  }
}

// Aggiorna statistiche guadagni coach
async function updateCoachEarnings(coachId: string, amount: number) {
  const earningsRef = doc(db, 'coachEarnings', coachId)
  const earningsDoc = await getDoc(earningsRef)
  
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  if (earningsDoc.exists()) {
    const data = earningsDoc.data()
    await updateDoc(earningsRef, {
      totalEarnings: (data.totalEarnings || 0) + amount,
      pendingPayout: (data.pendingPayout || 0) + amount,
      currentMonthEarnings: data.currentMonth === currentMonth 
        ? (data.currentMonthEarnings || 0) + amount 
        : amount,
      currentMonthSessions: data.currentMonth === currentMonth
        ? (data.currentMonthSessions || 0) + 1
        : 1,
      currentMonth,
      updatedAt: serverTimestamp()
    })
  } else {
    await addDoc(collection(db, 'coachEarnings'), {
      coachId,
      totalEarnings: amount,
      totalPaid: 0,
      pendingPayout: amount,
      currentMonthEarnings: amount,
      currentMonthSessions: 1,
      currentMonth,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }
}
