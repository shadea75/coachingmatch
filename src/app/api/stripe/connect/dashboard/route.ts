// src/app/api/stripe/connect/dashboard/route.ts
// Endpoint per generare il link alla dashboard Stripe Express del coach

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
        { error: 'Nessun account Stripe collegato' },
        { status: 404 }
      )
    }
    
    const { stripeAccountId, onboardingComplete } = accountDoc.data() as any
    
    if (!onboardingComplete) {
      return NextResponse.json(
        { error: 'Completa prima la configurazione dell\'account Stripe' },
        { status: 400 }
      )
    }
    
    // Genera link alla dashboard Express
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)
    
    return NextResponse.json({
      success: true,
      url: loginLink.url
    })
    
  } catch (error: any) {
    console.error('Stripe dashboard link error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante la generazione del link' },
      { status: 500 }
    )
  }
}
