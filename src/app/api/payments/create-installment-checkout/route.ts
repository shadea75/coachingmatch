// src/app/api/payments/create-installment-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// Per ora usiamo una versione semplificata che non richiede firebase-admin
// I dati dell'offerta vengono passati dal client

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      offerId, 
      installmentNumber, 
      userId,
      // Dati passati dal client per evitare firebase-admin
      amount,
      coachName,
      coacheeEmail,
      sessionDuration,
      totalSessions,
      title,
      coachStripeAccountId
    } = body

    if (!offerId || !installmentNumber || !userId || !amount) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }

    // Calcola la commissione piattaforma (30% del netto)
    const amountCents = Math.round(amount * 100)
    const netAmount = amount / 1.22 // Scorporo IVA 22%
    const platformFeeCents = Math.round(netAmount * 0.30 * 100) // 30% commissione

    // Se il coach ha un account Stripe, usa split payment
    // Altrimenti, il pagamento va tutto alla piattaforma (da gestire manualmente)
    
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${title || 'Percorso di Coaching'} - Sessione ${installmentNumber}/${totalSessions || '?'}`,
              description: `Sessione di coaching con ${coachName || 'Coach'} (${sessionDuration || 60} minuti)`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'offer_installment',
        offerId: offerId,
        installmentNumber: installmentNumber.toString(),
        userId: userId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?offerId=${offerId}&session=${installmentNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/offer/${offerId}?cancelled=true`,
    }

    // Aggiungi email se disponibile
    if (coacheeEmail) {
      sessionConfig.customer_email = coacheeEmail
    }

    // Se il coach ha Stripe Connect, usa split payment
    if (coachStripeAccountId) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: coachStripeAccountId,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

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
