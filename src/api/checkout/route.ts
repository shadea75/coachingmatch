// src/app/api/checkout/route.ts
// MODELLO B: Stripe Connect - Split automatico 70% coach / 30% CoachaMi

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

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
    const offerRef = doc(db, 'offers', offerId)
    const offerDoc = await getDoc(offerRef)
    
    if (!offerDoc.exists()) {
      return NextResponse.json({ error: 'Offerta non trovata' }, { status: 404 })
    }
    
    const offer = offerDoc.data()
    const installment = offer.installments?.[installmentNumber - 1]
    
    if (!installment) {
      return NextResponse.json({ error: 'Rata non trovata' }, { status: 404 })
    }
    
    if (installment.status === 'paid') {
      return NextResponse.json({ error: 'Rata già pagata' }, { status: 400 })
    }
    
    // ========== NUOVO: Recupera account Stripe Connect del coach ==========
    const coachStripeDoc = await getDoc(doc(db, 'coachStripeAccounts', offer.coachId))
    
    if (!coachStripeDoc.exists()) {
      return NextResponse.json({ 
        error: 'Il coach non ha ancora configurato i pagamenti. Contatta il coach.',
        code: 'COACH_STRIPE_NOT_CONFIGURED'
      }, { status: 400 })
    }
    
    const coachStripeData = coachStripeDoc.data()
    
    if (!coachStripeData.chargesEnabled) {
      return NextResponse.json({ 
        error: 'L\'account pagamenti del coach è in attesa di verifica. Riprova più tardi.',
        code: 'COACH_STRIPE_PENDING'
      }, { status: 400 })
    }
    
    const coachStripeAccountId = coachStripeData.stripeAccountId
    // =====================================================================
    
    // Calcola la fee della piattaforma (30% in centesimi)
    const amountInCents = Math.round(installment.amount * 100)
    const platformFeeInCents = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100))
    
    // Crea sessione checkout con split automatico
    const session = await stripe.checkout.sessions.create({
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
      
      // ========== STRIPE CONNECT: Split automatico ==========
      payment_intent_data: {
        // La fee di CoachaMi viene trattenuta automaticamente
        application_fee_amount: platformFeeInCents,
        // Il resto (70%) va direttamente al coach
        transfer_data: {
          destination: coachStripeAccountId,
        },
        // Metadata sul payment intent
        metadata: {
          offerId,
          installmentNumber: String(installmentNumber),
          coachId: offer.coachId,
          coacheeId: offer.coacheeId,
        }
      },
      // ======================================================
      
      // Metadata sulla sessione (per webhook)
      metadata: {
        type: 'coaching_session',
        offerId,
        installmentNumber: String(installmentNumber),
        coachId: offer.coachId,
        coacheeId: offer.coacheeId,
        coachName: offer.coachName,
        coachEmail: offer.coachEmail,
        coachStripeAccountId, // Utile per debug
      },
      
      // Email coachee
      customer_email: offer.coacheeEmail,
      
      // Redirect URLs
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}&offerId=${offerId}&installment=${installmentNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/cancel?offerId=${offerId}`,
      
      // Scadenza sessione checkout (30 minuti)
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    })
    
    return NextResponse.json({ 
      url: session.url, 
      sessionId: session.id 
    })
    
  } catch (error: any) {
    console.error('Checkout error:', error)
    
    // Gestione errori specifici Stripe Connect
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
