// src/app/api/checkout/route.ts
// MODELLO A: CoachaMi incassa tutto, poi trasferisce al coach

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

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
    
    // MODELLO A: CoachaMi incassa tutto
    // NESSUN transfer_data o application_fee_amount
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(installment.amount * 100), // Converti in centesimi
          product_data: {
            name: `${offer.title} - Sessione ${installmentNumber}/${offer.totalSessions}`,
            description: `Sessione di coaching con ${offer.coachName} (${offer.sessionDuration} min)`,
          },
        },
        quantity: 1,
      }],
      
      // Metadata per tracking
      metadata: {
        type: 'coaching_session',
        offerId,
        installmentNumber: String(installmentNumber),
        coachId: offer.coachId,
        coacheeId: offer.coacheeId,
        coachName: offer.coachName,
        coachEmail: offer.coachEmail,
      },
      
      // Stripe Invoicing - fattura automatica al coachee
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Sessione di coaching - ${offer.title}`,
          metadata: {
            offerId,
            coachName: offer.coachName,
            sessionNumber: String(installmentNumber),
          },
          // TODO: Inserire dati fiscali reali di CoachaMi
          custom_fields: [
            { name: 'P.IVA', value: 'IT______________' }, // Inserire P.IVA reale
          ],
          footer: 'CoachaMi Srl - Via __________, Città - P.IVA IT______________',
        },
      },
      
      // Email coachee per invio fattura
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
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del checkout' },
      { status: 500 }
    )
  }
}
