import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { PLATFORM_CONFIG } from '@/types/payments'

// Inizializza Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { offerId, coacheeId, coacheeEmail } = body
    
    if (!offerId || !coacheeId) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }
    
    // Carica offerta da Firebase
    const offerDoc = await getDoc(doc(db, 'offers', offerId))
    
    if (!offerDoc.exists()) {
      return NextResponse.json(
        { error: 'Offerta non trovata' },
        { status: 404 }
      )
    }
    
    const offer = offerDoc.data()
    
    // Verifica che l'offerta sia accettata
    if (offer.status !== 'accepted' && offer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Offerta non disponibile per il pagamento' },
        { status: 400 }
      )
    }
    
    // Verifica proprietario
    if (offer.coacheeId !== coacheeId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }
    
    // Calcola importi in centesimi per Stripe
    const amountInCents = Math.round(offer.priceTotal * 100)
    
    // Descrizione per Stripe
    const description = offer.type === 'package'
      ? `${offer.title} - ${offer.sessionsIncluded} sessioni x ${offer.sessionDuration} min`
      : `${offer.title} - Sessione ${offer.sessionDuration} min`
    
    // Crea Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: coacheeEmail,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: offer.title,
              description: description,
              metadata: {
                offerId: offerId,
                coachId: offer.coachId,
                coachName: offer.coachName,
                type: offer.type,
                sessions: offer.sessionsIncluded
              }
            },
            unit_amount: amountInCents
          },
          quantity: 1
        }
      ],
      metadata: {
        offerId: offerId,
        coachId: offer.coachId,
        coacheeId: coacheeId,
        platformFee: offer.platformFee.toString(),
        coachPayout: offer.coachPayout.toString()
      },
      // URL di ritorno
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&offer_id=${offerId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/${offerId}?cancelled=true`,
      
      // Dati per fatturazione
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: description,
          metadata: {
            offerId: offerId
          },
          footer: `${PLATFORM_CONFIG.COMPANY.name} - P.IVA ${PLATFORM_CONFIG.COMPANY.vatNumber}`,
          rendering_options: {
            amount_tax_display: 'include_inclusive_tax'
          }
        }
      },
      
      // Impostazioni aggiuntive
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      
      // Per Stripe Connect (trasferimento al coach)
      // payment_intent_data: {
      //   application_fee_amount: Math.round(offer.platformFee * 100),
      //   transfer_data: {
      //     destination: coachStripeAccountId // Da implementare
      //   }
      // }
    })
    
    // Aggiorna offerta con ID sessione Stripe
    await updateDoc(doc(db, 'offers', offerId), {
      stripeSessionId: session.id,
      status: 'accepted',
      updatedAt: new Date()
    })
    
    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id
    })
    
  } catch (error: any) {
    console.error('Errore creazione Stripe session:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}
