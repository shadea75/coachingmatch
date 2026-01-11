// Sistema di Matching Avanzato Coach-Coachee
// File: src/lib/coachMatching.ts

import { LifeAreaId } from '@/types'
import { 
  calculateEngagementScore, 
  calculateInactivityBoost, 
  calculateRandomBoost,
  calculateFinalRankingScore,
  getEngagementLevel,
  CoachEngagementMetrics
} from './coachEngagement'

// =====================
// TIPI
// =====================

export interface CoachProfile {
  id: string
  name: string
  photo?: string | null
  lifeArea?: LifeAreaId
  lifeAreas: LifeAreaId[]
  bio?: string
  motivation?: string
  specializations?: {
    focusTopics?: string[]
    targetAudience?: string[]
  }
  problemsAddressed?: string[]
  style?: string[]
  location?: string
  languages?: string[]
  rating?: number
  reviewCount?: number
  yearsOfExperience?: number
  averagePrice?: number
  sessionMode?: string[]
  freeCallAvailable?: boolean
  certifications?: string[]
  // Engagement metrics
  engagementMetrics?: Partial<CoachEngagementMetrics>
}

// =====================
// PROFILE COMPLETENESS
// =====================

export interface ProfileCompletenessResult {
  score: number // 0-100
  missingFields: string[]
  penalties: { field: string; points: number }[]
  totalPenalty: number
}

const PROFILE_PENALTIES = {
  photo: 10,        // -10 punti se manca foto
  bio: 5,           // -5 punti se manca bio
  specializations: 3, // -3 punti se mancano specializzazioni
  location: 2,      // -2 punti se manca location
  certifications: 2 // -2 punti se mancano certificazioni
}

/**
 * Calcola la completezza del profilo e le penalità
 */
export function calculateProfileCompleteness(coach: CoachProfile): ProfileCompletenessResult {
  const missingFields: string[] = []
  const penalties: { field: string; points: number }[] = []
  let totalPenalty = 0

  // Verifica foto
  if (!coach.photo) {
    missingFields.push('Foto profilo')
    penalties.push({ field: 'photo', points: PROFILE_PENALTIES.photo })
    totalPenalty += PROFILE_PENALTIES.photo
  }

  // Verifica bio
  if (!coach.bio || coach.bio.length < 50) {
    missingFields.push('Biografia')
    penalties.push({ field: 'bio', points: PROFILE_PENALTIES.bio })
    totalPenalty += PROFILE_PENALTIES.bio
  }

  // Verifica specializzazioni
  if (!coach.specializations?.focusTopics || coach.specializations.focusTopics.length === 0) {
    missingFields.push('Specializzazioni')
    penalties.push({ field: 'specializations', points: PROFILE_PENALTIES.specializations })
    totalPenalty += PROFILE_PENALTIES.specializations
  }

  // Verifica location
  if (!coach.location || coach.location.trim() === '') {
    missingFields.push('Località')
    penalties.push({ field: 'location', points: PROFILE_PENALTIES.location })
    totalPenalty += PROFILE_PENALTIES.location
  }

  // Verifica certificazioni
  if (!coach.certifications || coach.certifications.length === 0) {
    missingFields.push('Certificazioni')
    penalties.push({ field: 'certifications', points: PROFILE_PENALTIES.certifications })
    totalPenalty += PROFILE_PENALTIES.certifications
  }

  // Calcola score completezza (100 - penalità totali)
  const maxPenalty = Object.values(PROFILE_PENALTIES).reduce((a, b) => a + b, 0)
  const score = Math.round(((maxPenalty - totalPenalty) / maxPenalty) * 100)

  return {
    score,
    missingFields,
    penalties,
    totalPenalty
  }
}

export interface CoacheeProfile {
  // Dal test
  scores?: Record<LifeAreaId, number>
  priorityArea?: LifeAreaId
  archetypeId?: string
  questionAnswers?: Record<string, number>
  
  // Dal profilo utente (se registrato)
  location?: string
  preferredLanguages?: string[]
  budget?: { min: number; max: number }
  preferredStyle?: string[]
  goals?: string[]
  challenges?: string[]
  preferredSessionMode?: string[] // online, in-person
}

