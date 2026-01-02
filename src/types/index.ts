// =====================
// AREE DELLA VITA
// =====================
export const LIFE_AREAS = [
  { id: 'carriera', label: 'Carriera', color: '#6366F1', icon: 'Briefcase' },
  { id: 'benessere', label: 'Benessere e Self Care', color: '#10B981', icon: 'Heart' },
  { id: 'famiglia', label: 'Famiglia e Amici', color: '#F59E0B', icon: 'Users' },
  { id: 'denaro', label: 'Denaro', color: '#14B8A6', icon: 'Wallet' },
  { id: 'amore', label: 'Amore', color: '#EC4899', icon: 'HeartHandshake' },
  { id: 'fiducia', label: 'Fiducia in sé e Autostima', color: '#8B5CF6', icon: 'Shield' },
  { id: 'scopo', label: 'Scopo e Realizzazione', color: '#F97316', icon: 'Target' },
  { id: 'focus', label: 'Focus e Produttività', color: '#3B82F6', icon: 'Zap' },
] as const

export type LifeAreaId = typeof LIFE_AREAS[number]['id']

// =====================
// OBIETTIVI PER AREA
// =====================
export const OBJECTIVES_BY_AREA: Record<LifeAreaId, string[]> = {
  carriera: [
    'Fare chiarezza sulla direzione professionale',
    'Cambiare lavoro',
    'Crescere nel ruolo attuale',
    'Lanciare un progetto imprenditoriale',
    'Migliorare leadership e decision making',
    'Gestire stress e pressione lavorativa',
    'Superare blocchi di fiducia e sindrome dell\'impostore',
    'Negoziare stipendio o promozione',
  ],
  benessere: [
    'Creare routine di self-care sostenibili',
    'Gestire ansia e stress',
    'Migliorare il sonno',
    'Trovare equilibrio vita-lavoro',
    'Costruire abitudini salutari',
    'Praticare mindfulness e presenza',
    'Gestire il burnout',
    'Aumentare energia e vitalità',
  ],
  famiglia: [
    'Migliorare la comunicazione familiare',
    'Gestire conflitti relazionali',
    'Creare confini sani',
    'Rafforzare amicizie importanti',
    'Bilanciare tempo per famiglia e sé stessi',
    'Superare dinamiche familiari tossiche',
    'Costruire nuove relazioni significative',
    'Essere più presenti con i propri cari',
  ],
  denaro: [
    'Creare un piano finanziario',
    'Uscire dai debiti',
    'Aumentare le entrate',
    'Gestire meglio le spese',
    'Investire per il futuro',
    'Superare blocchi emotivi legati al denaro',
    'Negoziare con sicurezza',
    'Costruire libertà finanziaria',
  ],
  amore: [
    'Trovare un partner compatibile',
    'Migliorare la relazione attuale',
    'Superare una rottura o un divorzio',
    'Comunicare meglio con il partner',
    'Costruire intimità e connessione',
    'Gestire paure e insicurezze in amore',
    'Definire cosa cerco in una relazione',
    'Ritrovare passione nella coppia',
  ],
  fiducia: [
    'Sviluppare autostima solida',
    'Superare la sindrome dell\'impostore',
    'Imparare a dire di no',
    'Gestire il giudizio degli altri',
    'Celebrare i propri successi',
    'Superare insicurezze profonde',
    'Parlare in pubblico con sicurezza',
    'Fidarsi delle proprie decisioni',
  ],
  scopo: [
    'Scoprire la mia missione di vita',
    'Allineare vita e valori profondi',
    'Trovare significato nel quotidiano',
    'Superare una crisi esistenziale',
    'Definire un progetto di vita',
    'Lasciare un impatto positivo',
    'Riscoprire passioni sopite',
    'Vivere con più intenzionalità',
  ],
  focus: [
    'Eliminare distrazioni',
    'Gestire il tempo efficacemente',
    'Completare progetti importanti',
    'Superare la procrastinazione',
    'Creare sistemi di produttività',
    'Mantenere la concentrazione',
    'Bilanciare più responsabilità',
    'Raggiungere obiettivi ambiziosi',
  ],
}

