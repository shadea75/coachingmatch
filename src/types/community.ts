// =====================
// COMMUNITY TYPES
// =====================

// Sezioni della community
export type CommunitySection = 'coach-corner' | 'coachee-corner' | 'coach-lounge' | 'news'

// Post
export interface CommunityPost {
  id: string
  authorId: string
  authorName: string
  authorPhoto?: string
  authorRole: 'coach' | 'coachee' | 'admin'
  section: CommunitySection
  title: string
  content: string
  images?: string[]
  tags?: string[]
  likeCount: number
  commentCount: number
  saveCount: number
  createdAt: Date
  updatedAt: Date
  isPinned?: boolean
  isHighlighted?: boolean
}

// Commento
export interface CommunityComment {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorPhoto?: string
  authorRole: 'coach' | 'coachee' | 'admin'
  content: string
  likeCount: number
  createdAt: Date
  updatedAt: Date
  parentCommentId?: string // per risposte ai commenti
}

// Like
export interface CommunityLike {
  id: string
  userId: string
  targetId: string // postId o commentId
  targetType: 'post' | 'comment'
  createdAt: Date
}

// Salvataggio post
export interface CommunitySave {
  id: string
  userId: string
  postId: string
  createdAt: Date
}

// =====================
// RECENSIONI COACH
// =====================

export interface CoachReview {
  id: string
  coachId: string
  coachName: string
  coacheeId: string
  coacheeName: string
  coacheePhoto?: string
  rating: 1 | 2 | 3 | 4 | 5
  message: string
  sessionId?: string // riferimento alla sessione
  isVerified: boolean // sessione verificata
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  // Risposta del coach
  coachResponse?: string
  coachResponseAt?: Date
}

// =====================
// SISTEMA PUNTI COACH
// =====================

export interface CoachPoints {
  id?: string
  coachId: string
  coachName: string
  totalPoints: number
  currentLevel: CoachLevel
  monthlyPosts: number
  lastActivityAt: Date
  streak: number // giorni consecutivi attivo
  
  // Breakdown punti
  pointsFromPosts: number
  pointsFromComments: number
  pointsFromLikesReceived: number
  pointsFromSavesReceived: number
  pointsFromSessions: number
  pointsFromEvents: number
  pointsLostToInactivity: number
  
  // Badges guadagnati
  badges: CoachBadge[]
  
  createdAt: Date
  updatedAt: Date
}

export type CoachLevel = 'rookie' | 'rising' | 'active' | 'expert' | 'elite'

export interface CoachBadge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: Date
}

// Configurazione punti
export const POINTS_CONFIG = {
  // Guadagno punti
  POST_CREATED: 10,
  COMMENT_CREATED: 5,
  LIKE_RECEIVED: 2,
  COMMENT_RECEIVED: 3,
  SAVE_RECEIVED: 5,
  COACHEE_QUESTION_ANSWERED: 15,
  SESSION_COMPLETED_POSITIVE: 20,
  EVENT_PARTICIPATION: 25,
  WEEKLY_ACTIVE_BADGE: 50,
  
  // Perdita punti (inattività)
  INACTIVE_1_MONTH: -20,
  INACTIVE_2_MONTHS: -50,
  INACTIVE_3_MONTHS: -100, // + profilo nascosto
  
  // Requisiti minimi
  MIN_POSTS_PER_MONTH: 4,
} as const

// Livelli e soglie
export const LEVELS_CONFIG: Record<CoachLevel, { min: number; max: number; label: string; icon: string; color: string }> = {
  rookie: { min: 0, max: 99, label: 'Rookie', icon: '🌱', color: '#9CA3AF' },
  rising: { min: 100, max: 299, label: 'Rising Star', icon: '⭐', color: '#F59E0B' },
  active: { min: 300, max: 599, label: 'Active Coach', icon: '🔥', color: '#EF4444' },
  expert: { min: 600, max: 999, label: 'Expert', icon: '💎', color: '#8B5CF6' },
  elite: { min: 1000, max: Infinity, label: 'Elite', icon: '👑', color: '#EC7711' },
}

// Helper per calcolare livello dai punti
export function getLevelFromPoints(points: number): CoachLevel {
  if (points >= 1000) return 'elite'
  if (points >= 600) return 'expert'
  if (points >= 300) return 'active'
  if (points >= 100) return 'rising'
  return 'rookie'
}

// Helper per calcolare progresso al prossimo livello
export function getLevelProgress(points: number): { current: CoachLevel; next: CoachLevel | null; progress: number } {
  const current = getLevelFromPoints(points)
  const currentConfig = LEVELS_CONFIG[current]
  
  if (current === 'elite') {
    return { current, next: null, progress: 100 }
  }
  
  const levels: CoachLevel[] = ['rookie', 'rising', 'active', 'expert', 'elite']
  const nextIndex = levels.indexOf(current) + 1
  const next = levels[nextIndex] as CoachLevel
  const nextConfig = LEVELS_CONFIG[next]
  
  const pointsInLevel = points - currentConfig.min
  const pointsNeeded = nextConfig.min - currentConfig.min
  const progress = Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100))
  
  return { current, next, progress }
}

// Sezioni config
export const SECTIONS_CONFIG: Record<CommunitySection, { label: string; description: string; icon: string; color: string; allowedRoles: ('coach' | 'coachee' | 'admin')[]; visibleTo?: ('coach' | 'coachee' | 'admin')[] }> = {
  'coach-corner': {
    label: 'Coach Corner',
    description: 'Contenuti formativi e tips dai nostri coach',
    icon: '📢',
    color: '#EC7711',
    allowedRoles: ['coach', 'admin']
  },
  'coachee-corner': {
    label: 'Coachee Corner', 
    description: 'Domande, condivisioni e supporto tra coachee',
    icon: '💬',
    color: '#3B82F6',
    allowedRoles: ['coachee', 'admin']
  },
  'coach-lounge': {
    label: 'Coach Lounge',
    description: 'Spazio riservato: confronto tra coach',
    icon: '🤝',
    color: '#8B5CF6',
    allowedRoles: ['coach', 'admin'],
    visibleTo: ['coach', 'admin']
  },
  'news': {
    label: 'News & Annunci',
    description: 'Novità e comunicazioni ufficiali',
    icon: '📣',
    color: '#10B981',
    allowedRoles: ['admin']
  }
}
