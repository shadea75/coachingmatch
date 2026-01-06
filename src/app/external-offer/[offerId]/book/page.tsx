'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  User
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { format, addDays, startOfWeek, isSameDay, isBefore, isAfter, setHours, setMinutes } from 'date-fns'
import { it } from 'date-fns/locale'

interface TimeSlot {
  time: string
  available: boolean
}

interface BlockedDate {
  date: Date
  reason?: string
}

export default function ExternalBookingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  
  const offerId = params.offerId as string
  const sessionNumber = searchParams.get('session') ? parseInt(searchParams.get('session')!) : 1
  
  const [isLoading, setIsLoading] = useState(true)
  const [offer, setOffer] = useState<any>(null)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [availability, setAvailability] = useState<Record<string, string[]>>({})
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [existingBookings, setExistingBookings] = useState<Date[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)

  // Carica offerta e disponibilità coach
  useEffect(() => {
    const loadData = async () => {
      if (!offerId) return
      
      setIsLoading(true)
      try {
        // Carica offerta
        const offerDoc = await getDoc(doc(db, 'externalOffers', offerId))
        if (!offerDoc.exists()) {
          setError('Offerta non trovata')
          return
        }
        
        const offerData = offerDoc.data()
        setOffer(offerData)
        
        // Carica disponibilità coach
        const availDoc = await getDoc(doc(db, 'coachAvailability', offerData.coachId))
        
        if (availDoc.exists()) {
          const availData = availDoc.data()
          // weeklySlots usa chiavi numeriche: 0=Dom, 1=Lun, 2=Mar, etc.
          setAvailability(availData.weeklySlots || availData.slots || {})
        }
        
        // Carica date bloccate
        const blockedQuery = query(
          collection(db, 'coachBlockedDates'),
          where('coachId', '==', offerData.coachId)
        )
        const blockedSnap = await getDocs(blockedQuery)
        const blocked: BlockedDate[] = []
        blockedSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.date) {
            blocked.push({
              date: data.date.toDate(),
              reason: data.reason
            })
          }
        })
        setBlockedDates(blocked)
        
        // Carica prenotazioni esistenti
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', offerData.coachId),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        const bookings: Date[] = []
        sessionsSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.scheduledAt) {
            bookings.push(data.scheduledAt.toDate())
          }
        })
        
        // Carica anche sessioni esterne
        const extSessionsQuery = query(
          collection(db, 'externalSessions'),
          where('coachId', '==', offerData.coachId),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const extSessionsSnap = await getDocs(extSessionsQuery)
        extSessionsSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.scheduledAt) {
            bookings.push(data.scheduledAt.toDate())
          }
        })
        
        setExistingBookings(bookings)
        
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [offerId])

  // Genera giorni della settimana
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  // Check se una data ha disponibilità configurata
  const hasAvailability = (date: Date): boolean => {
    const dayNum = date.getDay()
    const slots = availability[dayNum] || availability[dayNum.toString()] || []
    return slots.length > 0
  }

  // Check se una data è bloccata
  const isDateBlocked = (date: Date) => {
    return blockedDates.some(b => isSameDay(b.date, date))
  }

  // Check se un orario è già prenotato
  const isTimeBooked = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const dateTime = setMinutes(setHours(date, hours), minutes)
    
    return existingBookings.some(booking => {
      const diff = Math.abs(booking.getTime() - dateTime.getTime())
      return diff < (offer?.sessionDuration || 60) * 60 * 1000
    })
  }

  // Ottieni slot disponibili per una data
  const getAvailableSlots = (date: Date): TimeSlot[] => {
    // weeklySlots usa chiavi numeriche: 0=Dom, 1=Lun, 2=Mar, etc.
    const dayNum = date.getDay()
    const slots = availability[dayNum] || availability[dayNum.toString()] || []
    
    return slots.map(time => ({
      time,
      available: !isTimeBooked(date, time)
    }))
  }

  // Prenotazione sessione
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !offer) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes)
      
      // Crea sessione esterna
      await addDoc(collection(db, 'externalSessions'), {
        coachId: offer.coachId,
        coachName: offer.coachName,
        coachEmail: offer.coachEmail,
        clientId: offer.clientId,
        clientName: offer.clientName,
        clientEmail: offer.clientEmail,
        offerId: offerId,
        offerTitle: offer.title,
        sessionNumber,
        totalSessions: offer.totalSessions,
        scheduledAt,
        duration: offer.sessionDuration,
        status: 'pending',
        type: 'external_paid_session',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Invia email di notifica al coach
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'external_booking_pending',
            data: {
              coachEmail: offer.coachEmail,
              coachName: offer.coachName,
              clientName: offer.clientName,
              clientEmail: offer.clientEmail,
              offerTitle: offer.title,
              sessionNumber,
              totalSessions: offer.totalSessions,
              date: format(scheduledAt, "EEEE d MMMM yyyy", { locale: it }),
              time: selectedTime,
              duration: offer.sessionDuration
            }
          })
        })
      } catch (e) {
        console.error('Errore invio email:', e)
      }
      
      setBookingComplete(true)
      
    } catch (err) {
      console.error('Errore prenotazione:', err)
      setError('Errore durante la prenotazione')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold text-charcoal mb-2">Errore</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-4 flex justify-center">
            <Logo size="sm" />
          </div>
        </header>
        
        <main className="max-w-lg mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-sm text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-500" size={40} />
            </div>
            
            <h1 className="text-2xl font-bold text-charcoal mb-2">
              Prenotazione inviata!
            </h1>
            
            <p className="text-gray-500 mb-6">
              {offer?.coachName} riceverà la tua richiesta e ti confermerà l'appuntamento.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-medium text-charcoal mb-2">{offer?.title}</h3>
              <p className="text-sm text-gray-500">Sessione {sessionNumber}/{offer?.totalSessions}</p>
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="text-primary-500" size={16} />
                  <span>{selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="text-primary-500" size={16} />
                  <span>{selectedTime} ({offer?.sessionDuration} min)</span>
                </div>
              </div>
            </div>
            
            <Link
              href={`/external-offer/${offerId}`}
              className="w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              Torna all'offerta
            </Link>
          </motion.div>
        </main>
      </div>
    )
  }

  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : []

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/external-offer/${offerId}`} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-semibold text-charcoal">Prenota Sessione {sessionNumber}</h1>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Info Offerta */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="text-primary-600" size={24} />
          </div>
          <div>
            <p className="font-medium text-charcoal">{offer?.coachName}</p>
            <p className="text-sm text-gray-500">{offer?.title} • {offer?.sessionDuration} min</p>
          </div>
        </div>

        {/* Calendario */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal flex items-center gap-2">
              <Calendar className="text-primary-500" size={20} />
              Scegli data
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs text-gray-400 py-2">
                {day}
              </div>
            ))}
            
            {weekDays.map(day => {
              const dayNum = day.getDay()
              const hasSlots = hasAvailability(day)
              const isBlocked = isDateBlocked(day)
              const isPast = isBefore(day, new Date()) && !isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isDisabled = isPast || isBlocked || !hasSlots
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isDisabled && setSelectedDate(day)}
                  disabled={isDisabled}
                  className={`py-3 rounded-xl text-center transition-all ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : isDisabled
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-50 hover:bg-primary-50 text-charcoal'
                  }`}
                >
                  <span className="text-xs block">{format(day, 'MMM', { locale: it })}</span>
                  <span className="text-lg font-semibold">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Orari */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Clock className="text-primary-500" size={20} />
              Scegli orario - {format(selectedDate, "EEEE d MMMM", { locale: it })}
            </h2>
            
            {availableSlots.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nessun orario disponibile per questa data
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      selectedTime === slot.time
                        ? 'bg-primary-500 text-white'
                        : slot.available
                          ? 'bg-gray-50 hover:bg-primary-50 text-charcoal'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Pulsante Conferma */}
        {selectedDate && selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error && (
              <div className="bg-red-50 rounded-xl p-4 mb-4 flex items-center gap-3 text-red-600">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
            
            <button
              onClick={handleBooking}
              disabled={isSubmitting}
              className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Prenotazione in corso...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Conferma prenotazione
                </>
              )}
            </button>
          </motion.div>
        )}
      </main>
    </div>
  )
}
