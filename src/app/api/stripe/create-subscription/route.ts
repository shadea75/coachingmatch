import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachami.it'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coachId, coachEmail, priceAmount } = body

    if (!coachId || !coachEmail || !priceAmount) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    // Cerca o crea il cliente Stripe
    let customerId: string | undefined

    const existingCustomers = await stripe.customers.list({
      email: coachEmail,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      const newCustomer = await stripe.customers.create({
        email: coachEmail,
        metadata: {
          coachId,
          type: 'coach_subscription',
        },
      })
      customerId = newCustomer.id
    }

    // Cerca o crea il prezzo per l'abbonamento
    // Usiamo un prezzo dinamico basato sull'importo personalizzato del coach
    const priceInCents = priceAmount * 100

    // Cerca un prezzo esistente con questo importo
    const existingPrices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      limit: 100,
    })

    let priceId: string | undefined

    // Cerca un prezzo con lo stesso importo
    const matchingPrice = existingPrices.data.find(
      (p) => p.unit_amount === priceInCents && 
             p.recurring?.interval === 'month' &&
             p.metadata?.type === 'coach_subscription'
    )

    if (matchingPrice) {
      priceId = matchingPrice.id
    } else {
      // Crea un nuovo prezzo
      // Prima dobbiamo avere un prodotto
      let productId: string

      const existingProducts = await stripe.products.list({
        active: true,
        limit: 100,
      })

      const coachSubProduct = existingProducts.data.find(
        (p) => p.metadata?.type === 'coach_subscription'
      )

      if (coachSubProduct) {
        productId = coachSubProduct.id
      } else {
        const newProduct = await stripe.products.create({
          name: 'Abbonamento Coach CoachaMi',
          description: 'Accesso completo alla piattaforma CoachaMi per coach',
          metadata: {
            type: 'coach_subscription',
          },
        })
        productId = newProduct.id
      }

      // Crea il prezzo
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: priceInCents,
        currency: 'eur',
        recurring: {
          interval: 'month',
        },
        metadata: {
          type: 'coach_subscription',
          amount: priceAmount.toString(),
        },
      })
      priceId = newPrice.id
    }

    // Crea la sessione Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        coachId,
        type: 'coach_subscription',
      },
      subscription_data: {
        metadata: {
          coachId,
          type: 'coach_subscription',
        },
      },
      success_url: `${BASE_URL}/coach/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/coach/subscription?cancelled=true`,
      locale: 'it',
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Errore creazione subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno' },
      { status: 500 }
    )
  }
}
