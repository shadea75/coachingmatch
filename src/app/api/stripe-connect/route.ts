import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

// Crea account Stripe Connect per il coach
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coachId, email, coachName } = body
    
    if (!coachId || !email) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }
    
    // Verifica se esiste già un account
    const existingAccount = await getDoc(doc(db, 'coachStripeAccounts', coachId))
    
    if (existingAccount.exists()) {
      const data = existingAccount.data()
      
      // Se l'onboarding è completo, ritorna
      if (data.onboardingComplete) {
        return NextResponse.json({ 
          message: 'Account già configurato',
          accountId: data.stripeAccountId
        })
      }
      
      // Altrimenti genera nuovo link di onboarding
      const accountLink = await stripe.accountLinks.create({
        account: data.stripeAccountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/stripe-onboarding?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/stripe-onboarding/complete`,
        type: 'account_onboarding'
      })
      
      return NextResponse.json({ url: accountLink.url })
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
        name: coachName,
        product_description: 'Servizi di coaching personalizzato',
        mcc: '8299' // Educational services
      },
      metadata: {
        coachId: coachId
      }
    })
    
    // Salva account in Firebase
    await setDoc(doc(db, 'coachStripeAccounts', coachId), {
      coachId,
      stripeAccountId: account.id,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      country: 'IT',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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

// Verifica stato account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coachId = searchParams.get('coachId')
    
    if (!coachId) {
      return NextResponse.json(
        { error: 'coachId mancante' },
        { status: 400 }
      )
    }
    
    const accountDoc = await getDoc(doc(db, 'coachStripeAccounts', coachId))
    
    if (!accountDoc.exists()) {
      return NextResponse.json({ 
        hasAccount: false,
        onboardingComplete: false 
      })
    }
    
    const data = accountDoc.data()
    
    // Verifica stato su Stripe
    const account = await stripe.accounts.retrieve(data.stripeAccountId)
    
    // Aggiorna stato in Firebase se cambiato
    if (account.charges_enabled !== data.chargesEnabled || 
        account.payouts_enabled !== data.payoutsEnabled) {
      await setDoc(doc(db, 'coachStripeAccounts', coachId), {
        ...data,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: account.charges_enabled && account.payouts_enabled,
        updatedAt: serverTimestamp()
      }, { merge: true })
    }
    
    return NextResponse.json({
      hasAccount: true,
      stripeAccountId: data.stripeAccountId,
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