export interface MatchResult {
  coach: CoachProfile
  score: number // 0-100 (match score puro)
  finalScore: number // 0-100 (match + engagement + random - penalties)
  matchReasons: MatchReason[]
  compatibility: 'perfect' | 'high' | 'good' | 'moderate'
  engagementLevel?: {
    level: string
    label: string
    emoji: string
  }
  profileCompleteness?: ProfileCompletenessResult
}

export interface MatchReason {
  type: string
  label: string
  weight: number
  matched: boolean
  detail?: string
}

// =====================
// CONFIGURAZIONE PESI
// =====================

const WEIGHTS = {
  // Area e specializzazione (40%)
  primaryArea: 15,
  secondaryAreas: 8,
  relatedAreas: 5,
  focusTopics: 7,
  problemsAddressed: 5,
  
  // Qualità coach (25%)
  rating: 10,
  reviewCount: 5,
  experience: 5,
  certifications: 5,
  
  // Compatibilità personale (20%)
  style: 8,
  motivation: 5, // Analisi semantica bio/motivation
  archetypeMatch: 7,
  
  // Praticità (15%)
  location: 5,
  price: 5,
  sessionMode: 3,
  freeCall: 2
}

// =====================
// MAPPE DI AFFINITÀ
// =====================

// Aree correlate (per fallback)
const RELATED_AREAS: Record<LifeAreaId, LifeAreaId[]> = {
  salute: ['crescita', 'divertimento', 'spiritualita'],
  finanze: ['carriera', 'crescita', 'spiritualita'],
  carriera: ['finanze', 'crescita', 'relazioni'],
  relazioni: ['amore', 'crescita', 'divertimento'],
  amore: ['relazioni', 'crescita', 'spiritualita'],
  crescita: ['carriera', 'spiritualita', 'salute'],
  spiritualita: ['crescita', 'salute', 'amore'],
  divertimento: ['relazioni', 'salute', 'crescita']
}

// Stili coaching e archetipi compatibili
const ARCHETYPE_STYLE_MATCH: Record<string, string[]> = {
  achiever: ['diretto', 'strutturato', 'orientato ai risultati', 'sfidante'],
  leader: ['diretto', 'strategico', 'sfidante', 'executive'],
  strategist: ['strutturato', 'analitico', 'metodico', 'orientato ai risultati'],
  nurturer: ['empatico', 'supportivo', 'gentile', 'accogliente'],
  connector: ['collaborativo', 'dinamico', 'sociale', 'energico'],
  romantic: ['empatico', 'profondo', 'intuitivo', 'gentile'],
  philosopher: ['riflessivo', 'profondo', 'socratico', 'contemplativo'],
  healer: ['empatico', 'olistico', 'gentile', 'spirituale'],
  phoenix: ['supportivo', 'paziente', 'motivazionale', 'trasformativo'],
  seeker: ['esplorativo', 'curioso', 'flessibile', 'creativo'],
  harmonizer: ['bilanciato', 'olistico', 'integrato', 'equilibrato'],
  creative: ['creativo', 'flessibile', 'innovativo', 'dinamico']
}

// Keywords per problemi comuni
const PROBLEM_KEYWORDS: Record<string, string[]> = {
  stress: ['stress', 'ansia', 'burnout', 'sovraccarico', 'pressione'],
  confidence: ['autostima', 'fiducia', 'sicurezza', 'insicurezza', 'self-confidence'],
  relationships: ['relazioni', 'comunicazione', 'conflitti', 'coppia', 'famiglia'],
  career: ['carriera', 'lavoro', 'professionale', 'leadership', 'business'],
  balance: ['equilibrio', 'work-life', 'balance', 'tempo', 'priorità'],
  purpose: ['scopo', 'significato', 'direzione', 'valori', 'missione'],
  change: ['cambiamento', 'transizione', 'trasformazione', 'decisioni'],
  motivation: ['motivazione', 'energia', 'blocco', 'procrastinazione']
}

// =====================
// FUNZIONI DI SCORING
// =====================

/**
 * Calcola il punteggio di match area
 */
