// src/app/api/admin/batch-payout/route.ts
// Batch payout settimanale - Eseguito ogni lunedì via Vercel Cron

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

export async function POST(request: NextRequest) {
  try {
    // Verifica autorizzazione
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Accetta sia CRON_SECRET che chiamata da admin autenticato
    const isAuthorized = 
      authHeader === `Bearer ${cronSecret}` ||
      authHeader === `Bearer ${process.env.ADMIN_API_KEY}`
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    // Trova tutti i payout pronti per essere processati
    // Condizioni: fattura ricevuta E verificata E data payout <= oggi
    const payoutsQuery = query(
      collection(db, 'pendingPayouts'),
      where('payoutStatus', '==', 'invoice_received'),
      where('coachInvoice.verified', '==', true)
    )
    
    const payoutsSnap = await getDocs(payoutsQuery)
    
    // Filtra per data (Firestore non supporta query su nested fields + timestamp)
    const eligiblePayouts = payoutsSnap.docs.filter(doc => {
      const data = doc.data()
      const scheduledDate = data.scheduledPayoutDate?.toDate?.() || new Date(data.scheduledPayoutDate)
      return scheduledDate <= today
    })
    
    const results = {
      total: eligiblePayouts.length,
      processed: 0,
      failed: 0,
      skipped: 0,
      transfers: [] as { payoutId: string; transferId: string; amount: number }[],
      errors: [] as { payoutId: string; error: string }[],
    }
    
    for (const payoutDoc of eligiblePayouts) {
      const payout = payoutDoc.data()
      const payoutId = payoutDoc.id
      
      try {
        // Recupera account Stripe del coach
        const coachStripeDoc = await getDoc(doc(db, 'coachStripeAccounts', payout.coachId))
        
        if (!coachStripeDoc.exists()) {
          throw new Error(`Coach ${payout.coachId} non ha account Stripe configurato`)
        }
        
        const coachStripeData = coachStripeDoc.data()
        const stripeAccountId = coachStripeData.stripeAccountId
        
        if (!stripeAccountId) {
          throw new Error(`Account Stripe ID mancante per coach ${payout.coachId}`)
        }
        
        // Verifica che l'account sia abilitato ai payout
        const account = await stripe.accounts.retrieve(stripeAccountId)
        
        if (!account.payouts_enabled) {
          results.skipped++
          results.errors.push({
            payoutId,
            error: `Account Stripe ${stripeAccountId} non abilitato ai payout. Il coach deve completare l'onboarding.`
          })
          
          // Aggiorna stato
          await updateDoc(doc(db, 'pendingPayouts', payoutId), {
            payoutStatus: 'blocked',
            failureReason: 'Account Stripe non abilitato ai payout',
            updatedAt: serverTimestamp(),
          })
          
          continue
        }
        
        // Calcola importo in centesimi
        const amountCents = Math.round(payout.grossAmount * 100)
        
        // Esegui Transfer
        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: 'eur',
          destination: stripeAccountId,
          transfer_group: `PAYOUT_${payoutId}`,
          description: `Payout sessione ${payout.sessionNumber} - ${payout.offerTitle}`,
          metadata: {
            payoutId,
            offerId: payout.offerId,
            coachId: payout.coachId,
            sessionNumber: String(payout.sessionNumber),
            coachInvoiceNumber: payout.coachInvoice.number || '',
          },
        })
        
        // Aggiorna stato payout come completato
        await updateDoc(doc(db, 'pendingPayouts', payoutId), {
          payoutStatus: 'completed',
          stripeTransferId: transfer.id,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        
        // Aggiorna earnings del coach
        await updateCoachEarnings(payout.coachId, payout.grossAmount)
        
        // Invia email conferma al coach
        await sendPayoutConfirmationEmail(payout, transfer.id)
        
        results.processed++
        results.transfers.push({
          payoutId,
          transferId: transfer.id,
          amount: payout.grossAmount,
        })
        
        console.log(`✅ Transfer ${transfer.id} completed for payout ${payoutId}: €${payout.grossAmount}`)
        
      } catch (err: any) {
        results.failed++
        results.errors.push({
          payoutId,
          error: err.message,
        })
        
        // Marca come fallito
        await updateDoc(doc(db, 'pendingPayouts', payoutId), {
          payoutStatus: 'failed',
          failureReason: err.message,
          updatedAt: serverTimestamp(),
        })
        
        console.error(`❌ Payout ${payoutId} failed:`, err.message)
      }
    }
    
    // Log riepilogo
    console.log(`
========================================
BATCH PAYOUT COMPLETED
========================================
Total eligible: ${results.total}
Processed: ${results.processed}
Failed: ${results.failed}
Skipped: ${results.skipped}
Total transferred: €${results.transfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
========================================
    `)
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    console.error('Batch payout critical error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Aggiorna statistiche guadagni coach
async function updateCoachEarnings(coachId: string, amount: number) {
  try {
    const earningsRef = doc(db, 'coachEarnings', coachId)
    const earningsDoc = await getDoc(earningsRef)
    
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    if (earningsDoc.exists()) {
      const data = earningsDoc.data()
      
      await updateDoc(earningsRef, {
        totalPaid: (data.totalPaid || 0) + amount,
        pendingPayout: Math.max(0, (data.pendingPayout || 0) - amount),
        lastPayoutAt: serverTimestamp(),
        lastPayoutAmount: amount,
        updatedAt: serverTimestamp(),
      })
    }
    // Se non esiste, il documento verrà creato dal webhook quando arriva il primo pagamento
    
  } catch (error) {
    console.error('Error updating coach earnings:', error)
  }
}

// Invia email conferma payout al coach
async function sendPayoutConfirmationEmail(payout: any, transferId: string) {
  try {
    const coachDoc = await getDoc(doc(db, 'users', payout.coachId))
    
    if (!coachDoc.exists()) {
      console.error('Coach not found for payout confirmation:', payout.coachId)
      return
    }
    
    const coach = coachDoc.data()
    
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'coach_payout_completed',
        data: {
          coachEmail: coach.email,
          coachName: coach.displayName || coach.name,
          amount: payout.grossAmount.toFixed(2),
          invoiceNumber: payout.coachInvoice.number,
          transferId,
          offerTitle: payout.offerTitle,
          sessionNumber: payout.sessionNumber,
        }
      })
    })
  } catch (error) {
    console.error('Error sending payout confirmation email:', error)
  }
}

// GET: Verifica stato payout pendenti (per admin dashboard)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Query payout per stato
    const [awaitingSnap, receivedSnap, completedSnap, failedSnap] = await Promise.all([
      getDocs(query(collection(db, 'pendingPayouts'), where('payoutStatus', '==', 'awaiting_invoice'))),
      getDocs(query(collection(db, 'pendingPayouts'), where('payoutStatus', '==', 'invoice_received'))),
      getDocs(query(collection(db, 'pendingPayouts'), where('payoutStatus', '==', 'completed'))),
      getDocs(query(collection(db, 'pendingPayouts'), where('payoutStatus', '==', 'failed'))),
    ])
    
    return NextResponse.json({
      summary: {
        awaitingInvoice: awaitingSnap.size,
        invoiceReceived: receivedSnap.size,
        completed: completedSnap.size,
        failed: failedSnap.size,
      },
      awaitingInvoice: awaitingSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      invoiceReceived: receivedSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      failed: failedSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    })
    
  } catch (error: any) {
    console.error('Get payout status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
