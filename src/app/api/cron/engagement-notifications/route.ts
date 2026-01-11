import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore'
import {
  calculateEngagementScore,
  calculateDaysInactive,
  generateInactivityNotification,
  generateCelebrationNotification,
  generateNotificationEmailHtml,
  CoachEngagementMetrics
} from '@/lib/coachEngagement'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Verifica chiave API per cron job (sicurezza)
const CRON_SECRET = process.env.CRON_SECRET || 'coachami-cron-2026'

export async function GET(request: NextRequest) {
  // Verifica autorizzazione
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('🔔 Starting engagement notifications cron job')
  
  try {
    // 1. Carica tutti i coach approvati
    const coachesQuery = query(
      collection(db, 'coachApplications'),
      where('status', '==', 'approved')
    )
    const coachesSnapshot = await getDocs(coachesQuery)
    
    const notifications = {
      sent: 0,
      errors: 0,
      skipped: 0,
      details: [] as string[]
    }
    
    for (const coachDoc of coachesSnapshot.docs) {
      const coachData = coachDoc.data()
      const coachId = coachDoc.id
      const coachEmail = coachData.email
      const coachName = coachData.name
      
      if (!coachEmail) {
        notifications.skipped++
        continue
      }
      
      try {
        // 2. Carica metriche engagement del coach
        const metrics = await getCoachEngagementMetrics(coachId)
        
        // 3. Genera notifica appropriata
        const coach = { id: coachId, email: coachEmail, name: coachName }
        
        // Prima controlla se è un top performer (celebrazione)
        const celebrationNotif = generateCelebrationNotification(coach, metrics)
        if (celebrationNotif) {
          await sendNotificationEmail(celebrationNotif)
          notifications.sent++
          notifications.details.push(`✨ Celebration sent to ${coachName}`)
          continue
        }
        
        // Altrimenti controlla inattività
        const inactivityNotif = generateInactivityNotification(coach, metrics)
        if (inactivityNotif) {
          // Verifica che non abbiamo già mandato questa notifica di recente
          const lastNotifType = coachData.lastEngagementNotificationType
          const lastNotifDate = coachData.lastEngagementNotificationAt?.toDate?.()
          
          const daysSinceLastNotif = lastNotifDate 
            ? Math.floor((Date.now() - lastNotifDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999
          
          // Non mandare la stessa notifica più di una volta a settimana
          if (lastNotifType === inactivityNotif.type && daysSinceLastNotif < 7) {
            notifications.skipped++
            continue
          }
          
          await sendNotificationEmail(inactivityNotif)
          
          // Aggiorna timestamp ultima notifica
          await updateDoc(doc(db, 'coachApplications', coachId), {
            lastEngagementNotificationType: inactivityNotif.type,
            lastEngagementNotificationAt: Timestamp.now()
          })
          
          notifications.sent++
          notifications.details.push(`📧 ${inactivityNotif.type} sent to ${coachName}`)
        } else {
          notifications.skipped++
        }
        
      } catch (err: any) {
        console.error(`Error processing coach ${coachId}:`, err)
        notifications.errors++
        notifications.details.push(`❌ Error for ${coachName}: ${err.message}`)
      }
    }
    
    console.log('✅ Engagement notifications completed:', notifications)
    
    return NextResponse.json({
      success: true,
      ...notifications
    })
    
  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =====================
// HELPER FUNCTIONS
// =====================

async function getCoachEngagementMetrics(coachId: string): Promise<CoachEngagementMetrics> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Carica sessioni del mese
  const sessionsQuery = query(
    collection(db, 'sessions'),
    where('coachId', '==', coachId),
    where('status', '==', 'completed')
  )
  const sessionsSnapshot = await getDocs(sessionsQuery)
  const monthlySessions = sessionsSnapshot.docs.filter(doc => {
    const scheduledAt = doc.data().scheduledAt?.toDate?.()
    return scheduledAt && scheduledAt >= monthStart
  })
  
  // Carica free calls del mese
  const freeCallsQuery = query(
    collection(db, 'sessions'),
    where('coachId', '==', coachId),
    where('type', '==', 'free_consultation'),
    where('status', '==', 'completed')
  )
  const freeCallsSnapshot = await getDocs(freeCallsQuery)
  const monthlyFreeCalls = freeCallsSnapshot.docs.filter(doc => {
    const scheduledAt = doc.data().scheduledAt?.toDate?.()
    return scheduledAt && scheduledAt >= monthStart
  })
  
  // Carica recensioni del mese
  const reviewsQuery = query(
    collection(db, 'reviews'),
    where('coachId', '==', coachId)
  )
  const reviewsSnapshot = await getDocs(reviewsQuery)
  const monthlyReviews = reviewsSnapshot.docs.filter(doc => {
    const createdAt = doc.data().createdAt?.toDate?.()
    return createdAt && createdAt >= monthStart
  })
  
  const avgRating = monthlyReviews.length > 0
    ? monthlyReviews.reduce((sum, doc) => sum + (doc.data().rating || 0), 0) / monthlyReviews.length
    : 0
  
  // Carica post community del mese
  const postsQuery = query(
    collection(db, 'communityPosts'),
    where('authorId', '==', coachId)
  )
  const postsSnapshot = await getDocs(postsQuery)
  const monthlyPosts = postsSnapshot.docs.filter(doc => {
    const createdAt = doc.data().createdAt?.toDate?.()
    return createdAt && createdAt >= monthStart
  })
  
  // Trova ultima attività
  let lastActivityAt = monthStart
  
  if (monthlySessions.length > 0) {
    const lastSession = monthlySessions.sort((a, b) => 
      (b.data().scheduledAt?.toDate?.() || 0) - (a.data().scheduledAt?.toDate?.() || 0)
    )[0]
    const sessionDate = lastSession.data().scheduledAt?.toDate?.()
    if (sessionDate && sessionDate > lastActivityAt) {
      lastActivityAt = sessionDate
    }
  }
  
  if (monthlyPosts.length > 0) {
    const lastPost = monthlyPosts.sort((a, b) =>
      (b.data().createdAt?.toDate?.() || 0) - (a.data().createdAt?.toDate?.() || 0)
    )[0]
    const postDate = lastPost.data().createdAt?.toDate?.()
    if (postDate && postDate > lastActivityAt) {
      lastActivityAt = postDate
    }
  }
  
  // Calcola conversioni (free call → cliente pagante)
  // Semplificato: conta quanti coachee hanno fatto free call E poi sessioni pagate
  const coacheeWithFreeCalls = new Set(monthlyFreeCalls.map(doc => doc.data().coacheeId))
  const paidSessions = monthlySessions.filter(doc => doc.data().type === 'paid_session')
  const conversions = paidSessions.filter(doc => coacheeWithFreeCalls.has(doc.data().coacheeId)).length
  
  const daysInactive = calculateDaysInactive(lastActivityAt)
  
  const metrics: CoachEngagementMetrics = {
    coachId,
    monthlySessionsCompleted: monthlySessions.length,
    monthlySessionsBooked: 0, // TODO: calcolare
    monthlyFreeCallsCompleted: monthlyFreeCalls.length,
    monthlyConversions: conversions,
    monthlyResponseTimeAvg: 0, // TODO: calcolare
    monthlyReviewsReceived: monthlyReviews.length,
    monthlyReviewsAvgRating: avgRating,
    monthlyCommunityPosts: monthlyPosts.length,
    monthlyCommunityComments: 0, // TODO: calcolare
    monthlyCommunityLikesGiven: 0, // TODO: calcolare
    engagementScore: 0, // Calcolato dopo
    responseRate: 100, // TODO: calcolare
    conversionRate: monthlyFreeCalls.length > 0 
      ? Math.round((conversions / monthlyFreeCalls.length) * 100) 
      : 0,
    lastActivityAt,
    lastSessionAt: monthlySessions[0]?.data().scheduledAt?.toDate?.() || null,
    lastPostAt: monthlyPosts[0]?.data().createdAt?.toDate?.() || null,
    daysInactive,
    periodStart: monthStart,
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    hasInactivityBoost: daysInactive >= 14,
    boostExpiresAt: null
  }
  
  // Calcola score
  metrics.engagementScore = calculateEngagementScore(metrics)
  
  return metrics
}

async function sendNotificationEmail(notification: any) {
  if (!resend) {
    console.log('⚠️ Resend not configured, skipping email')
    return
  }
  
  const html = generateNotificationEmailHtml(notification)
  
  await resend.emails.send({
    from: 'CoachaMi <noreply@coachami.it>',
    to: notification.coachEmail,
    subject: notification.subject,
    html
  })
}
