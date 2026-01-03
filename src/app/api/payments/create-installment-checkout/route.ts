// app/api/payments/create-installment-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// Configurazione piattaforma
const PLATFORM_FEE_PERCENT = 30

export async function POST(request: NextRequest) {
  try {
    const { offerId, installmentNumber, userId } = await request.json()

    if (!offerId || !installmentNumber || !userId) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }

    // Carica offerta da Firebase
    const offerDoc = await db.collection('offers').doc(offerId).get()
    
    if (!offerDoc.exists) {
      return NextResponse.json(
        { error: 'Offerta non trovata' },
        { status: 404 }
      )
    }

    const offer = offerDoc.data()!

    // Verifica che l'utente sia il coachee
    if (offer.coacheeId !== userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Verifica che l'offerta sia accettata o attiva
    if (!['accepted', 'active'].includes(offer.status)) {
      return NextResponse.json(
        { error: 'Offerta non valida per il pagamento' },
        { status: 400 }
      )
    }

    // Verifica che la rata non sia già pagata
    const installment = offer.installments?.[installmentNumber - 1]
    if (!installment) {
      return NextResponse.json(
        { error: 'Rata non trovata' },
        { status: 404 }
      )
    }

    if (installment.status === 'paid') {
      return NextResponse.json(
        { error: 'Rata già pagata' },
        { status: 400 }
      )
    }

    // Verifica che le rate precedenti siano pagate
    for (let i = 0; i < installmentNumber - 1; i++) {
      if (offer.installments[i].status !== 'paid') {
        return NextResponse.json(
          { error: 'Devi prima pagare le rate precedenti' },
          { status: 400 }
        )
      }
    }

    // Carica l'account Stripe del coach
    const coachStripeDoc = await db.collection('coachStripeAccounts').doc(offer.coachId).get()
    
    if (!coachStripeDoc.exists) {
      return NextResponse.json(
        { error: 'Il coach non ha configurato i pagamenti' },
        { status: 400 }
      )
    }

    const coachStripeAccountId = coachStripeDoc.data()!.stripeAccountId

    // Calcola importi
    const amountTotal = Math.round(installment.amount * 100) // In centesimi
    const platformFee = Math.round(installment.platformFee * 100) // Commissione piattaforma in centesimi

    // Crea sessione Stripe Checkout con split payment
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${offer.title} - Sessione ${installmentNumber}/${offer.totalSessions}`,
              description: `Sessione di coaching con ${offer.coachName} (${offer.sessionDuration} minuti)`,
            },
            unit_amount: amountTotal,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        // Split payment: il coach riceve l'importo meno la commissione piattaforma
        application_fee_amount: platformFee,
        transfer_data: {
          destination: coachStripeAccountId,
        },
      },
      customer_email: offer.coacheeEmail,
      metadata: {
        type: 'offer_installment',
        offerId: offerId,
        installmentNumber: installmentNumber.toString(),
        coachId: offer.coachId,
        coacheeId: offer.coacheeId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?offerId=${offerId}&session=${installmentNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/offer/${offerId}?cancelled=true`,
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })

  } catch (error: any) {
    console.error('Errore creazione checkout:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno' },
      { status: 500 }
    )
  }
}