function scoreAreaMatch(
  coach: CoachProfile, 
  coachee: CoacheeProfile
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = []
  let score = 0
  
  const priorityArea = coachee.priorityArea
  if (!priorityArea) return { score: 0, reasons }
  
  // Match area principale
  if (coach.lifeArea === priorityArea || coach.lifeAreas?.includes(priorityArea)) {
    score += WEIGHTS.primaryArea
    reasons.push({
      type: 'primaryArea',
      label: 'Specializzato nella tua area prioritaria',
      weight: WEIGHTS.primaryArea,
      matched: true,
      detail: `Esperto in ${getAreaLabel(priorityArea)}`
    })
  }
  
  // Match aree secondarie (punteggi bassi del coachee)
  if (coachee.scores) {
    const lowScoreAreas = Object.entries(coachee.scores)
      .filter(([_, score]) => score <= 5)
      .map(([area]) => area as LifeAreaId)
      .filter(area => area !== priorityArea)
    
    const matchedSecondary = lowScoreAreas.filter(area => 
      coach.lifeAreas?.includes(area)
    )
    
    if (matchedSecondary.length > 0) {
      score += Math.min(matchedSecondary.length * 3, WEIGHTS.secondaryAreas)
      reasons.push({
        type: 'secondaryAreas',
        label: 'Copre anche altre tue aree da migliorare',
        weight: WEIGHTS.secondaryAreas,
        matched: true,
        detail: matchedSecondary.map(getAreaLabel).join(', ')
      })
    }
  }
  
  // Match aree correlate (fallback)
  if (score === 0 && priorityArea) {
    const relatedAreas = RELATED_AREAS[priorityArea] || []
    const matchedRelated = relatedAreas.filter(area => 
      coach.lifeAreas?.includes(area)
    )
    
    if (matchedRelated.length > 0) {
      score += WEIGHTS.relatedAreas
      reasons.push({
        type: 'relatedAreas',
        label: 'Lavora su aree collegate',
        weight: WEIGHTS.relatedAreas,
        matched: true,
        detail: matchedRelated.map(getAreaLabel).join(', ')
      })
    }
  }
  
  return { score, reasons }
}

/**
 * Calcola il punteggio specializzazioni
 */
function scoreSpecializations(
  coach: CoachProfile,
  coachee: CoacheeProfile
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = []
  let score = 0
  
  const focusTopics = coach.specializations?.focusTopics || []
  const problemsAddressed = coach.problemsAddressed || []
  
  // Match con goals/challenges del coachee
  const coacheeChallenges = coachee.challenges || []
  const coacheeGoals = coachee.goals || []
  const allCoacheeNeeds = [...coacheeChallenges, ...coacheeGoals].map(s => s.toLowerCase())
  
  // Check focus topics
  const matchedTopics = focusTopics.filter(topic =>
    allCoacheeNeeds.some(need => 
      need.includes(topic.toLowerCase()) || topic.toLowerCase().includes(need)
    )
  )
  
  if (matchedTopics.length > 0) {
    score += Math.min(matchedTopics.length * 2, WEIGHTS.focusTopics)
    reasons.push({
      type: 'focusTopics',
      label: 'Specializzato nei tuoi obiettivi',
      weight: WEIGHTS.focusTopics,
      matched: true,
      detail: matchedTopics.slice(0, 3).join(', ')
    })
  }
  
  // Check problems addressed
  if (problemsAddressed.length > 0) {
    const matchedProblems = problemsAddressed.filter(problem =>
      allCoacheeNeeds.some(need =>
        need.includes(problem.toLowerCase()) || problem.toLowerCase().includes(need)
      )
    )
    
    if (matchedProblems.length > 0) {
      score += WEIGHTS.problemsAddressed
      reasons.push({
        type: 'problemsAddressed',
        label: 'Affronta le tue sfide specifiche',
        weight: WEIGHTS.problemsAddressed,
        matched: true,
        detail: matchedProblems.slice(0, 2).join(', ')
      })
    }
  }
  
  return { score, reasons }
}

/**
 * Calcola il punteggio qualità coach
 */
