// Sistema di Engagement Coach - Metriche Mensili + Notifiche
// File: src/lib/coachEngagement.ts

import { Timestamp } from 'firebase/firestore'

// =====================
// TIPI
// =====================

export interface CoachEngagementMetrics {
  coachId: string
  
  // Metriche del mese corrente
  monthlySessionsCompleted: number
  monthlySessionsBooked: number
  monthlyFreeCallsCompleted: number
  monthlyConversions: number // Free call → cliente pagante
  monthlyResponseTimeAvg: number // In ore
  monthlyReviewsReceived: number
  monthlyReviewsAvgRating: number
  monthlyCommunityPosts: number
  monthlyCommunityComments: number
  monthlyCommunityLikesGiven: number
  
  // Calcolati
  engagementScore: number // 0-100
  responseRate: number // % di richieste a cui ha risposto
  conversionRate: number // % free call → paganti
  
  // Tracking
  lastActivityAt: Date | Timestamp
  lastSessionAt: Date | Timestamp | null
  lastPostAt: Date | Timestamp | null
  daysInactive: number
  
  // Periodo
  periodStart: Date | Timestamp
  periodEnd: Date | Timestamp
  
  // Boost
  hasInactivityBoost: boolean
  boostExpiresAt: Date | Timestamp | null
}

export interface EngagementNotification {
  type: 'gentle_reminder' | 'visibility_warning' | 'engagement_tips' | 'celebration'
  coachId: string
  coachEmail: string
  coachName: string
  subject: string
  message: string
  suggestions: string[]
  daysInactive: number
  currentScore: number
  sentAt?: Date
}

// =====================
// CONFIGURAZIONE PESI
// =====================

const ENGAGEMENT_WEIGHTS = {
  sessionsCompleted: 0.30,    // 30% - Sessioni completate
  responseRate: 0.20,         // 20% - Tasso di risposta
  recentReviews: 0.20,        // 20% - Recensioni recenti
  communityActivity: 0.15,    // 15% - Attività community
  conversionRate: 0.15        // 15% - Conversione free → paid
}

// Soglie per i punteggi
const THRESHOLDS = {
  sessions: { excellent: 10, good: 5, fair: 2 },
  responseRate: { excellent: 95, good: 80, fair: 60 },
  reviews: { excellent: 5, good: 3, fair: 1 },
  community: { excellent: 15, good: 8, fair: 3 }, // post + commenti
  conversion: { excellent: 50, good: 30, fair: 15 } // percentuale
}

// Notifiche per inattività
const INACTIVITY_THRESHOLDS = {
  gentleReminder: 7,      // 7 giorni
  visibilityWarning: 14,  // 14 giorni
  urgentWarning: 21       // 21 giorni
}

// =====================
// CALCOLO ENGAGEMENT SCORE
// =====================

/**
 * Calcola il punteggio di engagement mensile per un coach
 */
export function calculateEngagementScore(metrics: Partial<CoachEngagementMetrics>): number {
  let totalScore = 0
  
  // 1. Sessioni completate (30%)
  const sessions = metrics.monthlySessionsCompleted || 0
  let sessionScore = 0
  if (sessions >= THRESHOLDS.sessions.excellent) sessionScore = 100
  else if (sessions >= THRESHOLDS.sessions.good) sessionScore = 75
  else if (sessions >= THRESHOLDS.sessions.fair) sessionScore = 50
  else if (sessions > 0) sessionScore = 25
  totalScore += sessionScore * ENGAGEMENT_WEIGHTS.sessionsCompleted
  
  // 2. Tasso di risposta (20%)
  const responseRate = metrics.responseRate || 0
  let responseScore = 0
  if (responseRate >= THRESHOLDS.responseRate.excellent) responseScore = 100
  else if (responseRate >= THRESHOLDS.responseRate.good) responseScore = 75
  else if (responseRate >= THRESHOLDS.responseRate.fair) responseScore = 50
  else if (responseRate > 0) responseScore = 25
  totalScore += responseScore * ENGAGEMENT_WEIGHTS.responseRate
  
  // 3. Recensioni recenti (20%)
  const reviews = metrics.monthlyReviewsReceived || 0
  const avgRating = metrics.monthlyReviewsAvgRating || 0
  let reviewScore = 0
  if (reviews >= THRESHOLDS.reviews.excellent && avgRating >= 4.5) reviewScore = 100
  else if (reviews >= THRESHOLDS.reviews.good && avgRating >= 4) reviewScore = 75
  else if (reviews >= THRESHOLDS.reviews.fair && avgRating >= 3.5) reviewScore = 50
  else if (reviews > 0) reviewScore = 25
  totalScore += reviewScore * ENGAGEMENT_WEIGHTS.recentReviews
  
  // 4. Attività community (15%)
  const communityActivity = (metrics.monthlyCommunityPosts || 0) + 
                           (metrics.monthlyCommunityComments || 0) +
                           Math.floor((metrics.monthlyCommunityLikesGiven || 0) / 3) // 3 like = 1 punto
  let communityScore = 0
  if (communityActivity >= THRESHOLDS.community.excellent) communityScore = 100
  else if (communityActivity >= THRESHOLDS.community.good) communityScore = 75
  else if (communityActivity >= THRESHOLDS.community.fair) communityScore = 50
  else if (communityActivity > 0) communityScore = 25
  totalScore += communityScore * ENGAGEMENT_WEIGHTS.communityActivity
  
  // 5. Tasso conversione (15%)
  const conversionRate = metrics.conversionRate || 0
  let conversionScore = 0
  if (conversionRate >= THRESHOLDS.conversion.excellent) conversionScore = 100
  else if (conversionRate >= THRESHOLDS.conversion.good) conversionScore = 75
  else if (conversionRate >= THRESHOLDS.conversion.fair) conversionScore = 50
  else if (conversionRate > 0) conversionScore = 25
  totalScore += conversionScore * ENGAGEMENT_WEIGHTS.conversionRate
  
  return Math.round(totalScore)
}

