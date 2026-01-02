// =====================
// AREE DELLA VITA
// =====================
export const LIFE_AREAS = [
  { id: 'salute', label: 'Salute e Vitalità', color: '#10B981', icon: 'Heart' },
  { id: 'finanze', label: 'Finanze', color: '#14B8A6', icon: 'Wallet' },
  { id: 'carriera', label: 'Carriera/Lavoro', color: '#6366F1', icon: 'Briefcase' },
  { id: 'relazioni', label: 'Relazioni', color: '#F59E0B', icon: 'Users' },
  { id: 'amore', label: 'Amore', color: '#EC4899', icon: 'HeartHandshake' },
  { id: 'crescita', label: 'Crescita Personale', color: '#8B5CF6', icon: 'TrendingUp' },
  { id: 'spiritualita', label: 'Spiritualità/Contributo', color: '#F97316', icon: 'Sparkles' },
  { id: 'divertimento', label: 'Divertimento', color: '#3B82F6', icon: 'Smile' },
] as const

export type LifeAreaId = typeof LIFE_AREAS[number]['id']

// =====================
// OBIETTIVI PER AREA
// =====================
export const OBJECTIVES_BY_AREA: Record<LifeAreaId, string[]> = {
  salute: [
    'Aumentare energia e vitalità quotidiana',
    'Costruire abitudini alimentari sane',
    'Migliorare la qualità del sonno',
    'Creare una routine di esercizio fisico',
    'Gestire lo stress e l\'ansia',
    'Perdere peso in modo sostenibile',
    'Superare un problema di salute',
    'Prevenire il burnout',
  ],
  finanze: [
    'Creare un piano finanziario solido',
    'Uscire dai debiti',
    'Aumentare le entrate',
    'Gestire meglio le spese',
    'Investire per il futuro',
    'Superare blocchi emotivi legati al denaro',
    'Costruire libertà finanziaria',
    'Risparmiare per obiettivi importanti',
  ],
  carriera: [
    'Fare chiarezza sulla direzione professionale',
    'Cambiare lavoro o settore',
    'Crescere nel ruolo attuale',
    'Lanciare un progetto imprenditoriale',
    'Migliorare leadership e decision making',
    'Gestire stress e pressione lavorativa',
    'Superare la sindrome dell\'impostore',
    'Negoziare stipendio o promozione',
  ],
  relazioni: [
    'Migliorare la comunicazione con gli altri',
    'Gestire conflitti relazionali',
    'Creare confini sani',
    'Rafforzare amicizie importanti',
    'Costruire nuove relazioni significative',
    'Migliorare i rapporti familiari',
    'Superare dinamiche tossiche',
    'Essere più presenti con i propri cari',
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
  crescita: [
    'Sviluppare autostima e fiducia in sé',
    'Superare paure e blocchi limitanti',
    'Imparare nuove competenze',
    'Sviluppare intelligenza emotiva',
    'Migliorare la gestione del tempo',
    'Costruire disciplina e costanza',
    'Espandere la zona di comfort',
    'Definire e raggiungere obiettivi ambiziosi',
  ],
  spiritualita: [
    'Scoprire la mia missione di vita',
    'Allineare vita e valori profondi',
    'Trovare significato nel quotidiano',
    'Contribuire alla comunità',
    'Praticare gratitudine e mindfulness',
    'Lasciare un impatto positivo',
    'Sviluppare una pratica spirituale',
    'Vivere con più intenzionalità',
  ],
  divertimento: [
    'Riscoprire hobby e passioni',
    'Creare più momenti di gioia',
    'Bilanciare lavoro e tempo libero',
    'Viaggiare e fare nuove esperienze',
    'Coltivare la creatività',
    'Ridurre lo stress attraverso il gioco',
    'Costruire ricordi memorabili',
    'Imparare a rilassarsi e godersi la vita',
  ],
}

// =====================
// UTENTE / COACHEE
// =====================
export type UserRole = 'admin' | 'moderator' | 'coach' | 'coachee'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  photo?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  
  // Dati anagrafici
  age?: number | null
  gender?: 'M' | 'F' | 'other' | 'prefer_not' | null
  codiceFiscale?: string | null
  
  // Profilo coachee
  areaScores?: Record<LifeAreaId, number>
  selectedObjectives?: Record<LifeAreaId, string[]>
  onboardingCompleted?: boolean
  
  // Membership
  membershipStatus?: 'free' | 'active' | 'cancelled'
  membershipStartDate?: Date
  membershipEndDate?: Date
  stripeCustomerId?: string
  
  // Status account
  isSuspended?: boolean
  suspendedAt?: Date
  suspendedReason?: string
}

// =====================
// COACH
// =====================
export type CoachStatus = 'pending' | 'reviewing' | 'interview_scheduled' | 'interview_completed' | 'approved' | 'rejected' | 'suspended'

export interface Coach {
  id: string
  userId: string
  
  // Info base
  name: string
  email: string
  phone?: string
  photo?: string
  bio: string
  
  // Credenziali
  certifications: Certification[]
  yearsOfExperience: number
  coachingSchool: string
  languages: string[]
  
  // Modalità
  sessionMode: ('online' | 'presence')[]
  location?: string
  averagePrice: number
  typicalSessionCount: string // "6-8 sessioni", "10-12 sessioni", etc.
  freeCallAvailable: boolean
  
