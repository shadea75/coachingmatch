// src/app/api/stripe/connect/onboard/route.ts
// Endpoint per avviare l'onboarding Stripe Connect di un coach

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const { coachId, coachEmail, coachName } = await request.json()
    
    if (!coachId || !coachEmail) {
      return NextResponse.json(
        { error: 'coachId e coachEmail sono richiesti' },
        { status: 400 }
      )
    }
    
    // Controlla se il coach ha già un account Stripe collegato
    const existingAccountDoc = await getDoc(doc(db, 'coachStripeAccounts', coachId))
    
    let stripeAccountId: string
    
    if (existingAccountDoc.exists()) {
      const existingData = existingAccountDoc.data()
      
      // Se l'onboarding è già completato, non serve rifare
      if (existingData.onboardingComplete && existingData.chargesEnabled) {
        return NextResponse.json({
          success: true,
          message: 'Account Stripe già configurato',
          alreadyConnected: true
        })
      }
      
      // Altrimenti usa l'account esistente per continuare l'onboarding
      stripeAccountId = existingData.stripeAccountId
    } else {
      // Crea un nuovo account Stripe Connect (Express)
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'IT',
        email: coachEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          coachId,
          coachName: coachName || '',
          platform: 'coachami'
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'monday'
            }
          }
        }
      })
      
      stripeAccountId = account.id
      
      // Salva in Firebase
      await setDoc(doc(db, 'coachStripeAccounts', coachId), {
        stripeAccountId: account.id,
        coachId,
        coachEmail,
        coachName: coachName || '',
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    
    // Genera il link per l'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?stripe=success`,
      type: 'account_onboarding',
    })
    
    return NextResponse.json({
      success: true,
      url: accountLink.url,
      stripeAccountId
    })
    
  } catch (error: any) {
    console.error('Stripe Connect onboarding error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante la configurazione Stripe' },
      { status: 500 }
    )
  }
}
