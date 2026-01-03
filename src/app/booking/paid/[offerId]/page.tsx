'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Video, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  Sparkles,
  CreditCard
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore'

function BookingPaidContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const offerId = params.offerId as string
  const sessionNumber = parseInt(searchParams.get('session') || '1')
  
  // Stati
  const [offer, setOffer] = useState<any>(null)
  const [coach, setCoach] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Stati calendario
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookedSlots, setBookedSlots] = useState<{date: string, time: string}[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [manualEvents, setManualEvents] = useState<{date: string, startTime: string, endTime: string}[]>([])
  
  // Stati conferma
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  // Carica dati
  useEffect(() => {
    const loadData = async () => {
      if (!offerId || !user?.id) return
      
      setIsLoading(true)
      try {
        // Carica offerta
        const offerDoc = await getDoc(doc(db, 'offers', offerId))
        if (!offerDoc.exists()) {
          setError('Offerta non trovata')
          setIsLoading(false)
          return
        }
        
        const offerData = offerDoc.data()
        
        // Verifica che l'utente sia il proprietario
        if (offerData.coacheeId !== user.id) {
          setError('Non autorizzato')
          setIsLoading(false)
          return
        }
        
        // Verifica che la sessione sia pagata
        const installment = offerData.installments?.find((i: any) => i.sessionNumber === sessionNumber)
        if (!installment || installment.status !== 'paid') {
          setError('Questa sessione non è ancora stata pagata')
          setIsLoading(false)
          return
        }
        
        // Verifica che non sia già prenotata
        const existingSessionQuery = query(
          collection(db, 'sessions'),
          where('offerId', '==', offerId),
          where('sessionNumber', '==', sessionNumber),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const existingSnap = await getDocs(existingSessionQuery)
        if (!existingSnap.empty) {
          setError('Questa sessione è già stata prenotata')
          setIsLoading(false)
          return
        }
        
        setOffer({ id: offerDoc.id, ...offerData })
        
        // Carica dati coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', offerData.coachId))
        if (coachDoc.exists()) {
          const coachData = coachDoc.data()
          
          const defaultAvailability: Record<number, string[]> = {
            1: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            2: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            3: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            4: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            5: ['09:00', '10:00', '11:00', '12:00', '13:00'],
          }
          
          setCoach({
            id: coachDoc.id,
            name: coachData.name || offerData.coachName,
            email: coachData.email || offerData.coachEmail,
            availability: coachData.availability || defaultAvailability
          })
          
          // Carica slot prenotati
          const sessionsQuery = query(
            collection(db, 'sessions'),
            where('coachId', '==', offerData.coachId),
            where('status', 'in', ['pending', 'confirmed'])
          )
          const sessionsSnap = await getDocs(sessionsQuery)
          const booked = sessionsSnap.docs.map(doc => {
            const data = doc.data()
            const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt)
            return {
              date: format(scheduledAt, 'yyyy-MM-dd'),
              time: format(scheduledAt, 'HH:mm')
            }
          })
          setBookedSlots(booked)
          
          // Carica date bloccate
          const blockedQuery = query(
            collection(db, 'coachBlockedDates'),
            where('coachId', '==', offerData.coachId)
          )
          const blockedSnap = await getDocs(blockedQuery)
          const blocked = blockedSnap.docs.map(doc => {
            const data = doc.data()
            const date = data.date?.toDate?.() || new Date(data.date)
            return format(date, 'yyyy-MM-dd')
          })
          setBlockedDates(blocked)
          
          // Carica impegni manuali
          const eventsQuery = query(
            collection(db, 'coachEvents'),
            where('coachId', '==', offerData.coachId)
          )
          const eventsSnap = await getDocs(eventsQuery)
          const events = eventsSnap.docs.map(doc => {
            const data = doc.data()
            const date = data.date?.toDate?.() || new Date(data.date)
            return {
              date: format(date, 'yyyy-MM-dd'),
              startTime: data.startTime,
              endTime: data.endTime
            }
          })
          setManualEvents(events)
        }
        
        setIsLoading(false)
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [offerId, sessionNumber, user?.id])

  // Genera giorni della settimana
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  
  // Navigazione settimane
  const goToPreviousWeek = () => {
    const newStart = addDays(currentWeekStart, -7)
    if (!isBefore(newStart, startOfWeek(new Date(), { weekStartsOn: 1 }))) {
      setCurrentWeekStart(newStart)
    }
  }
  
  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7))
  }
  
  // Controlla se una data è passata
  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }
  
  // Controlla se un giorno ha disponibilità
  const hasAvailability = (date: Date) => {
    if (!coach?.availability) return false
    const dayOfWeek = date.getDay()
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    return (coach.availability[adjustedDay]?.length || 0) > 0
  }
  
  // Controlla se una data è bloccata
  const isDateBlocked = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return blockedDates.includes(dateStr)
  }

  // Ottieni slot disponibili
  const getAvailableSlots = () => {
    if (!selectedDate || !coach?.availability) return []
    
    const dayOfWeek = selectedDate.getDay()
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    const daySlots = coach.availability[adjustedDay] || []
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    const availableSlots = daySlots.filter((time: string) => {
      const isBooked = bookedSlots.some(
        slot => slot.date === dateStr && slot.time === time
      )
      
      const isBlocked = manualEvents.some(event => {
        if (event.date !== dateStr) return false
        const slotMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])
        const startMinutes = parseInt(event.startTime.split(':')[0]) * 60 + parseInt(event.startTime.split(':')[1])
        const endMinutes = parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1])
        return slotMinutes >= startMinutes && slotMinutes < endMinutes
      })
      
      if (isToday(selectedDate)) {
        const now = new Date()
        const [hours, minutes] = time.split(':').map(Number)
        const slotTime = new Date()
        slotTime.setHours(hours, minutes, 0, 0)
        if (slotTime <= now) return false
      }
      
      return !isBooked && !isBlocked
    })
    
    return availableSlots
  }
  
  const availableSlots = getAvailableSlots()

  // Conferma prenotazione
  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !user || !offer || !coach) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const scheduledAt = new Date(selectedDate)
      scheduledAt.setHours(hours, minutes, 0, 0)
      
      // Crea la sessione
      const sessionData = {
        coachId: offer.coachId,
        coachName: coach.name,
        coachEmail: coach.email,
        coacheeId: user.id,
        coacheeName: user.name || offer.coacheeName,
        coacheeEmail: user.email || offer.coacheeEmail,
        offerId: offer.id,
        offerTitle: offer.title,
        sessionNumber: sessionNumber,
        totalSessions: offer.totalSessions,
        type: 'paid_session',
        status: 'pending',
        scheduledAt,
        duration: offer.sessionDuration || 60,
        price: offer.pricePerSession,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      await addDoc(collection(db, 'sessions'), sessionData)
      
      // Invia email
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_pending',
            coacheeEmail: user.email || offer.coacheeEmail,
            coacheeName: user.name || offer.coacheeName,
            coachEmail: coach.email,
            coachName: coach.name,
            date: format(scheduledAt, "EEEE d MMMM yyyy", { locale: it }),
            time: selectedTime,
            duration: offer.sessionDuration || 60,
            sessionType: 'paid_session',
            offerTitle: offer.title,
            sessionNumber: sessionNumber,
            totalSessions: offer.totalSessions,
            coachId: offer.coachId
          })
        })
      } catch (emailErr) {
        console.error('Errore invio email:', emailErr)
      }
      
      setIsConfirmed(true)
    } catch (err) {
      console.error('Errore:', err)
      setError('Errore durante la prenotazione. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  // Errore
  if (error && !offer) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-charcoal mb-2">{error}</h2>
          <Link href="/offers" className="text-primary-500 hover:underline">
            Torna alle offerte
          </Link>
        </div>
      </div>
    )
  }

  // Confermato
  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <header className="bg-white border-b border-gray-100 p-4">
          <div className="max-w-lg mx-auto flex justify-center">
            <Logo size="md" />
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-sm max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <Sparkles className="text-green-500" size={40} />
            </motion.div>

            <h1 className="text-2xl font-bold text-charcoal mb-2">
              Prenotazione inviata!
            </h1>
            
            <p className="text-gray-500 mb-6">
              Il coach riceverà la tua richiesta e confermerà la sessione a breve.
            </p>

            {selectedDate && selectedTime && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-medium text-charcoal mb-3">
                  Sessione {sessionNumber}/{offer?.totalSessions}
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{selectedTime} • {offer?.sessionDuration || 60} minuti</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    <Clock size={12} />
                    In attesa di conferma
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                Vai alla Dashboard
              </Link>
              
              <Link
                href="/offers"
                className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                Le mie offerte
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/offers" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Info offerta */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CreditCard className="text-green-500" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-charcoal">
                Prenota sessione {sessionNumber}
              </h1>
              <p className="text-sm text-gray-500">
                {offer?.title} con {coach?.name}
              </p>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700">
            <CheckCircle size={16} className="inline mr-2" />
            Sessione già pagata - Scegli data e ora
          </div>
        </div>

        {/* Calendario */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <Calendar className="text-primary-500" size={20} />
            Scegli data e ora
          </h2>
          
          {/* Navigazione settimana */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousWeek}
              disabled={isBefore(addDays(currentWeekStart, -1), new Date())}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium text-charcoal">
              {format(currentWeekStart, 'MMMM yyyy', { locale: it })}
            </span>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          {/* Giorni */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-400 py-2">
                {day}
              </div>
            ))}
            
            {weekDays.map((date, i) => {
              const isPast = isPastDate(date)
              const hasSlots = hasAvailability(date)
              const isBlocked = isDateBlocked(date)
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isDisabled = isPast || !hasSlots || isBlocked
              
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!isDisabled) {
                      setSelectedDate(date)
                      setSelectedTime(null)
                    }
                  }}
                  disabled={isDisabled}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                    ${isSelected 
                      ? 'bg-primary-500 text-white' 
                      : isDisabled
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-50 hover:bg-primary-50 text-charcoal'
                    }
                    ${isToday(date) && !isSelected ? 'ring-2 ring-primary-300' : ''}
                  `}
                >
                  <span className="font-medium">{format(date, 'd')}</span>
                  {hasSlots && !isPast && !isBlocked && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-green-400'}`} />
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Orari */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t pt-4"
            >
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Orari disponibili per {format(selectedDate, 'EEEE d MMMM', { locale: it })}
              </h3>
              
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {availableSlots.map((time: string) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`
                        py-2 px-3 rounded-lg text-sm font-medium transition-all
                        ${selectedTime === time
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-charcoal'
                        }
                      `}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Nessun orario disponibile per questa data
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Riepilogo */}
        {selectedDate && selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-semibold text-charcoal mb-4">Riepilogo</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar size={18} />
                <span>{format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Clock size={18} />
                <span>{selectedTime} • {offer?.sessionDuration || 60} minuti</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Video size={18} />
                <span>Videochiamata (riceverai il link via email)</span>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-700 text-sm font-medium">
                Sessione {sessionNumber}/{offer?.totalSessions} - {offer?.title}
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Il coach confermerà la prenotazione e riceverai un'email
              </p>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}
            
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full btn btn-primary py-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Conferma in corso...
                </>
              ) : (
                'Conferma prenotazione'
              )}
            </button>
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default function BookingPaidPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <BookingPaidContent />
    </Suspense>
  )
}