function scoreQuality(
  coach: CoachProfile
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = []
  let score = 0
  
  // Rating (0-10 scale)
  const rating = coach.rating || 0
  if (rating >= 4.5) {
    score += WEIGHTS.rating
    reasons.push({
      type: 'rating',
      label: 'Altamente valutato',
      weight: WEIGHTS.rating,
      matched: true,
      detail: `${rating.toFixed(1)} ⭐`
    })
  } else if (rating >= 4) {
    score += WEIGHTS.rating * 0.7
  } else if (rating >= 3.5) {
    score += WEIGHTS.rating * 0.4
  }
  
  // Review count
  const reviews = coach.reviewCount || 0
  if (reviews >= 20) {
    score += WEIGHTS.reviewCount
    reasons.push({
      type: 'reviewCount',
      label: 'Molte recensioni positive',
      weight: WEIGHTS.reviewCount,
      matched: true,
      detail: `${reviews} recensioni`
    })
  } else if (reviews >= 10) {
    score += WEIGHTS.reviewCount * 0.7
  } else if (reviews >= 5) {
    score += WEIGHTS.reviewCount * 0.4
  }
  
  // Experience
  const years = coach.yearsOfExperience || 0
  if (years >= 5) {
    score += WEIGHTS.experience
    reasons.push({
      type: 'experience',
      label: 'Coach esperto',
      weight: WEIGHTS.experience,
      matched: true,
      detail: `${years} anni di esperienza`
    })
  } else if (years >= 3) {
    score += WEIGHTS.experience * 0.7
  } else if (years >= 1) {
    score += WEIGHTS.experience * 0.4
  }
  
  // Certifications
  const certs = coach.certifications || []
  if (certs.length >= 3) {
    score += WEIGHTS.certifications
    reasons.push({
      type: 'certifications',
      label: 'Certificazioni multiple',
      weight: WEIGHTS.certifications,
      matched: true,
      detail: certs.slice(0, 2).join(', ')
    })
  } else if (certs.length >= 1) {
    score += WEIGHTS.certifications * 0.5
  }
  
  return { score, reasons }
}

/**
 * Calcola il punteggio compatibilità personale
 */
function scorePersonalCompatibility(
  coach: CoachProfile,
  coachee: CoacheeProfile
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = []
  let score = 0
  
  // Style match con archetipo
  const archetypeId = coachee.archetypeId
  const coachStyles = coach.style || []
  
  if (archetypeId && coachStyles.length > 0) {
    const preferredStyles = ARCHETYPE_STYLE_MATCH[archetypeId] || []
    const matchedStyles = coachStyles.filter(style =>
      preferredStyles.some(pref => 
        style.toLowerCase().includes(pref.toLowerCase()) ||
        pref.toLowerCase().includes(style.toLowerCase())
      )
    )
    
    if (matchedStyles.length > 0) {
      score += WEIGHTS.style
      reasons.push({
        type: 'style',
        label: 'Stile compatibile con te',
        weight: WEIGHTS.style,
        matched: true,
        detail: `Approccio ${matchedStyles[0].toLowerCase()}`
      })
    }
  }
  
  // Style match con preferenze esplicite
  if (coachee.preferredStyle && coachee.preferredStyle.length > 0) {
    const matchedPreferred = coachStyles.filter(style =>
      coachee.preferredStyle!.some(pref =>
        style.toLowerCase().includes(pref.toLowerCase())
      )
    )
    
    if (matchedPreferred.length > 0 && !reasons.find(r => r.type === 'style')) {
      score += WEIGHTS.style
      reasons.push({
        type: 'style',
        label: 'Stile che preferisci',
        weight: WEIGHTS.style,
        matched: true,
        detail: matchedPreferred[0]
      })
    }
  }
  
  // Analisi semantica bio/motivation
  const coachText = `${coach.bio || ''} ${coach.motivation || ''}`.toLowerCase()
  if (coachText.length > 50 && archetypeId) {
    const archetypeKeywords = getArchetypeKeywords(archetypeId)
    const matchedKeywords = archetypeKeywords.filter(kw => coachText.includes(kw))
    
    if (matchedKeywords.length >= 2) {
      score += WEIGHTS.motivation
      reasons.push({
        type: 'motivation',
        label: 'Missione in linea con te',
        weight: WEIGHTS.motivation,
        matched: true
      })
    }
  }
  
  // Archetype specific bonus
  if (archetypeId) {
    score += WEIGHTS.archetypeMatch * 0.5 // Base bonus per avere info archetipo
  }
  
  return { score, reasons }
}

/**
 * Calcola il punteggio praticità
 */
