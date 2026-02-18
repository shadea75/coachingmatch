import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachami.it'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coachId, coachEmail, priceAmount, planId, planName, billingCycle } = body

    if (!coachId || !coachEmail || !priceAmount) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    const tier = planId || 'professional'
    const cycle = billingCycle || 'monthly'
    const interval = cycle === 'annual' ? 'year' : 'month'
    
    // Per l'annuale, il prezzo passato è mensile — calcoliamo il totale annuale
    const unitAmount = cycle === 'annual' 
      ? priceAmount * 12 * 100  // prezzo mensile × 12 in centesimi
      : priceAmount * 100       // prezzo mensile in centesimi

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

    // Cerca un prezzo esistente con lo stesso importo, intervallo e tier
    const existingPrices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      limit: 100,
    })

    let priceId: string | undefined

    const matchingPrice = existingPrices.data.find(
      (p) => p.unit_amount === unitAmount && 
             p.recurring?.interval === interval &&
             p.metadata?.type === 'coach_subscription' &&
             p.metadata?.tier === tier
    )

    if (matchingPrice) {
      priceId = matchingPrice.id
    } else {
      // Cerca o crea il prodotto
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
          description: 'Accesso alla piattaforma CoachaMi per coach professionisti',
          metadata: {
            type: 'coach_subscription',
          },
        })
        productId = newProduct.id
      }

      // Crea il prezzo con metadata del tier
      const tierLabels: Record<string, string> = {
        starter: 'Starter',
        professional: 'Professional',
        business: 'Business',
        elite: 'Elite',
      }
      
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency: 'eur',
        recurring: {
          interval: interval as 'month' | 'year',
        },
        metadata: {
          type: 'coach_subscription',
          tier,
          tierLabel: tierLabels[tier] || tier,
          billingCycle: cycle,
          monthlyAmount: priceAmount.toString(),
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
        tier,
        billingCycle: cycle,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          coachId,
          type: 'coach_subscription',
          tier,
          billingCycle: cycle,
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
