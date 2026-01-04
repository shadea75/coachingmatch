// src/app/api/admin/verify-invoice/route.ts
// Endpoint admin per verificare/approvare le fatture dei coach

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc,
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    const { payoutId, verified, adminId, notes } = await request.json()
    
    // Validazione input
    if (!payoutId || typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'Dati mancanti: payoutId e verified sono richiesti' },
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
    
    // Verifica che il payout sia nello stato corretto
    if (payout.payoutStatus !== 'invoice_received') {
      return NextResponse.json(
        { error: `Stato payout non valido per verifica: ${payout.payoutStatus}` },
        { status: 400 }
      )
    }
    
    if (!payout.coachInvoice?.received) {
      return NextResponse.json(
        { error: 'Nessuna fattura registrata per questo payout' },
        { status: 400 }
      )
    }
    
    // Aggiorna stato fattura
    await updateDoc(payoutRef, {
      'coachInvoice.verified': verified,
      'coachInvoice.verifiedAt': serverTimestamp(),
      'coachInvoice.verifiedBy': adminId || 'admin',
      'coachInvoice.notes': notes || null,
      payoutStatus: verified ? 'invoice_received' : 'invoice_rejected',
      updatedAt: serverTimestamp(),
    })
    
    // Se rifiutata, notifica il coach
    if (!verified) {
      await notifyCoachInvoiceRejected(payout, notes, payoutId)
    }
    
    return NextResponse.json({ 
      success: true,
      message: verified 
        ? 'Fattura verificata. Il payout sarà processato al prossimo batch (lunedì).' 
        : 'Fattura rifiutata. Il coach è stato notificato.',
      payoutId,
      verified,
    })
    
  } catch (error: any) {
    console.error('Verify invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante la verifica della fattura' },
      { status: 500 }
    )
  }
}

// Notifica coach fattura rifiutata
async function notifyCoachInvoiceRejected(payout: any, reason: string | null, payoutId: string) {
  try {
    const coachDoc = await getDoc(doc(db, 'users', payout.coachId))
    
    if (!coachDoc.exists()) {
      console.error('Coach not found:', payout.coachId)
      return
    }
    
    const coach = coachDoc.data()
    
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'coach_invoice_rejected',
        data: {
          coachEmail: coach.email,
          coachName: coach.displayName || coach.name,
          invoiceNumber: payout.coachInvoice?.number,
          reason: reason || 'Nessun motivo specificato',
          payoutId,
          amount: payout.grossAmount.toFixed(2),
          offerTitle: payout.offerTitle,
          sessionNumber: payout.sessionNumber,
        }
      })
    })
  } catch (error) {
    console.error('Error notifying coach:', error)
  }
}

// PATCH: Reimposta payout rifiutato a "awaiting_invoice"
export async function PATCH(request: NextRequest) {
  try {
    const { payoutId, adminId } = await request.json()
    
    if (!payoutId) {
      return NextResponse.json(
        { error: 'payoutId richiesto' },
        { status: 400 }
      )
    }
    
    const payoutRef = doc(db, 'pendingPayouts', payoutId)
    const payoutSnap = await getDoc(payoutRef)
    
    if (!payoutSnap.exists()) {
      return NextResponse.json({ error: 'Payout non trovato' }, { status: 404 })
    }
    
    const payout = payoutSnap.data()
    
    // Permetti reset solo da stati "rejected" o "failed"
    if (!['invoice_rejected', 'failed'].includes(payout.payoutStatus)) {
      return NextResponse.json(
        { error: `Non è possibile reimpostare un payout in stato: ${payout.payoutStatus}` },
        { status: 400 }
      )
    }
    
    // Reset a awaiting_invoice
    await updateDoc(payoutRef, {
      'coachInvoice.received': false,
      'coachInvoice.number': null,
      'coachInvoice.receivedAt': null,
      'coachInvoice.verified': false,
      'coachInvoice.verifiedAt': null,
      'coachInvoice.verifiedBy': null,
      'coachInvoice.notes': `Reset da admin ${adminId || 'unknown'} il ${new Date().toISOString()}`,
      payoutStatus: 'awaiting_invoice',
      failureReason: null,
      updatedAt: serverTimestamp(),
    })
    
    // Notifica coach che può reinviare fattura
    await notifyCoachCanResubmit(payout, payoutId)
    
    return NextResponse.json({
      success: true,
      message: 'Payout reimpostato. Il coach può inviare una nuova fattura.',
    })
    
  } catch (error: any) {
    console.error('Reset payout error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function notifyCoachCanResubmit(payout: any, payoutId: string) {
  try {
    const coachDoc = await getDoc(doc(db, 'users', payout.coachId))
    if (!coachDoc.exists()) return
    
    const coach = coachDoc.data()
    
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'coach_invoice_resubmit',
        data: {
          coachEmail: coach.email,
          coachName: coach.displayName || coach.name,
          amount: payout.grossAmount.toFixed(2),
          offerTitle: payout.offerTitle,
          sessionNumber: payout.sessionNumber,
        }
      })
    })
  } catch (error) {
    console.error('Error notifying coach for resubmit:', error)
  }
}
