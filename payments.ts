// =====================
// SISTEMA OFFERTE E PAGAMENTI
// =====================

// Configurazione piattaforma
export const PLATFORM_CONFIG = {
  // Commissioni
  PLATFORM_FEE_PERCENTAGE: 30, // 30% a CoachaMi
  COACH_PERCENTAGE: 70, // 70% al coach
  
  // IVA
  VAT_RATE: 22, // 22%
  VAT_INCLUDED: true, // Prezzi IVA inclusa
  
  // Pagamenti
  COACH_PAYOUT_DELAY_DAYS: 7, // Pagamento coach dopo 7 giorni
  
  // Rimborsi
  REFUND_FULL_HOURS: 24, // Rimborso 100% se >24h
  REFUND_PARTIAL_HOURS: 0, // Nessun rimborso se <24h
  
  // Dati fatturazione CoachaMi
  COMPANY: {
    name: 'Debora Carofiglio',
    address: 'Strada Lungofino 187 Blocco H Modulo 14',
    city: '65013 Città Sant\'Angelo (PE)',
    country: 'Italia',
    vatNumber: 'IT02411430685',
    sdiCode: '6JXPS2J',
    pec: 'deboracarofiglio@pec-mail.it'
  }
} as const

// Stato offerta
export type OfferStatus = 
  | 'draft'      // Bozza (non inviata)
  | 'pending'    // In attesa di risposta coachee
  | 'accepted'   // Accettata, in attesa pagamento
  | 'paid'       // Pagata
  | 'rejected'   // Rifiutata dal coachee
  | 'expired'    // Scaduta senza risposta
  | 'cancelled'  // Annullata dal coach

// Tipo offerta
export type OfferType = 'single' | 'package'

// Offerta singola sessione o pacchetto
export interface Offer {
  id: string
  
  // Parti coinvolte
  coachId: string
  coachName: string
  coachEmail: string
  coacheeId: string
  coacheeName: string
  coacheeEmail: string
  
  // Dettagli offerta
  type: OfferType
  title: string
  description: string
  
  // Pricing (IVA inclusa)
  priceTotal: number // Prezzo totale IVA inclusa
  priceNet: number // Imponibile (priceTotal / 1.22)
  vatAmount: number // IVA (priceTotal - priceNet)
  
  // Commissioni calcolate
  platformFee: number // 30% di priceNet
  coachPayout: number // 70% di priceNet
  
  // Per pacchetti
  sessionsIncluded: number // Numero sessioni (1 per singola)
  sessionDuration: number // Durata in minuti (es. 60)
  
  // Validità
  validUntil: Date // Data scadenza offerta
  
  // Stato
  status: OfferStatus
  
  // Timeline
  createdAt: Date
  sentAt?: Date
  respondedAt?: Date
  paidAt?: Date
  
  // Pagamento
  stripePaymentIntentId?: string
  stripePaymentStatus?: string
  
  // Note
  coachNotes?: string // Note private del coach
  rejectionReason?: string // Motivo rifiuto
}

// Sessione prenotata
export type SessionStatus = 
  | 'scheduled'   // Programmata
  | 'completed'   // Completata
  | 'cancelled'   // Annullata
  | 'no_show'     // Coachee non si è presentato
  | 'rescheduled' // Riprogrammata

export interface Session {
  id: string
  
  // Riferimenti
  offerId: string
  coachId: string
  coacheeId: string
  packageId?: string // Se fa parte di un pacchetto
  
  // Dettagli
  scheduledAt: Date
  duration: number // minuti
  meetingUrl?: string // Link videochiamata
  
  // Stato
  status: SessionStatus
  
  // Cancellazione
  cancelledAt?: Date
  cancelledBy?: 'coach' | 'coachee'
  cancellationReason?: string
  refundAmount?: number
  refundStatus?: 'pending' | 'processed' | 'failed'
  
  // Completamento
  completedAt?: Date
  coacheeAttended?: boolean
  
  // Note
  coachNotes?: string
  coacheeNotes?: string
  
  // Timeline
  createdAt: Date
  updatedAt: Date
}

// Pacchetto acquistato (per tracking sessioni)
export interface PurchasedPackage {
  id: string
  offerId: string
  coachId: string
  coacheeId: string
  