function scorePracticality(
  coach: CoachProfile,
  coachee: CoacheeProfile
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = []
  let score = 0
  
  // Location match
  if (coachee.location && coach.location) {
    const coacheeCity = coachee.location.toLowerCase()
    const coachCity = coach.location.toLowerCase()
    
    if (coachCity.includes(coacheeCity) || coacheeCity.includes(coachCity)) {
      score += WEIGHTS.location
      reasons.push({
        type: 'location',
        label: 'Nella tua zona',
        weight: WEIGHTS.location,
        matched: true,
        detail: coach.location
      })
    }
  }
  
  // Price match
  if (coachee.budget && coach.averagePrice) {
    if (coach.averagePrice >= coachee.budget.min && coach.averagePrice <= coachee.budget.max) {
      score += WEIGHTS.price
      reasons.push({
        type: 'price',
        label: 'Nel tuo budget',
        weight: WEIGHTS.price,
        matched: true,
        detail: `€${coach.averagePrice}/sessione`
      })
    }
  }
  
  // Session mode match
  if (coachee.preferredSessionMode && coach.sessionMode) {
    const matchedMode = coach.sessionMode.some(mode =>
      coachee.preferredSessionMode!.includes(mode)
    )
    
    if (matchedMode) {
      score += WEIGHTS.sessionMode
      reasons.push({
        type: 'sessionMode',
        label: 'Modalità preferita disponibile',
        weight: WEIGHTS.sessionMode,
        matched: true,
        detail: coach.sessionMode.join(', ')
      })
    }
  }
  
  // Free call available
  if (coach.freeCallAvailable) {
    score += WEIGHTS.freeCall
    reasons.push({
      type: 'freeCall',
      label: 'Call gratuita disponibile',
      weight: WEIGHTS.freeCall,
      matched: true
    })
  }
  
  return { score, reasons }
}

// =====================
// FUNZIONE PRINCIPALE
// =====================

/**
 * Calcola il match tra un coachee e una lista di coach
 * Formula ranking: Match (70%) + Engagement (20%) + Random (10%) - Profile Penalty
 */
export function calculateMatches(
  coaches: CoachProfile[],
  coachee: CoacheeProfile
): MatchResult[] {
  if (!coaches || coaches.length === 0) {
    return []
  }
  
  const dayOfMonth = new Date().getDate()
  
  const results: MatchResult[] = coaches.map(coach => {
    try {
      const allReasons: MatchReason[] = []
      let totalScore = 0
      
      // Calcola tutti i punteggi di match
      const areaResult = scoreAreaMatch(coach, coachee)
      const specResult = scoreSpecializations(coach, coachee)
      const qualityResult = scoreQuality(coach)
      const personalResult = scorePersonalCompatibility(coach, coachee)
      const practicalResult = scorePracticality(coach, coachee)
      
      totalScore = areaResult.score + specResult.score + qualityResult.score + 
                   personalResult.score + practicalResult.score
      
      allReasons.push(...areaResult.reasons)
      allReasons.push(...specResult.reasons)
      allReasons.push(...qualityResult.reasons)
      allReasons.push(...personalResult.reasons)
      allReasons.push(...practicalResult.reasons)
      
      // Normalizza match score a 0-100
      const maxPossibleScore = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
      const matchScore = Math.round((totalScore / maxPossibleScore) * 100)
      
      // Calcola engagement score
      let engagementScore = 50 // Default
      try {
        engagementScore = coach.engagementMetrics 
          ? calculateEngagementScore(coach.engagementMetrics)
          : 50
      } catch (e) {
        // Ignora errori engagement
      }
      
      // Calcola boost
      const daysInactive = coach.engagementMetrics?.daysInactive || 0
      const inactivityBoost = calculateInactivityBoost(daysInactive, engagementScore)
      const randomBoost = calculateRandomBoost(coach.id, dayOfMonth)
      
      // Calcola penalità profilo incompleto
      const profileCompleteness = calculateProfileCompleteness(coach)
      
      // Calcola score finale per ranking
      const baseScore = calculateFinalRankingScore({
        matchScore,
        engagementScore,
        randomBoost,
        inactivityBoost
      })
      
      // Applica penalità profilo (sottrae punti dal ranking finale)
      const finalScore = Math.max(0, Math.round(baseScore - profileCompleteness.totalPenalty))
      
      // Determina livello compatibilità (basato su match score puro)
      let compatibility: MatchResult['compatibility']
      if (matchScore >= 75) compatibility = 'perfect'
      else if (matchScore >= 55) compatibility = 'high'
      else if (matchScore >= 35) compatibility = 'good'
      else compatibility = 'moderate'
      
      // Engagement level info
      const engagementLevel = getEngagementLevel(engagementScore)
      
      return {
        coach,
        score: matchScore,
        finalScore,
        matchReasons: allReasons.filter(r => r.matched).slice(0, 5),
        compatibility,
        engagementLevel: {
          level: engagementLevel.level,
          label: engagementLevel.label,
          emoji: engagementLevel.emoji
        },
        profileCompleteness
      }
    } catch (err) {
      // Fallback per coach con errori
      console.error(`Error calculating match for coach ${coach.id}:`, err)
      return {
        coach,
        score: 50,
        finalScore: 50,
        matchReasons: [],
        compatibility: 'moderate' as const
      }
    }
  })
  
  // Ordina per finalScore (che include engagement, random boost e penalità profilo)
  return results.sort((a, b) => b.finalScore - a.finalScore)
}