// =====================
// UTENTE / COACHEE
// =====================
export interface User {
  id: string
  email: string
  name: string
  role: 'coachee' | 'coach' | 'admin'
  createdAt: Date
  updatedAt: Date
  
  // Profilo coachee
  areaScores?: Record<LifeAreaId, number>
  selectedObjectives?: Record<LifeAreaId, string[]>
  onboardingCompleted?: boolean
  
  // Membership
  membershipStatus?: 'free' | 'active' | 'cancelled'
  membershipStartDate?: Date
  membershipEndDate?: Date
  stripeCustomerId?: string
}

// =====================
// COACH
// =====================
export interface Coach {
  id: string
  userId: string
  
  // Info base
  name: string
  email: string
  photo?: string
  bio: string
  
  // Credenziali
  certifications: Certification[]
  yearsOfExperience: number
  languages: string[]
  
  // Modalità
  sessionMode: ('online' | 'presence')[]
  location?: string
  averagePrice: number
  freeCallAvailable: boolean
  
  // Specializzazioni (per matching)
  specializations: {
    lifeAreas: LifeAreaId[]
    clientTypes: string[]
    problemsAddressed: string[]
    coachingMethod: string[]
    style: ('diretto' | 'empatico' | 'strutturato' | 'esplorativo')[]
  }
  
  // Disponibilità
  availability: WeeklyAvailability
  
  // Status
  status: 'pending' | 'approved' | 'suspended'
  platformFeePercentage: number
  
  // Stats
  totalClients: number
  totalRevenue: number
  rating: number
  reviewCount: number
  
  createdAt: Date
  updatedAt: Date
}

export interface Certification {
  name: string
  institution: string
  year: number
  documentUrl?: string
}

export interface WeeklyAvailability {
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
  sunday: TimeSlot[]
}

export interface TimeSlot {
  start: string // "09:00"
  end: string   // "10:00"
}

// =====================
// MATCHING & CALL
// =====================
export interface CoachMatch {
  coach: Coach
  score: number
  matchReasons: string[]
}

export interface BookedCall {
  id: string
  coacheeId: string
  coachId: string
  
  type: 'free_orientation' | 'paid_session'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  
  scheduledAt: Date
  duration: number // minuti
  
  meetingUrl?: string
  notes?: string
  
  // Per sessioni a pagamento
  price?: number
  paymentStatus?: 'pending' | 'paid' | 'refunded'
  stripePaymentId?: string
  
  createdAt: Date
  updatedAt: Date
}

// =====================
// COMMUNITY
// =====================
export interface CommunityChannel {
  id: string
  name: string
  description: string
  lifeArea?: LifeAreaId
  type: 'general' | 'area' | 'event' | 'exclusive'
  membersOnly: boolean
}

export interface CommunityPost {
  id: string
  channelId: string
  authorId: string
  authorName: string
  authorPhoto?: string
  authorRole: 'coachee' | 'coach' | 'admin'
  
  content: string
  type: 'discussion' | 'question' | 'event' | 'resource'
  
  likes: number
  commentsCount: number
  
  isPinned: boolean
  
  createdAt: Date
  updatedAt: Date
}

export interface WeeklyQuestion {
  id: string
  channelId: string
  question: string
  description?: string
  activeFrom: Date
  activeTo: Date
}

// =====================
// ADMIN
// =====================
export interface PlatformMetrics {
  totalUsers: number
  totalCoaches: number
  totalCalls: number
  conversionRate: number
  totalRevenue: number
  platformFees: number
  activeMembers: number
}

// =====================
// ONBOARDING STATE
// =====================
export interface OnboardingState {
  currentStep: 'areas' | 'objectives' | 'registration' | 'results' | 'matching'
  currentAreaIndex: number
  areaScores: Partial<Record<LifeAreaId, number>>
  selectedObjectives: Partial<Record<LifeAreaId, string[]>>
  areasToImprove: LifeAreaId[]
}
