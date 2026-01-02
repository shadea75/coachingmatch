// =====================
// SISTEMA SESSIONI E DISPONIBILITÀ
// =====================

// Giorni della settimana
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Domenica, 1 = Lunedì, etc.

export const DAYS_OF_WEEK: { [key: number]: string } = {
  0: 'Domenica',
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato'
}

export const DAYS_SHORT: { [key: number]: string } = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Gio',
  5: 'Ven',
  6: 'Sab'
}

// Slot orario
export interface TimeSlot {
  start: string // "09:00"
  end: string   // "10:00"
}

// Disponibilità giornaliera
export interface DailyAvailability {
  dayOfWeek: DayOfWeek
  enabled: boolean
  slots: TimeSlot[]
}

// Disponibilità settimanale del coach
export interface CoachAvailability {
  coachId: string
  timezone: string // "Europe/Rome"
  weeklySchedule: DailyAvailability[]
  sessionDurations: number[] // [30, 60, 90] minuti accettati
  bufferBetweenSessions: number // minuti tra sessioni (es. 15)
  advanceBookingDays: number // quanto in anticipo si può prenotare (es. 30)
  minimumNotice: number // ore minime di preavviso (es. 24)
  updatedAt: Date
}

// Eccezione (giorno non disponibile o extra disponibile)
export interface AvailabilityException {
  id: string
  coachId: string
  date: string // "2025-01-15"
  type: 'unavailable' | 'custom'
  slots?: TimeSlot[] // se type='custom', slot disponibili
  reason?: string // "Ferie", "Malattia", etc.
  createdAt: Date
}

// Stato sessione
export type SessionStatus = 
  | 'pending'     // In attesa di conferma coach
  | 'confirmed'   // Confermata
  | 'completed'   // Completata
  | 'cancelled'   // Annullata
  | 'no_show'     // Coachee non si è presentato
  | 'rescheduled' // Riprogrammata

// Sessione prenotata
export interface BookedSession {
  id: string
  
  // Parti coinvolte
  coachId: string
  coachName: string
  coachEmail: string
  coacheeId: string
  coacheeName: string
  coacheeEmail: string
  
  // Riferimenti
  offerId?: string
  packageId?: string
  transactionId?: string
  
  // Dettagli sessione
  scheduledAt: Date
  duration: number // minuti
  timezone: string
  
  // Meeting
  meetingUrl?: string
  meetingProvider?: 'zoom' | 'google_meet' | 'teams' | 'other'
  meetingNotes?: string
  
  // Stato
  status: SessionStatus
  
  // Conferma
  confirmedAt?: Date
  confirmedBy?: 'coach' | 'auto'
  
  // Cancellazione
  cancelledAt?: Date
  cancelledBy?: 'coach' | 'coachee' | 'system'
  cancellationReason?: string
  
  // Riprogrammazione
  rescheduledFrom?: Date
  rescheduledAt?: Date
  rescheduledBy?: 'coach' | 'coachee'
  
  // Completamento
  completedAt?: Date
  
  // Note
  coachNotes?: string // Note private del coach
  sessionSummary?: string // Riassunto post-sessione
  
  // Reminder inviati
  remindersSent: {
    '24h'?: boolean
    '1h'?: boolean
  }
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Slot disponibile per prenotazione
export interface AvailableSlot {
  date: string // "2025-01-15"
  dayOfWeek: DayOfWeek
  startTime: string // "09:00"
  endTime: string // "10:00"
  datetime: Date // Full datetime
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Genera orari disponibili (ogni 30 min dalle 8 alle 20)
 */
export function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let hour = 8; hour <= 20; hour++) {
    times.push(`${String(hour).padStart(2, '0')}:00`)
    if (hour < 20) {
      times.push(`${String(hour).padStart(2, '0')}:30`)
    }
  }
  return times
}

/**
 * Crea disponibilità di default (Lun-Ven 9-18)
 */
