// src/app/api/checkout/route.ts
// Stripe Connect opzionale: split automatico se coach ha Stripe, altrimenti incasso diretto CoachaMi

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

// Configurazione split
const PLATFORM_FEE_PERCENT = 30 // 30% a CoachaMi

export async function POST(request: NextRequest) {
  try {
    const { offerId, installmentNumber } = await request.json()
    
    if (!offerId || !installmentNumber) {
      return NextResponse.json(
        { error: 'Dati mancanti: offerId e installmentNumber richiesti' },
        { status: 400 }
      )
    }
    
    // Recupera offerta
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
    
    // Verifica se il coach ha Stripe Connect configurato
    let coachHasStripe = false
    let coachStripeAccountId = ''
    
    try {
      const coachStripeDoc = await adminDb.collection('coachStripeAccounts').doc(offer.coachId).get()
      
      if (coachStripeDoc.exists) {
        const coachStripeData = coachStripeDoc.data() as any
        if (coachStripeData.chargesEnabled && coachStripeData.stripeAccountId) {
          coachHasStripe = true
          coachStripeAccountId = coachStripeData.stripeAccountId
        }
      }
    } catch (e) {
      console.log('Coach senza Stripe Connect, pagamento diretto a piattaforma')
    }
    
    const coachPayoutAmount = Math.round(installment.amount * (100 - PLATFORM_FEE_PERCENT)) / 100
    
    // Prepara sessione checkout
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
        paymentMode: coachHasStripe ? 'stripe_connect' : 'platform_direct',
      },
      customer_email: offer.coacheeEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}&offerId=${offerId}&installment=${installmentNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/cancel?offerId=${offerId}`,
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    }
    
    if (coachHasStripe) {
      // STRIPE CONNECT: Split automatico 70% coach / 30% piattaforma
      const platformFeeInCents = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100))
      
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeInCents,
        transfer_data: {
          destination: coachStripeAccountId,
        },
        metadata: {
          offerId,
          installmentNumber: String(installmentNumber),
          coachId: offer.coachId,
          coacheeId: offer.coacheeId,
          paymentMode: 'stripe_connect',
        }
      }
      sessionConfig.metadata.coachStripeAccountId = coachStripeAccountId
      
      console.log(`💳 Checkout con Stripe Connect: ${installment.amount}€ (30% fee a piattaforma)`)
    } else {
      // PAGAMENTO DIRETTO: Tutto a CoachaMi, il coach verrà pagato manualmente
      sessionConfig.payment_intent_data = {
        metadata: {
          offerId,
          installmentNumber: String(installmentNumber),
          coachId: offer.coachId,
          coacheeId: offer.coacheeId,
          paymentMode: 'platform_direct',
          coachPayoutPending: 'true',
          coachPayoutAmount: String(coachPayoutAmount),
        }
      }
      
      console.log(`💳 Checkout diretto piattaforma: ${installment.amount}€ (coach payout manuale: ${coachPayoutAmount}€)`)
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig)
    
    // Salva info pagamento nell'offerta per tracciamento admin
    const installments = [...(offer.installments || [])]
    installments[installmentNumber - 1] = {
      ...installments[installmentNumber - 1],
      paymentMode: coachHasStripe ? 'stripe_connect' : 'platform_direct',
      coachPayoutAmount,
      coachPayoutStatus: coachHasStripe ? 'automatic' : 'pending_manual',
    }
    
    await adminDb.collection('offers').doc(offerId).update({
      installments,
      updatedAt: new Date()
    })
    
    return NextResponse.json({ 
      url: session.url, 
      sessionId: session.id 
    })
    
  } catch (error: any) {
    console.error('Checkout error:', error)
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('destination')) {
        return NextResponse.json({
          error: 'Problema con l\'account del coach. Contatta l\'assistenza.',
          code: 'STRIPE_CONNECT_ERROR'
        }, { status: 500 })
      }
    }
    
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del checkout' },
      { status: 500 }
    )
  }
}
