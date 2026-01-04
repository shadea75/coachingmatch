// src/app/api/cron/offers/route.ts
// Cron job per gestire scadenze offerte e reminder
// Configurare in vercel.json per eseguire ogni giorno alle 9:00

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  Timestamp
} from 'firebase/firestore'

// Chiave segreta per autorizzare il cron (impostare in env)
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verifica autorizzazione
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    reminders: { sent: 0, failed: 0 },
    expired: { updated: 0, failed: 0 },
    errors: [] as string[]
  }

  try {
    const now = new Date()
    
    // ============================================
    // 1. REMINDER 24H PRIMA DELLA SCADENZA
    // ============================================
    // Trova offerte che scadono tra 24 e 48 ore
    const tomorrow = new Date(now)
    tomorrow.setHours(now.getHours() + 24)
    
    const dayAfterTomorrow = new Date(now)
    dayAfterTomorrow.setHours(now.getHours() + 48)

    const reminderQuery = query(
      collection(db, 'offers'),
      where('status', '==', 'pending'),
      where('validUntil', '>=', Timestamp.fromDate(tomorrow)),
      where('validUntil', '<=', Timestamp.fromDate(dayAfterTomorrow))
    )

    const reminderSnapshot = await getDocs(reminderQuery)
    
    for (const offerDoc of reminderSnapshot.docs) {
      const offer = offerDoc.data()
      
      // Controlla se reminder già inviato
      if (offer.reminderSent) continue
      
      try {
        // Invia email reminder al coachee
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'offer_reminder',
            data: {
              coacheeEmail: offer.coacheeEmail,
              coacheeName: offer.coacheeName,
              coachName: offer.coachName,
              offerTitle: offer.title,
              totalSessions: offer.totalSessions,
              priceTotal: offer.priceTotal,
              pricePerSession: offer.pricePerSession,
              validUntil: offer.validUntil.toDate().toLocaleDateString('it-IT'),
              hoursLeft: 24,
              offerId: offerDoc.id
            }
          })
        })

        // Marca reminder come inviato
        await updateDoc(doc(db, 'offers', offerDoc.id), {
          reminderSent: true,
          reminderSentAt: Timestamp.now()
        })

        results.reminders.sent++
        console.log(`Reminder sent for offer ${offerDoc.id} to ${offer.coacheeEmail}`)
        
      } catch (error: any) {
        results.reminders.failed++
        results.errors.push(`Reminder failed for ${offerDoc.id}: ${error.message}`)
        console.error(`Failed to send reminder for offer ${offerDoc.id}:`, error)
      }
    }

    // ============================================
    // 2. SCADENZA AUTOMATICA OFFERTE
    // ============================================
    // Trova offerte scadute (validUntil < now)
    const expiredQuery = query(
      collection(db, 'offers'),
      where('status', '==', 'pending'),
      where('validUntil', '<', Timestamp.fromDate(now))
    )

    const expiredSnapshot = await getDocs(expiredQuery)
    
    for (const offerDoc of expiredSnapshot.docs) {
      const offer = offerDoc.data()
      
      try {
        // Aggiorna status a expired
        await updateDoc(doc(db, 'offers', offerDoc.id), {
          status: 'expired',
          expiredAt: Timestamp.now()
        })

        // Notifica al coachee
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'offer_expired_coachee',
            data: {
              coacheeEmail: offer.coacheeEmail,
              coacheeName: offer.coacheeName,
              coachName: offer.coachName,
              offerTitle: offer.title,
              offerId: offerDoc.id
            }
          })
        })

        // Notifica al coach
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'offer_expired_coach',
            data: {
              coachEmail: offer.coachEmail,
              coachName: offer.coachName,
              coacheeName: offer.coacheeName,
              offerTitle: offer.title,
              offerId: offerDoc.id
            }
          })
        })

        results.expired.updated++
        console.log(`Offer ${offerDoc.id} marked as expired, notifications sent`)
        
      } catch (error: any) {
        results.expired.failed++
        results.errors.push(`Expiration failed for ${offerDoc.id}: ${error.message}`)
        console.error(`Failed to expire offer ${offerDoc.id}:`, error)
      }
    }

    console.log('Cron job completed:', results)
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    })

  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      results 
    }, { status: 500 })
  }
}