export function createDefaultAvailability(coachId: string): CoachAvailability {
  const defaultSlots: TimeSlot[] = [
    { start: '09:00', end: '13:00' },
    { start: '14:00', end: '18:00' }
  ]
  
  return {
    coachId,
    timezone: 'Europe/Rome',
    weeklySchedule: [
      { dayOfWeek: 0, enabled: false, slots: [] }, // Domenica
      { dayOfWeek: 1, enabled: true, slots: defaultSlots }, // Lunedì
      { dayOfWeek: 2, enabled: true, slots: defaultSlots }, // Martedì
      { dayOfWeek: 3, enabled: true, slots: defaultSlots }, // Mercoledì
      { dayOfWeek: 4, enabled: true, slots: defaultSlots }, // Giovedì
      { dayOfWeek: 5, enabled: true, slots: defaultSlots }, // Venerdì
      { dayOfWeek: 6, enabled: false, slots: [] }, // Sabato
    ],
    sessionDurations: [60],
    bufferBetweenSessions: 15,
    advanceBookingDays: 30,
    minimumNotice: 24,
    updatedAt: new Date()
  }
}

/**
 * Verifica se un orario è nel passato
 */
export function isTimeInPast(date: Date, time: string, timezone: string = 'Europe/Rome'): boolean {
  const [hours, minutes] = time.split(':').map(Number)
  const slotDate = new Date(date)
  slotDate.setHours(hours, minutes, 0, 0)
  return slotDate < new Date()
}

/**
 * Verifica se rispetta il preavviso minimo
 */
export function hasMinimumNotice(
  date: Date, 
  time: string, 
  minimumNoticeHours: number
): boolean {
  const [hours, minutes] = time.split(':').map(Number)
  const slotDate = new Date(date)
  slotDate.setHours(hours, minutes, 0, 0)
  
  const now = new Date()
  const diffMs = slotDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  
  return diffHours >= minimumNoticeHours
}

/**
 * Formatta data per display
 */
export function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

/**
 * Formatta orario per display
 */
export function formatSessionTime(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * Genera slot disponibili per una data
 */
export function generateAvailableSlots(
  date: Date,
  availability: CoachAvailability,
  bookedSessions: BookedSession[],
  duration: number = 60
): AvailableSlot[] {
  const dayOfWeek = date.getDay() as DayOfWeek
  const dailyAvailability = availability.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek)
  
  if (!dailyAvailability?.enabled || !dailyAvailability.slots.length) {
    return []
  }
  
  const slots: AvailableSlot[] = []
  const dateStr = date.toISOString().split('T')[0]
  
  // Per ogni fascia oraria del giorno
  for (const timeSlot of dailyAvailability.slots) {
    const [startHour, startMin] = timeSlot.start.split(':').map(Number)
    const [endHour, endMin] = timeSlot.end.split(':').map(Number)
    
    let currentHour = startHour
    let currentMin = startMin
    
    // Genera slot ogni 30 minuti
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`
      
      // Calcola end time
      let endSlotMin = currentMin + duration
      let endSlotHour = currentHour
      while (endSlotMin >= 60) {
        endSlotMin -= 60
        endSlotHour++
      }
      const endTime = `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`
      
      // Verifica che lo slot finisca entro la fascia
      if (endSlotHour > endHour || (endSlotHour === endHour && endSlotMin > endMin)) {
        break
      }
      
      // Verifica preavviso minimo
      if (!hasMinimumNotice(date, startTime, availability.minimumNotice)) {
        currentMin += 30
        if (currentMin >= 60) {
          currentMin -= 60
          currentHour++
        }
        continue
      }
      
      // Verifica conflitti con sessioni esistenti
      const slotDateTime = new Date(date)
      slotDateTime.setHours(currentHour, currentMin, 0, 0)
      
      const hasConflict = bookedSessions.some(session => {
        if (session.status === 'cancelled') return false
        const sessionDate = new Date(session.scheduledAt)
        const sessionEnd = new Date(sessionDate.getTime() + session.duration * 60000)
        const slotEnd = new Date(slotDateTime.getTime() + duration * 60000)
        
        // Buffer tra sessioni
        const bufferMs = availability.bufferBetweenSessions * 60000
        const sessionStartWithBuffer = new Date(sessionDate.getTime() - bufferMs)
        const sessionEndWithBuffer = new Date(sessionEnd.getTime() + bufferMs)
        
        return slotDateTime < sessionEndWithBuffer && slotEnd > sessionStartWithBuffer
      })
      
      if (!hasConflict) {
        slots.push({
          date: dateStr,
          dayOfWeek,
          startTime,
          endTime,
          datetime: slotDateTime
        })
      }
      
      // Prossimo slot (ogni 30 min)
      currentMin += 30
      if (currentMin >= 60) {
        currentMin -= 60
        currentHour++
      }
    }
  }
  
  return slots
}
