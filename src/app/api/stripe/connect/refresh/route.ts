// src/app/api/stripe/connect/refresh/route.ts
// Endpoint per rigenerare il link di onboarding se scaduto

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const { coachId } = await request.json()
    
    if (!coachId) {
      return NextResponse.json(
        { error: 'coachId è richiesto' },
        { status: 400 }
      )
    }
    
    // Recupera account esistente
    const accountDoc = await adminDb.collection('coachStripeAccounts').doc(coachId).get()
    
    if (!accountDoc.exists) {
      return NextResponse.json(
        { error: 'Nessun account Stripe trovato. Avvia prima l\'onboarding.' },
        { status: 404 }
      )
    }
    
    const { stripeAccountId } = accountDoc.data() as any
    
    // Genera nuovo link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?stripe=success`,
      type: 'account_onboarding',
    })
    
    return NextResponse.json({
      success: true,
      url: accountLink.url
    })
    
  } catch (error: any) {
    console.error('Stripe Connect refresh error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante la rigenerazione del link' },
      { status: 500 }
    )
  }
}
