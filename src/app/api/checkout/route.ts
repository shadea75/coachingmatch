// src/app/api/checkout/route.ts
// Se il coach ha Stripe Connect → split automatico 70/30
// Se il coach usa bonifico → 100% a CoachaMi, poi bonifica manualmente

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

const COACH_PERCENT = 70
const PLATFORM_PERCENT = 30

export async function POST(request: NextRequest) {
  try {
    const { offerId, installmentNumber } = await request.json()
    
    if (!offerId || !installmentNumber) {
      return NextResponse.json(
        { error: 'Dati mancanti: offerId e installmentNumber richiesti' },
        { status: 400 }
      )
    }
    
    const offerDoc = await adminDb.collection('offers').doc(offerId).get()
    if (!offerDoc.exists) {
      return NextResponse.json({ error: 'Offerta non trovata' }, { status: 404 })
    }
    
    const offer = offerDoc.data() as any
    const installment = offer.installments?.[installmentNumber - 1]
    
    if (!installment) {
      return NextResponse.json({ error: 'Rata non trovata' }, { status: 404 })
    }
    if (installment.status === 'paid') {
      return NextResponse.json({ error: 'Rata già pagata' }, { status: 400 })
    }
    
    const amountInCents = Math.round(installment.amount * 100)
    const platformFeeCents = Math.round(installment.amount * (PLATFORM_PERCENT / 100) * 100)
    const coachPayoutAmount = Math.round(installment.amount * (COACH_PERCENT / 100) * 100) / 100

    // Recupera payoutMethod e Stripe del coach
    let payoutMethod = 'bank_transfer'
    let coachStripeAccountId: string | null = null

    try {
      const [coachAppDoc, stripeDoc] = await Promise.all([
        adminDb.collection('coachApplications').doc(offer.coachId).get(),
        adminDb.collection('coachStripeAccounts').doc(offer.coachId).get(),
      ])
      if (coachAppDoc.exists) {
        payoutMethod = coachAppDoc.data()?.payoutMethod || 'bank_transfer'
      }
      if (stripeDoc.exists && stripeDoc.data()?.chargesEnabled) {
        coachStripeAccountId = stripeDoc.data()?.stripeAccountId || null
      }
    } catch (e) {
      console.log('Impossibile caricare dati coach')
    }
    
    const sessionConfig: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amountInCents,
          product_data: {
            name: `${offer.title} - Sessione ${installmentNumber}/${offer.totalSessions}`,
            description: `Sessione di coaching con ${offer.coachName} (${offer.sessionDuration} min)`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        type: 'coaching_session',
        offerId,
        installmentNumber: String(installmentNumber),
        coachId: offer.coachId,
        coacheeId: offer.coacheeId,
        coachName: offer.coachName,
        coachEmail: offer.coachEmail,
        payoutMethod,
        coachPayoutAmount: String(coachPayoutAmount),
      },
      customer_email: offer.coacheeEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}&offerId=${offerId}&installment=${installmentNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/cancel?offerId=${offerId}`,
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    }
    
    if (payoutMethod === 'stripe' && coachStripeAccountId) {
      // Split automatico — transfer diretto al coach
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: coachStripeAccountId },
        metadata: {
          offerId,
          installmentNumber: String(installmentNumber),
          coachId: offer.coachId,
          coacheeId: offer.coacheeId,
          payoutMethod: 'stripe',
        }
      }
      console.log(`💳 Stripe split: €${installment.amount} → coach €${coachPayoutAmount} (auto)`)
    } else {
      // Tutto a CoachaMi — bonifico manuale
      sessionConfig.payment_intent_data = {
        metadata: {
          offerId,
          installmentNumber: String(installmentNumber),
          coachId: offer.coachId,
          coacheeId: offer.coacheeId,
          payoutMethod: 'bank_transfer',
          coachPayoutAmount: String(coachPayoutAmount),
        }
      }
      console.log(`🏦 Bonifico manuale: €${installment.amount} → CoachaMi (da bonificare €${coachPayoutAmount})`)
    }
    
    // Pre-aggiorna installment con info payout
    const installments = [...(offer.installments || [])]
    installments[installmentNumber - 1] = {
      ...installments[installmentNumber - 1],
      payoutMethod,
      coachPayoutAmount,
      coachPayoutStatus: payoutMethod === 'stripe' ? 'automatic' : 'pending',
    }
    await adminDb.collection('offers').doc(offerId).update({
      installments,
      updatedAt: new Date()
    })
    
    const session = await stripe.checkout.sessions.create(sessionConfig)
    return NextResponse.json({ url: session.url, sessionId: session.id })
    
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del checkout' },
      { status: 500 }
    )
  }
}
