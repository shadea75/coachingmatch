// src/app/api/payments/create-installment-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      offerId, 
      installmentNumber, 
      userId,
      amount,
      coachName,
      coacheeEmail,
      sessionDuration,
      totalSessions,
      title,
      coachStripeAccountId,
      commissionRate // Commissione dinamica (es. 0.30 per 30%, 0.035 per 3.5%)
    } = body

    if (!offerId || !installmentNumber || !userId || !amount) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }

    const amountCents = Math.round(amount * 100)
    
    // Usa commissione dinamica se fornita, altrimenti default 30%
    const effectiveCommissionRate = commissionRate ?? 0.30
    // Commissione calcolata sul LORDO
    const platformFeeCents = Math.round(amount * effectiveCommissionRate * 100)

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
        commissionRate: effectiveCommissionRate.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?offerId=${offerId}&session=${installmentNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/offer/${offerId}?cancelled=true`,
    }

    if (coacheeEmail) {
      sessionConfig.customer_email = coacheeEmail
    }

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
