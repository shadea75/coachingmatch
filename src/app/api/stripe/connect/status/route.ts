export const dynamic = 'force-dynamic'
// src/app/api/stripe/connect/status/route.ts
// Endpoint per verificare lo stato dell'account Stripe Connect di un coach

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coachId = searchParams.get('coachId')
    
    if (!coachId) {
      return NextResponse.json(
        { error: 'coachId è richiesto' },
        { status: 400 }
      )
    }
    
    // Recupera dati da Firebase
    const accountDoc = await getDoc(doc(db, 'coachStripeAccounts', coachId))
    
    if (!accountDoc.exists()) {
      return NextResponse.json({
        connected: false,
        message: 'Nessun account Stripe collegato'
      })
    }
    
    const accountData = accountDoc.data()
    const stripeAccountId = accountData.stripeAccountId
    
    // Recupera stato aggiornato da Stripe
    const stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
    
    // Aggiorna Firebase se lo stato è cambiato
    const chargesEnabled = stripeAccount.charges_enabled
    const payoutsEnabled = stripeAccount.payouts_enabled
    const detailsSubmitted = stripeAccount.details_submitted
    
    if (
      accountData.chargesEnabled !== chargesEnabled ||
      accountData.payoutsEnabled !== payoutsEnabled ||
      accountData.onboardingComplete !== detailsSubmitted
    ) {
      await updateDoc(doc(db, 'coachStripeAccounts', coachId), {
        chargesEnabled,
        payoutsEnabled,
        onboardingComplete: detailsSubmitted,
        updatedAt: serverTimestamp(),
      })
    }
    
    // Determina se servono altre azioni
    let actionRequired = null
    if (!detailsSubmitted) {
      actionRequired = 'complete_onboarding'
    } else if (!chargesEnabled) {
      actionRequired = 'verification_pending'
    }
    
    return NextResponse.json({
      connected: true,
      stripeAccountId,
      chargesEnabled,
      payoutsEnabled,
      onboardingComplete: detailsSubmitted,
      actionRequired,
      // Info aggiuntive (se disponibili)
      email: stripeAccount.email,
      country: stripeAccount.country,
    })
    
  } catch (error: any) {
    console.error('Stripe Connect status error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dello stato' },
      { status: 500 }
    )
  }
}
