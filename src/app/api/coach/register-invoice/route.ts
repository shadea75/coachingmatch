// src/app/api/coach/register-invoice/route.ts
// Endpoint per il coach per registrare il numero della fattura emessa

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc,
  updateDoc, 
  query,
  collection,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    const { payoutId, invoiceNumber, coachId } = await request.json()
    
    // Validazione input
    if (!payoutId || !invoiceNumber || !coachId) {
      return NextResponse.json(
        { error: 'Dati mancanti: payoutId, invoiceNumber e coachId sono richiesti' },
        { status: 400 }
      )
    }
    
    // Valida formato numero fattura (esempio: FATT-2026-001 o 1/2026)
    const invoiceNumberClean = invoiceNumber.trim()
    if (invoiceNumberClean.length < 3 || invoiceNumberClean.length > 50) {
      return NextResponse.json(
        { error: 'Numero fattura non valido' },
        { status: 400 }
      )
    }
    
    // Recupera payout
    const payoutRef = doc(db, 'pendingPayouts', payoutId)
    const payoutSnap = await getDoc(payoutRef)
    
    if (!payoutSnap.exists()) {
      return NextResponse.json({ error: 'Payout non trovato' }, { status: 404 })
    }
    
    const payout = payoutSnap.data()
    
    // Verifica che il payout appartenga al coach
    if (payout.coachId !== coachId) {
      return NextResponse.json(
        { error: 'Non autorizzato: questo payout non ti appartiene' },
        { status: 403 }
      )
    }
    
    // Verifica stato payout
    if (payout.payoutStatus !== 'awaiting_invoice') {
      if (payout.payoutStatus === 'invoice_received') {
        return NextResponse.json(
          { error: 'Fattura già registrata per questo payout' },
          { status: 400 }
        )
      }
      if (payout.payoutStatus === 'completed') {
        return NextResponse.json(
          { error: 'Payout già completato' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Stato payout non valido: ${payout.payoutStatus}` },
        { status: 400 }
      )
    }
    
    // Registra fattura
    await updateDoc(payoutRef, {
      'coachInvoice.received': true,
      'coachInvoice.number': invoiceNumberClean,
      'coachInvoice.receivedAt': serverTimestamp(),
      'coachInvoice.verified': false, // Admin deve verificare
      payoutStatus: 'invoice_received',
      updatedAt: serverTimestamp(),
    })
    
    // Notifica admin via email
    await notifyAdminNewInvoice(payout, invoiceNumberClean, payoutId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Fattura registrata con successo. Sarà verificata dall\'amministratore.',
      payoutId,
      invoiceNumber: invoiceNumberClean,
    })
    
  } catch (error: any) {
    console.error('Register invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante la registrazione della fattura' },
      { status: 500 }
    )
  }
}

// Notifica admin
async function notifyAdminNewInvoice(payout: any, invoiceNumber: string, payoutId: string) {
  try {
    // Recupera dati coach
    const coachDoc = await getDoc(doc(db, 'users', payout.coachId))
    const coach = coachDoc.exists() ? coachDoc.data() : null
    
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_invoice_received',
        data: {
          adminEmail: process.env.ADMIN_EMAIL || 'debora.carofiglio@gmail.com',
          payoutId,
          coachId: payout.coachId,
          coachName: coach?.displayName || coach?.name || 'Coach',
          coachEmail: coach?.email,
          invoiceNumber,
          amount: payout.grossAmount.toFixed(2),
          amountNet: payout.netAmount.toFixed(2),
          offerTitle: payout.offerTitle,
          sessionNumber: payout.sessionNumber,
        }
      })
    })
  } catch (error) {
    console.error('Error notifying admin:', error)
    // Non bloccare il flusso se l'email fallisce
  }
}

// GET: Lista fatture da emettere per un coach
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coachId = searchParams.get('coachId')
    
    if (!coachId) {
      return NextResponse.json(
        { error: 'coachId richiesto' },
        { status: 400 }
      )
    }
    
    // Query payout in attesa di fattura per questo coach
    const payoutsQuery = query(
      collection(db, 'pendingPayouts'),
      where('coachId', '==', coachId),
      where('payoutStatus', '==', 'awaiting_invoice')
    )
    
    const payoutsSnap = await getDocs(payoutsQuery)
    
    const pendingInvoices = payoutsSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        offerId: data.offerId,
        offerTitle: data.offerTitle,
        sessionNumber: data.sessionNumber,
        grossAmount: data.grossAmount,
        netAmount: data.netAmount,
        vatAmount: data.vatAmount,
        scheduledPayoutDate: data.scheduledPayoutDate?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
    })
    
    // Query anche fatture già registrate ma in attesa di verifica
    const pendingVerificationQuery = query(
      collection(db, 'pendingPayouts'),
      where('coachId', '==', coachId),
      where('payoutStatus', '==', 'invoice_received')
    )
    
    const pendingVerificationSnap = await getDocs(pendingVerificationQuery)
    
    const pendingVerification = pendingVerificationSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        offerId: data.offerId,
        offerTitle: data.offerTitle,
        sessionNumber: data.sessionNumber,
        grossAmount: data.grossAmount,
        invoiceNumber: data.coachInvoice?.number,
        registeredAt: data.coachInvoice?.receivedAt?.toDate?.()?.toISOString() || null,
        verified: data.coachInvoice?.verified || false,
      }
    })
    
    return NextResponse.json({
      pendingInvoices,
      pendingVerification,
      summary: {
        toInvoice: pendingInvoices.length,
        awaitingVerification: pendingVerification.length,
        totalPendingAmount: pendingInvoices.reduce((sum, p) => sum + p.grossAmount, 0),
      }
    })
    
  } catch (error: any) {
    console.error('Get pending invoices error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