/**
 * Calcola il boost per coach inattivi (per garantire visibilità minima)
 */
export function calculateInactivityBoost(daysInactive: number, currentScore: number): number {
  // Se molto inattivo (14+ giorni) e score basso, dai un boost
  if (daysInactive >= 14 && currentScore < 30) {
    return 15 // +15 punti boost
  }
  if (daysInactive >= 7 && currentScore < 20) {
    return 10 // +10 punti boost
  }
  return 0
}

/**
 * Calcola il random boost (10% del ranking finale)
 * Garantisce che tutti abbiano una chance di apparire in alto
 */
export function calculateRandomBoost(coachId: string, dayOfMonth: number): number {
  // Pseudo-random basato su coachId e giorno del mese
  // Così ogni coach ha giorni "fortunati" diversi
  const hash = coachId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const seed = (hash + dayOfMonth) % 100
  return seed / 10 // 0-10 punti random
}

// =====================
// RANKING FINALE
// =====================

export interface CoachRankingFactors {
  matchScore: number        // Dal sistema di matching (0-100)
  engagementScore: number   // Engagement mensile (0-100)
  randomBoost: number       // Boost casuale (0-10)
  inactivityBoost: number   // Boost per inattivi (0-15)
}

/**
 * Calcola il punteggio finale per il ranking
 * Formula: Match (70%) + Engagement (20%) + Random (10%)
 */
export function calculateFinalRankingScore(factors: CoachRankingFactors): number {
  const baseScore = (factors.matchScore * 0.70) + 
                   (factors.engagementScore * 0.20) + 
                   (factors.randomBoost)
  
  // Applica boost inattività se presente
  return Math.min(100, baseScore + factors.inactivityBoost)
}

// =====================
// SISTEMA NOTIFICHE
// =====================

/**
 * Genera notifica appropriata in base ai giorni di inattività
 */
export function generateInactivityNotification(
  coach: { id: string; email: string; name: string },
  metrics: CoachEngagementMetrics
): EngagementNotification | null {
  const { daysInactive, engagementScore } = metrics
  
  // Coach attivo, nessuna notifica
  if (daysInactive < INACTIVITY_THRESHOLDS.gentleReminder) {
    return null
  }
  
  const firstName = coach.name.split(' ')[0]
  
  // 7 giorni - Promemoria gentile
  if (daysInactive >= INACTIVITY_THRESHOLDS.gentleReminder && daysInactive < INACTIVITY_THRESHOLDS.visibilityWarning) {
    return {
      type: 'gentle_reminder',
      coachId: coach.id,
      coachEmail: coach.email,
      coachName: coach.name,
      subject: `${firstName}, i tuoi coachee ti aspettano! 💫`,
      message: `Ciao ${firstName}! È passata una settimana dalla tua ultima attività su CoachaMi. I coachee che cercano supporto in questo momento potrebbero essere perfetti per te!`,
      suggestions: [
        'Pubblica un post nella Community per condividere un insight',
        'Aggiorna la tua bio con le tue ultime esperienze',
        'Rispondi a qualche post di altri coach o coachee'
      ],
      daysInactive,
      currentScore: engagementScore
    }
  }
  
  // 14 giorni - Avviso visibilità
  if (daysInactive >= INACTIVITY_THRESHOLDS.visibilityWarning && daysInactive < INACTIVITY_THRESHOLDS.urgentWarning) {
    return {
      type: 'visibility_warning',
      coachId: coach.id,
      coachEmail: coach.email,
      coachName: coach.name,
      subject: `${firstName}, il tuo profilo sta perdendo visibilità 📉`,
      message: `Ciao ${firstName}, sono passate 2 settimane dalla tua ultima attività. Il tuo profilo sta scendendo nei risultati di ricerca. Una piccola azione può fare la differenza!`,
      suggestions: [
        'Completa una sessione con un coachee in attesa',
        'Scrivi un post su un tema che ti appassiona',
        'Aggiorna la tua disponibilità nel calendario',
        'Rispondi alle richieste di call gratuite in sospeso'
      ],
      daysInactive,
      currentScore: engagementScore
    }
  }
  
  // 21+ giorni - Avviso urgente
  if (daysInactive >= INACTIVITY_THRESHOLDS.urgentWarning) {
    return {
      type: 'engagement_tips',
      coachId: coach.id,
      coachEmail: coach.email,
      coachName: coach.name,
      subject: `${firstName}, ci manchi! Ecco come tornare in pista 🚀`,
      message: `Ciao ${firstName}, sono passate 3 settimane! Sappiamo che la vita è piena di impegni, ma i coachee su CoachaMi hanno bisogno di coach come te. Ti diamo una mano a ricominciare.`,
      suggestions: [
        '✨ Abbiamo attivato un BOOST temporaneo sul tuo profilo',
        'Basta 1 post o 1 risposta per riattivare la tua visibilità',
        'Hai richieste di call gratuite in sospeso? Rispondi per primo!',
        'Aggiorna la foto profilo per un look fresco'
      ],
      daysInactive,
      currentScore: engagementScore
    }
  }
  
  return null
}

