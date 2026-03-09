// src/app/api/payments/create-installment-checkout/route.ts
// Se il coach ha Stripe Connect → split automatico 70/30
// Se il coach usa bonifico → 100% a CoachaMi, poi bonifica manualmente

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      offerId, 
      installmentNumber, 
      userId,
      amount,
      coachName,
      coacheeEmail,
      sessionDuration,
      totalSessions,
      title,
      commissionRate,
    } = body

    if (!offerId || !installmentNumber || !userId || !amount) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }

    // Recupera payoutMethod e account Stripe del coach
    let coachId = ''
    let payoutMethod = 'bank_transfer'
    let coachStripeAccountId: string | null = null

    try {
      const offerDoc = await adminDb.collection('offers').doc(offerId).get()
      if (offerDoc.exists) {
        coachId = offerDoc.data()?.coachId || ''

        const [coachAppDoc, stripeDoc] = await Promise.all([
          adminDb.collection('coachApplications').doc(coachId).get(),
          adminDb.collection('coachStripeAccounts').doc(coachId).get(),
        ])

        if (coachAppDoc.exists) {
          payoutMethod = coachAppDoc.data()?.payoutMethod || 'bank_transfer'
        }
        if (stripeDoc.exists && stripeDoc.data()?.chargesEnabled) {
          coachStripeAccountId = stripeDoc.data()?.stripeAccountId || null
        }
      }
    } catch (e) {
      console.log('Impossibile caricare dati coach, uso bank_transfer')
    }

    const amountCents = Math.round(amount * 100)
    const effectiveCommissionRate = commissionRate !== undefined ? commissionRate : 0.30
    const platformFeeCents = Math.round(amount * effectiveCommissionRate * 100)
    const coachPayoutAmount = Math.round(amount * (1 - effectiveCommissionRate) * 100) / 100

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${title || 'Percorso di Coaching'} - Sessione ${installmentNumber}/${totalSessions || '?'}`,
            description: `Sessione di coaching con ${coachName || 'Coach'} (${sessionDuration || 60} minuti)`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      metadata: {
        type: 'offer_installment',
        offerId,
        installmentNumber: installmentNumber.toString(),
        userId,
        coachId,
        payoutMethod,
        coachPayoutAmount: coachPayoutAmount.toString(),
        commissionRate: effectiveCommissionRate.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?offerId=${offerId}&session=${installmentNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/offer/${offerId}?cancelled=true`,
    }

    if (coacheeEmail) {
      sessionConfig.customer_email = coacheeEmail
    }

    if (payoutMethod === 'stripe' && coachStripeAccountId) {
      // Coach con Stripe → split automatico, transfer diretto al coach
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: coachStripeAccountId },
      }
      console.log(`💳 Stripe split: €${amount} → coach €${coachPayoutAmount} (auto), CoachaMi €${amount * effectiveCommissionRate}`)
    } else {
      // Coach senza Stripe → tutto a CoachaMi, bonifico manuale
      sessionConfig.payment_intent_data = {
        metadata: {
          offerId,
          coachId,
          payoutMethod: 'bank_transfer',
          coachPayoutAmount: coachPayoutAmount.toString(),
        }
      }
      console.log(`🏦 Bonifico manuale: €${amount} → CoachaMi (coach €${coachPayoutAmount} da bonificare)`)
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ sessionId: session.id, url: session.url })

  } catch (error: any) {
    console.error('Errore creazione checkout:', error)
    return NextResponse.json({ error: error.message || 'Errore interno' }, { status: 500 })
  }
}
