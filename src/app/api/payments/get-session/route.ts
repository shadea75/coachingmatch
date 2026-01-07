// src/app/api/payments/get-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID mancante' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return NextResponse.json({
      customerEmail: session.customer_email || session.metadata?.userEmail || null,
      customerName: session.metadata?.userName || null,
      metadata: session.metadata
    })

  } catch (error: any) {
    console.error('Errore recupero sessione:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno' },
      { status: 500 }
    )
  }
}