/**
 * Filtra coach per area con fallback a aree correlate
 */
export function filterCoachesByArea(
  coaches: CoachProfile[],
  area: LifeAreaId,
  includeRelated: boolean = true
): { direct: CoachProfile[]; related: CoachProfile[] } {
  const direct = coaches.filter(coach =>
    coach.lifeArea === area || coach.lifeAreas?.includes(area)
  )
  
  let related: CoachProfile[] = []
  if (includeRelated && direct.length < 3) {
    const relatedAreas = RELATED_AREAS[area] || []
    related = coaches.filter(coach =>
      !direct.includes(coach) &&
      (relatedAreas.includes(coach.lifeArea as LifeAreaId) ||
       coach.lifeAreas?.some(a => relatedAreas.includes(a)))
    )
  }
  
  return { direct, related }
}

// =====================
// HELPER FUNCTIONS
// =====================

function getAreaLabel(areaId: LifeAreaId): string {
  const labels: Record<LifeAreaId, string> = {
    salute: 'Salute',
    finanze: 'Finanze',
    carriera: 'Carriera',
    relazioni: 'Relazioni',
    amore: 'Amore',
    crescita: 'Crescita',
    spiritualita: 'Spiritualità',
    divertimento: 'Divertimento'
  }
  return labels[areaId] || areaId
}

function getArchetypeKeywords(archetypeId: string): string[] {
  const keywords: Record<string, string[]> = {
    achiever: ['obiettivi', 'risultati', 'successo', 'performance', 'crescita professionale'],
    leader: ['leadership', 'guida', 'team', 'responsabilità', 'decisioni'],
    strategist: ['strategia', 'pianificazione', 'metodo', 'sistema', 'processo'],
    nurturer: ['supporto', 'ascolto', 'empatia', 'cura', 'relazioni'],
    connector: ['connessione', 'rete', 'collaborazione', 'comunicazione'],
    romantic: ['amore', 'relazione', 'intimità', 'emozioni', 'profondità'],
    philosopher: ['significato', 'scopo', 'valori', 'riflessione', 'saggezza'],
    healer: ['guarigione', 'trasformazione', 'equilibrio', 'benessere', 'olistico'],
    phoenix: ['rinascita', 'cambiamento', 'resilienza', 'forza', 'nuova vita'],
    seeker: ['scoperta', 'esplorazione', 'curiosità', 'possibilità', 'viaggio'],
    harmonizer: ['equilibrio', 'armonia', 'bilanciamento', 'integrazione'],
    creative: ['creatività', 'innovazione', 'espressione', 'arte', 'idee']
  }
  return keywords[archetypeId] || []
}

/**
 * Genera un messaggio di match personalizzato
 */
export function generateMatchMessage(result: MatchResult): string {
  const { compatibility, matchReasons } = result
  
  const intros: Record<typeof compatibility, string[]> = {
    perfect: ['Match perfetto!', 'Ideale per te!', 'Compatibilità eccellente!'],
    high: ['Ottimo match!', 'Molto compatibile!', 'Consigliato!'],
    good: ['Buon match', 'Compatibile', 'Potrebbe fare al caso tuo'],
    moderate: ['Match discreto', 'Da valutare', 'Opzione possibile']
  }
  
  const intro = intros[compatibility][Math.floor(Math.random() * intros[compatibility].length)]
  
  if (matchReasons.length > 0) {
    return `${intro} ${matchReasons[0].label}.`
  }
  
  return intro
}
