// src/app/api/checkout/external/route.ts
// Checkout per clienti esterni - 100% al coach (no commissione CoachaMi)

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const { offerId, paymentType, installmentNumber } = await request.json()
    
    if (!offerId || !paymentType) {
      return NextResponse.json(
        { error: 'Dati mancanti: offerId e paymentType richiesti' },
        { status: 400 }
      )
    }
    
    // Recupera offerta esterna
    const offerDoc = await adminDb.collection('externalOffers').doc(offerId).get()
    
    if (!offerDoc.exists) {
      return NextResponse.json({ error: 'Offerta non trovata' }, { status: 404 })
    }
    
    const offer = offerDoc.data() as any
    
    // Verifica che il metodo di pagamento sia permesso
    if (paymentType === 'single' && !offer.allowSinglePayment) {
      return NextResponse.json({ error: 'Pagamento unico non disponibile per questa offerta' }, { status: 400 })
    }
    if (paymentType === 'installment' && !offer.allowInstallments) {
      return NextResponse.json({ error: 'Pagamento rateale non disponibile per questa offerta' }, { status: 400 })
    }
    
    // Recupera account Stripe Connect del coach
    const coachStripeDoc = await adminDb.collection('coachStripeAccounts').doc(offer.coachId).get()
    
    if (!coachStripeDoc.exists) {
      return NextResponse.json({ 
        error: 'Il coach non ha ancora configurato i pagamenti.',
        code: 'COACH_STRIPE_NOT_CONFIGURED'
      }, { status: 400 })
    }
    
    const coachStripeData = coachStripeDoc.data() as any
    
    if (!coachStripeData.chargesEnabled) {
      return NextResponse.json({ 
        error: 'L\'account pagamenti del coach è in attesa di verifica.',
        code: 'COACH_STRIPE_PENDING'
      }, { status: 400 })
    }
    
    const coachStripeAccountId = coachStripeData.stripeAccountId
    
    let amountInCents: number
    let productName: string
    let successUrl: string
    
    if (paymentType === 'single') {
      // Pagamento unico - prezzo base senza sovrapprezzo
      amountInCents = Math.round(offer.priceTotal * 100)
      productName = `${offer.title} - Pagamento completo (${offer.totalSessions} sessioni)`
      successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/external-offer/${offerId}/success?session_id={CHECKOUT_SESSION_ID}&type=single`
      
      // Aggiorna l'offerta con il metodo di pagamento scelto
      await adminDb.collection('externalOffers').doc(offerId).update({
        paymentMethod: 'single',
        updatedAt: FieldValue.serverTimestamp()
      })
    } else {
      // Pagamento rateale - usa prezzo con sovrapprezzo
      const installment = offer.installments?.[installmentNumber - 1]
      
      if (!installment) {
        return NextResponse.json({ error: 'Rata non trovata' }, { status: 404 })
      }
      
      if (installment.status === 'paid') {
        return NextResponse.json({ error: 'Rata già pagata' }, { status: 400 })
      }
      
      amountInCents = Math.round(installment.amount * 100)
      productName = `${offer.title} - Sessione ${installmentNumber}/${offer.totalSessions}`
      successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/external-offer/${offerId}/success?session_id={CHECKOUT_SESSION_ID}&type=installment&installment=${installmentNumber}`
      
      // Aggiorna l'offerta con il metodo di pagamento scelto (solo prima rata)
      if (installmentNumber === 1) {
        await adminDb.collection('externalOffers').doc(offerId).update({
          paymentMethod: 'installments',
          updatedAt: FieldValue.serverTimestamp()
        })
      }
    }
    
    // Crea sessione checkout - 100% al coach (destination charge senza application_fee)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amountInCents,
          product_data: {
            name: productName,
            description: `Sessione di coaching con ${offer.coachName} (${offer.sessionDuration} min)`,
          },
        },
        quantity: 1,
      }],
      
      // STRIPE CONNECT: 100% al coach (no application_fee)
      payment_intent_data: {
        transfer_data: {
          destination: coachStripeAccountId,
        },
        metadata: {
          type: 'external_offer',
          paymentType,
          offerId,
          installmentNumber: paymentType === 'installment' ? String(installmentNumber) : 'all',
          coachId: offer.coachId,
          clientId: offer.clientId,
        }
      },
      
      metadata: {
        type: 'external_coaching_session',
        paymentType,
        offerId,
        installmentNumber: paymentType === 'installment' ? String(installmentNumber) : 'all',
        coachId: offer.coachId,
        coachName: offer.coachName,
        coachEmail: offer.coachEmail,
        clientId: offer.clientId,
        clientName: offer.clientName,
        clientEmail: offer.clientEmail,
        coachStripeAccountId,
      },
      
      customer_email: offer.clientEmail,
      
      success_url: successUrl,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/external-offer/${offerId}?cancelled=true`,
      
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    })
    
    return NextResponse.json({ 
      url: session.url, 
      sessionId: session.id 
    })
    
  } catch (error: any) {
    console.error('External checkout error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del checkout' },
      { status: 500 }
    )
  }
}
