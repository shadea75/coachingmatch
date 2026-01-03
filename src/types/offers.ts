// types/offers.ts - Tipi per il sistema di offerte

export type OfferStatus = 
  | 'draft'           // Bozza (non inviata)
  | 'pending'         // Inviata, in attesa di risposta coachee
  | 'accepted'        // Accettata dal coachee
  | 'rejected'        // Rifiutata dal coachee
  | 'expired'         // Scaduta senza risposta
  | 'active'          // Attiva (almeno una rata pagata)
  | 'completed'       // Tutte le sessioni completate
  | 'cancelled'       // Annullata

export type PaymentStatus = 
  | 'pending'         // In attesa di pagamento
  | 'paid'            // Pagata
  | 'failed'          // Pagamento fallito
  | 'refunded'        // Rimborsata

export interface OfferInstallment {
  id: string
  offererId: string
  sessionNumber: number        // Numero sessione (1, 2, 3...)
  amount: number               // Importo rata (IVA inclusa)
  amountNet: number            // Importo netto (senza IVA)
  vatAmount: number            // IVA
  platformFee: number          // Commissione piattaforma
  coachPayout: number          // Guadagno coach
  status: PaymentStatus
  dueDate?: Date               // Data scadenza pagamento
  paidAt?: Date                // Data pagamento
  stripePaymentIntentId?: string
  stripeInvoiceId?: string
  sessionId?: string           // ID sessione collegata (dopo pagamento)
}

export interface Offer {
  id: string
  
  // Coach
  coachId: string
  coachName: string
  coachEmail: string
  coachPhoto?: string
  coachStripeAccountId?: string
  
  // Coachee
  coacheeId: string
  coacheeName: string
  coacheeEmail: string
  coacheePhoto?: string
  
  // Dettagli offerta
  title: string
  description?: string
  
  // Sessioni
  totalSessions: number        // Numero totale sessioni
  sessionDuration: number      // Durata sessione in minuti
  completedSessions: number    // Sessioni completate
  
  // Pricing
  priceTotal: number           // Prezzo totale IVA inclusa
  pricePerSession: number      // Prezzo per sessione IVA inclusa
  priceNet: number             // Imponibile totale
  vatAmount: number            // IVA totale (22%)
  platformFeeTotal: number     // Commissione piattaforma totale (30%)
  coachPayoutTotal: number     // Guadagno coach totale
  
  // Rate
  installments: OfferInstallment[]
  paidInstallments: number     // Numero rate pagate
  
  // Stato
  status: OfferStatus
  
  // Date
  createdAt: Date
  sentAt?: Date
  respondedAt?: Date
  validUntil: Date             // Scadenza offerta
  
  // Note
  coachNotes?: string          // Note private del coach
  coacheeNotes?: string        // Note del coachee (motivo rifiuto, etc.)
}

export interface Session {
  id: string
  offerId: string
  installmentId: string
  
  // Parti
  coachId: string
  coachName: string
  coacheeId: string
  coacheeName: string
  
  // Dettagli
  sessionNumber: number
  duration: number
  
  // Scheduling
  scheduledAt?: Date
  completedAt?: Date
  
  // Stato
  status: 'pending_payment' | 'pending_schedule' | 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  
  // Meeting
  meetingUrl?: string
  meetingNotes?: string
  
  // Timestamp
  createdAt: Date
  updatedAt: Date
}

// Configurazione piattaforma
export const PLATFORM_CONFIG = {
  platformFeePercent: 30,      // 30% commissione piattaforma
  vatPercent: 22,              // 22% IVA
  minPrice: 30,                // Prezzo minimo per sessione
  maxSessions: 20,             // Massimo sessioni per offerta
  offerValidDays: 7,           // Giorni validità offerta default
}

// Funzione per calcolare i prezzi
export function calculateOfferPricing(priceTotal: number, totalSessions: number) {
  const pricePerSession = priceTotal / totalSessions
  
  // Prezzo netto (scorporo IVA)
  const priceNet = priceTotal / (1 + PLATFORM_CONFIG.vatPercent / 100)
  const vatAmount = priceTotal - priceNet
  
  // Commissione piattaforma (sul netto)
  const platformFeeTotal = priceNet * (PLATFORM_CONFIG.platformFeePercent / 100)
  
  // Guadagno coach
  const coachPayoutTotal = priceNet - platformFeeTotal
  
  // Per singola rata
  const installmentAmount = pricePerSession
  const installmentNet = priceNet / totalSessions
  const installmentVat = vatAmount / totalSessions
  const installmentPlatformFee = platformFeeTotal / totalSessions
  const installmentCoachPayout = coachPayoutTotal / totalSessions
  
  return {
    priceTotal,
    pricePerSession: Math.round(pricePerSession * 100) / 100,
    priceNet: Math.round(priceNet * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    platformFeeTotal: Math.round(platformFeeTotal * 100) / 100,
    coachPayoutTotal: Math.round(coachPayoutTotal * 100) / 100,
    
    // Per rata
    installment: {
      amount: Math.round(installmentAmount * 100) / 100,
      amountNet: Math.round(installmentNet * 100) / 100,
      vatAmount: Math.round(installmentVat * 100) / 100,
      platformFee: Math.round(installmentPlatformFee * 100) / 100,
      coachPayout: Math.round(installmentCoachPayout * 100) / 100,
    }
  }
}

// Formatta valuta
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}
