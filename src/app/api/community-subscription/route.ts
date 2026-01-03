import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userEmail, userName } = body
    
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Dati utente mancanti' }, { status: 400 })
    }
    
    // Crea o recupera il customer Stripe
    let customer: Stripe.Customer
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    })
    
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        metadata: {
          userId: userId,
          type: 'coachee'
        }
      })
    }
    
    // Crea la sessione di checkout per abbonamento
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Abbonamento Community CoachaMi',
              description: 'Accesso completo alla Community: canali, eventi, contenuti esclusivi',
              images: ['https://www.coachami.it/logo.png'],
            },
            unit_amount: 2900, // €29.00 in centesimi
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachami.it'}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachami.it'}/dashboard?subscription=cancelled`,
      metadata: {
        userId: userId,
        type: 'community_subscription'
      },
      subscription_data: {
        metadata: {
          userId: userId,
          type: 'community_subscription'
        }
      }
    })
    
    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
    
  } catch (error: any) {
    console.error('Errore creazione subscription:', error)
    return NextResponse.json({ 
      error: 'Errore creazione abbonamento',
      details: error.message 
    }, { status: 500 })
  }
}