  // Specializzazioni (max 3 aree!)
  specializations: {
    lifeAreas: LifeAreaId[] // MAX 3
    focusTopics: string[] // Argomenti specifici per area
    targetClients: string[] // "Manager", "Imprenditori", "Genitori", etc.
    coachingMethod: string // Descrizione approccio
  }
  
  // Disponibilità
  availability: WeeklyAvailability
  
  // Status candidatura
  status: CoachStatus
  applicationDate: Date
  reviewNotes?: string
  interviewDate?: Date
  interviewNotes?: string
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
  
  // Commissioni piattaforma
  platformFeePercentage: number
  
  // Stats (dopo approvazione)
  totalClients: number
  totalSessions: number
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
  type: 'icf' | 'aicp' | 'other'
  level?: string // ACC, PCC, MCC per ICF
  documentUrl?: string
  verified: boolean
}

// =====================
// CANDIDATURA COACH
// =====================
export interface CoachApplication {
  id: string
  
  // Step 1: Dati personali
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    city: string
    onlineAvailable: boolean
    inPersonAvailable: boolean
    photo?: string
    linkedinUrl?: string
    websiteUrl?: string
  }
  
  // Step 2: Esperienza e formazione
  experience: {
    yearsAsCoach: number
    coachingSchool: string
    mainCertification: string
    certificationLevel?: string
    otherCertifications: string[]
    totalClientCount: string // "1-10", "11-50", "51-100", "100+"
    languages: string[]
  }
  
  // Step 3: Specializzazioni (max 3 aree)
  specializations: {
    lifeAreas: LifeAreaId[] // MAX 3!
    focusTopics: Record<LifeAreaId, string[]> // Per ogni area, quali argomenti
    targetClients: string[]
    coachingApproach: string // Testo libero
  }
  
  // Step 4: Dettagli servizio
  serviceDetails: {
    sessionPrice: number
    typicalSessionCount: string
    freeCallOffered: boolean
    freeCallDuration: number
    bio: string // Max 500 caratteri
  }
  
  // Step 5: Documenti
  documents: {
    mainCertificateUrl: string
    cvUrl?: string
    otherDocumentsUrls: string[]
    acceptedTerms: boolean
    acceptedPrivacy: boolean
  }
  
  // Metadata
  status: CoachStatus
  currentStep: 1 | 2 | 3 | 4 | 5 | 'completed'
  submittedAt?: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewNotes?: string
  interviewScheduledAt?: Date
  interviewCompletedAt?: Date
  interviewNotes?: string
  
  createdAt: Date
  updatedAt: Date
}

// Focus topics per area (suggerimenti nel form)
export const FOCUS_TOPICS_BY_AREA: Record<LifeAreaId, string[]> = {
  salute: [
    'Gestione stress',
    'Energia e vitalità',
    'Sonno e recupero',
    'Alimentazione consapevole',
    'Movimento e fitness',
    'Prevenzione burnout',
    'Perdita di peso',
    'Gestione ansia',
  ],
  finanze: [
    'Mindset finanziario',
    'Pianificazione economica',
    'Uscire dai debiti',
    'Negoziazione stipendio',
    'Libertà finanziaria',
    'Rapporto emotivo col denaro',
    'Investimenti personali',
    'Gestione budget',
  ],
  carriera: [
    'Cambio carriera',
    'Leadership',
    'Gestione team',
    'Imprenditoria',
    'Work-life balance',
    'Burnout professionale',
    'Negoziazione',
    'Public speaking',
    'Sindrome dell\'impostore',
    'Primo lavoro / Entry level',
  ],
  relazioni: [
    'Comunicazione efficace',
    'Gestione conflitti',
    'Confini sani',
    'Amicizie significative',
    'Rapporti familiari',
    'Networking professionale',
    'Solitudine e isolamento',
    'Relazioni tossiche',
  ],
  amore: [
    'Trovare partner',
    'Migliorare relazione',
    'Comunicazione di coppia',
    'Superare rotture',
    'Intimità e connessione',
    'Relazioni a distanza',
    'Problemi di fiducia',
    'Prepararsi al matrimonio',
  ],
  crescita: [
    'Autostima',
    'Sindrome dell\'impostore',
    'Assertività',
    'Gestire paure',
    'Prendere decisioni',
    'Dire di no',
    'Accettazione di sé',
    'Gestione tempo',
    'Procrastinazione',
    'Obiettivi ambiziosi',
  ],
  spiritualita: [
    'Scoprire la missione',
    'Crisi di mezza età',
    'Transizioni di vita',
    'Allineamento valori',
    'Lasciare un\'eredità',
    'Mindfulness e meditazione',
    'Volontariato e impatto',
    'Gratitudine',
  ],
  divertimento: [
    'Riscoprire passioni',
    'Hobby e creatività',
    'Viaggi e avventure',
    'Equilibrio vita-lavoro',
    'Riduzione stress',
    'Socializzazione',
    'Nuove esperienze',
    'Rilassamento',
  ],
}

// Target clients suggeriti
export const TARGET_CLIENTS_OPTIONS = [
  'Manager e dirigenti',
  'Imprenditori e startup founder',
  'Professionisti',
  'Freelance e creativi',
  'Donne in carriera',
  'Genitori',
  'Millennials e Gen Z',
  'Over 50 in transizione',
  'Studenti universitari',
  'Neo-laureati',
  'Persone in burnout',
  'Chi cerca cambio vita',
]

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
export interface CoachaMi {
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