/**
 * Genera notifica di celebrazione per coach molto attivi
 */
export function generateCelebrationNotification(
  coach: { id: string; email: string; name: string },
  metrics: CoachEngagementMetrics
): EngagementNotification | null {
  const { engagementScore, monthlySessionsCompleted, monthlyReviewsReceived } = metrics
  
  // Top performer del mese
  if (engagementScore >= 85 && monthlySessionsCompleted >= 8) {
    const firstName = coach.name.split(' ')[0]
    return {
      type: 'celebration',
      coachId: coach.id,
      coachEmail: coach.email,
      coachName: coach.name,
      subject: `🏆 ${firstName}, sei tra i Top Coach del mese!`,
      message: `Complimenti ${firstName}! Con ${monthlySessionsCompleted} sessioni e ${monthlyReviewsReceived} recensioni positive, sei tra i coach più attivi di CoachaMi questo mese. Il tuo impegno fa la differenza!`,
      suggestions: [
        'Il tuo profilo avrà un badge "Top Coach" questo mese',
        'Considera di condividere la tua esperienza in un post',
        'Potresti essere featured nella nostra newsletter!'
      ],
      daysInactive: 0,
      currentScore: engagementScore
    }
  }
  
  return null
}

// =====================
// TEMPLATE EMAIL
// =====================

export function generateNotificationEmailHtml(notification: EngagementNotification): string {
  const bgColor = notification.type === 'celebration' ? '#10B981' : 
                  notification.type === 'visibility_warning' ? '#F59E0B' : 
                  '#D4A574'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">CoachaMi</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
        ${notification.message}
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin: 0 0 15px 0;">
          💡 Ecco cosa puoi fare:
        </p>
        ${notification.suggestions.map(s => `
          <p style="color: #374151; font-size: 14px; margin: 8px 0; padding-left: 10px; border-left: 3px solid ${bgColor};">
            ${s}
          </p>
        `).join('')}
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://www.coachami.it/dashboard" 
           style="display: inline-block; background: ${bgColor}; color: white; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-weight: 600;">
          Vai alla Dashboard →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Ricevi questa email perché sei un coach su CoachaMi.<br>
        <a href="https://www.coachami.it/settings" style="color: ${bgColor};">Gestisci notifiche</a>
      </p>
    </div>
    
  </div>
</body>
</html>
  `
}

// =====================
// UTILITY
// =====================

/**
 * Calcola i giorni di inattività
 */
export function calculateDaysInactive(lastActivityAt: Date | Timestamp | null): number {
  if (!lastActivityAt) return 30 // Default se mai attivo
  
  const lastActivity = lastActivityAt instanceof Date 
    ? lastActivityAt 
    : lastActivityAt.toDate()
  
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - lastActivity.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Calcola il tasso di conversione
 */
export function calculateConversionRate(
  freeCallsCompleted: number, 
  conversions: number
): number {
  if (freeCallsCompleted === 0) return 0
  return Math.round((conversions / freeCallsCompleted) * 100)
}

/**
 * Determina il livello di engagement
 */
export function getEngagementLevel(score: number): {
  level: 'star' | 'active' | 'moderate' | 'low' | 'inactive'
  label: string
  color: string
  emoji: string
} {
  if (score >= 80) return { level: 'star', label: 'Top Coach', color: '#10B981', emoji: '⭐' }
  if (score >= 60) return { level: 'active', label: 'Molto Attivo', color: '#3B82F6', emoji: '🔥' }
  if (score >= 40) return { level: 'moderate', label: 'Attivo', color: '#F59E0B', emoji: '✨' }
  if (score >= 20) return { level: 'low', label: 'Poco Attivo', color: '#9CA3AF', emoji: '💤' }
  return { level: 'inactive', label: 'Inattivo', color: '#EF4444', emoji: '😴' }
}
