import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

// Crea account Stripe Connect per il coach
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coachId, email, coachName, existingAccountId } = body
    
    if (!coachId || !email) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }
    
    let accountId = existingAccountId
    
    // Se esiste già un account, genera solo il link
    if (accountId) {
      try {
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/stripe-onboarding?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/stripe-onboarding/complete`,
          type: 'account_onboarding'
        })
        
        return NextResponse.json({ url: accountLink.url, accountId })
      } catch (e) {
        // Se l'account non esiste più, creane uno nuovo
        console.log('Account non trovato, creo nuovo account')
      }
    }
    
    // Crea nuovo account Stripe Connect (Express)
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'IT',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      business_profile: {
        name: coachName || 'Coach',
        product_description: 'Servizi di coaching personalizzato',
        mcc: '8299' // Educational services
      },
      metadata: {
        coachId: coachId
      }
    })
    
    // Genera link di onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/stripe-onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/stripe-onboarding/complete`,
      type: 'account_onboarding'
    })
    
    return NextResponse.json({ 
      url: accountLink.url,
      accountId: account.id
    })
    
  } catch (error: any) {
    console.error('Errore creazione Stripe Connect:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno' },
      { status: 500 }
    )
  }
}

// Verifica stato account (senza Firebase)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    
    if (!accountId) {
      return NextResponse.json({ 
        hasAccount: false,
        onboardingComplete: false 
      })
    }
    
    // Verifica stato su Stripe
    const account = await stripe.accounts.retrieve(accountId)
    
    return NextResponse.json({
      hasAccount: true,
      stripeAccountId: accountId,
      onboardingComplete: account.charges_enabled && account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements
    })
    
  } catch (error: any) {
    console.error('Errore verifica account:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