  // Dettagli
  title: string
  totalSessions: number
  usedSessions: number
  remainingSessions: number
  sessionDuration: number
  
  // Validità
  purchasedAt: Date
  expiresAt?: Date // Opzionale scadenza pacchetto
  
  // Stato
  isActive: boolean
  completedAt?: Date
}

// Transazione/Pagamento
export type TransactionType = 
  | 'payment'     // Pagamento da coachee
  | 'payout'      // Pagamento a coach
  | 'refund'      // Rimborso a coachee
  | 'fee'         // Commissione piattaforma

export type TransactionStatus = 
  | 'pending'     // In attesa
  | 'processing'  // In elaborazione
  | 'completed'   // Completata
  | 'failed'      // Fallita
  | 'refunded'    // Rimborsata

export interface Transaction {
  id: string
  
  // Riferimenti
  offerId: string
  sessionId?: string
  coachId: string
  coacheeId: string
  
  // Tipo e stato
  type: TransactionType
  status: TransactionStatus
  
  // Importi
  amount: number // Importo lordo
  netAmount: number // Importo netto
  vatAmount: number // IVA
  platformFee: number // Commissione CoachaMi
  
  // Stripe
  stripePaymentIntentId?: string
  stripeTransferId?: string
  stripeRefundId?: string
  
  // Payout coach
  payoutScheduledAt?: Date // Quando sarà pagato il coach
  payoutCompletedAt?: Date
  
  // Timeline
  createdAt: Date
  updatedAt: Date
  
  // Fatturazione
  invoiceNumber?: string
  invoiceUrl?: string
}

// Coach Stripe Connect account
export interface CoachStripeAccount {
  coachId: string
  stripeAccountId: string
  
  // Stato onboarding
  onboardingComplete: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  
  // Dati
  businessType?: 'individual' | 'company'
  country: string
  
  // Timeline
  createdAt: Date
  updatedAt: Date
}

// Statistiche guadagni coach
export interface CoachEarnings {
  coachId: string
  
  // Totali
  totalEarnings: number // Guadagni totali
  totalPaid: number // Già pagato
  pendingPayout: number // In attesa di pagamento
  
  // Periodo corrente
  currentMonthEarnings: number
  currentMonthSessions: number
  
  // Storico
  lastPayoutAt?: Date
  lastPayoutAmount?: number
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Calcola i dettagli finanziari di un'offerta
 */
export function calculateOfferFinancials(priceWithVat: number): {
  priceTotal: number
  priceNet: number
  vatAmount: number
  platformFee: number
  coachPayout: number
} {
  const priceNet = priceWithVat / (1 + PLATFORM_CONFIG.VAT_RATE / 100)
  const vatAmount = priceWithVat - priceNet
  const platformFee = priceNet * (PLATFORM_CONFIG.PLATFORM_FEE_PERCENTAGE / 100)
  const coachPayout = priceNet * (PLATFORM_CONFIG.COACH_PERCENTAGE / 100)
  
  return {
    priceTotal: Math.round(priceWithVat * 100) / 100,
    priceNet: Math.round(priceNet * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    coachPayout: Math.round(coachPayout * 100) / 100
  }
}

/**
 * Calcola il rimborso in base alla policy
 */
export function calculateRefund(
  sessionDate: Date, 
  cancellationDate: Date,
  amount: number
): { refundAmount: number; refundPercentage: number } {
  const hoursUntilSession = (sessionDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60)
  
  if (hoursUntilSession >= PLATFORM_CONFIG.REFUND_FULL_HOURS) {
    return { refundAmount: amount, refundPercentage: 100 }
  }
  
  return { refundAmount: 0, refundPercentage: 0 }
}

/**
 * Calcola la data di payout al coach
 */
export function calculatePayoutDate(paymentDate: Date): Date {
  const payoutDate = new Date(paymentDate)
  payoutDate.setDate(payoutDate.getDate() + PLATFORM_CONFIG.COACH_PAYOUT_DELAY_DAYS)
  return payoutDate
}

/**
 * Formatta importo in euro
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

/**
 * Genera numero fattura
 */
export function generateInvoiceNumber(year: number, sequence: number): string {
  return `CM-${year}-${String(sequence).padStart(5, '0')}`
}
