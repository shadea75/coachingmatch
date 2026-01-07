// src/app/api/payments/create-product-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      productId,
      productTitle,
      price,
      coachId,
      coachName,
      coachEmail,
      coachStripeAccountId,
      commissionRate,
      userId,
      userEmail,
      userName
    } = body

    // Log per debug
    console.log('Product checkout:', { 
      productId, 
      price, 
      commissionRate,
      coachStripeAccountId,
      userEmail,
      userName
    })

    if (!productId || !price) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }

    const amountCents = Math.round(price * 100)
    
    // Usa commissione dal prodotto (default 3.5% per prodotti digitali)
    const effectiveCommissionRate = commissionRate ?? 0.035
    const platformFeeCents = Math.round(price * effectiveCommissionRate * 100)

    console.log('Commissione prodotto:', {
      effectiveCommissionRate,
      price,
      platformFee: price * effectiveCommissionRate
    })

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productTitle || 'Prodotto Digitale',
              description: `Creato da ${coachName || 'Coach'}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'digital_product',
        productId: productId,
        coachId: coachId,
        userId: userId || 'guest',
        userEmail: userEmail || '',
        userName: userName || '',
        commissionRate: effectiveCommissionRate.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/success?productId=${productId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/${productId}?cancelled=true`,
    }

    // Aggiungi email se disponibile
    if (userEmail) {
      sessionConfig.customer_email = userEmail
    }

    // Split payment se coach ha Stripe Connect
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
    console.error('Errore creazione checkout prodotto:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno' },
      { status: 500 }
    )
  }
}
