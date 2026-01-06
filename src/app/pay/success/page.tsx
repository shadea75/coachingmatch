'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  Home,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import Logo from '@/components/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc,
  collection,
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore'
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore } from 'date-fns'
import { it } from 'date-fns/locale'

function PaySuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const offerId = searchParams.get('offerId')
  // Supporta sia 'session' che 'installment' come parametro
  const sessionNumber = searchParams.get('session') || searchParams.get('installment')
  
  // Stati pagamento
  const [isUpdating, setIsUpdating] = useState(true)
  const [offer, setOffer] = useState<any>(null)
  const [coach, setCoach] = useState<any>(null)
  const [error, setError] = useState('')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  
  // Stati prenotazione
  const [step, setStep] = useState<'payment' | 'booking' | 'confirmed'>('payment')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookedSlots, setBookedSlots] = useState<{date: string, time: string}[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [manualEvents, setManualEvents] = useState<{date: string, startTime: string, endTime: string}[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Aggiorna pagamento e carica dati
  useEffect(() => {
    const updatePaymentStatus = async () => {
      if (!offerId || !sessionNumber) {
        setError('Parametri mancanti')
        setIsUpdating(false)
        return
      }

      try {
        // Carica l'offerta
        const offerRef = doc(db, 'offers', offerId)
        const offerSnap = await getDoc(offerRef)
        
        if (!offerSnap.exists()) {
          setError('Offerta non trovata')
          setIsUpdating(false)
          return
        }

        const offerData = offerSnap.data()
        setOffer({ id: offerSnap.id, ...offerData })

        // Carica dati coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', offerData.coachId))
        if (coachDoc.exists()) {
          const coachData = coachDoc.data()
          
          // Disponibilità di default
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
          
          // Carica slot già prenotati
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

        // Aggiorna lo stato della rata pagata (solo se non già pagata)
        const installmentIndex = parseInt(sessionNumber) - 1
        const installments = offerData.installments || []
        
        if (installments[installmentIndex] && installments[installmentIndex].status !== 'paid') {
          const amountPaid = installments[installmentIndex].amount || offerData.pricePerSession
          
          installments[installmentIndex] = {
            ...installments[installmentIndex],
            status: 'paid',
            paidAt: new Date()
          }

          const paidCount = installments.filter((i: any) => i.status === 'paid').length

          await updateDoc(offerRef, {
            installments,
            paidInstallments: paidCount,
            status: paidCount > 0 ? 'active' : offerData.status,
            updatedAt: serverTimestamp()
          })
          
          // Invia email conferma pagamento a coachee e coach
          try {
            await fetch('/api/emails/payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                coacheeEmail: offerData.coacheeEmail,
                coacheeName: offerData.coacheeName,
                coachEmail: offerData.coachEmail,
                coachName: offerData.coachName,
                offerTitle: offerData.title,
                sessionNumber: parseInt(sessionNumber),
                totalSessions: offerData.totalSessions,
                amountPaid: amountPaid,
                offerId: offerId
              })
            })
          } catch (emailErr) {
            console.error('Errore invio email pagamento:', emailErr)
          }
          
          // Aggiorna stato locale
          setOffer((prev: any) => ({ 
            ...prev, 
            installments, 
            paidInstallments: paidCount 
          }))
        }

        setPaymentConfirmed(true)
        setStep('booking')
        setIsUpdating(false)
      } catch (err) {
        console.error('Errore aggiornamento:', err)
        setError('Errore durante l\'aggiornamento')
        setIsUpdating(false)
      }
    }

    updatePaymentStatus()
  }, [offerId, sessionNumber])

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

  // Ottieni slot disponibili per la data selezionata
  const getAvailableSlots = () => {
    if (!selectedDate || !coach?.availability) return []
    
    const dayOfWeek = selectedDate.getDay()
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    const daySlots = coach.availability[adjustedDay] || []
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    // Filtra slot già prenotati
    const availableSlots = daySlots.filter((time: string) => {
      const isBooked = bookedSlots.some(
        slot => slot.date === dateStr && slot.time === time
      )
      
      // Controlla impegni manuali
      const isBlocked = manualEvents.some(event => {
        if (event.date !== dateStr) return false
        const slotMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])
        const startMinutes = parseInt(event.startTime.split(':')[0]) * 60 + parseInt(event.startTime.split(':')[1])
        const endMinutes = parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1])
        return slotMinutes >= startMinutes && slotMinutes < endMinutes
      })
      
      // Se è oggi, filtra orari passati
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
  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime || !user || !offer || !coach) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      // Crea data/ora della sessione
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
        sessionNumber: parseInt(sessionNumber || '1'),
        totalSessions: offer.totalSessions,
        type: 'paid_session',
        status: 'pending',
        scheduledAt,
        duration: offer.sessionDuration || 60,
        price: offer.pricePerSession,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const sessionRef = await addDoc(collection(db, 'sessions'), sessionData)
      
      // Invia email di notifica
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_pending',
            data: {
              coacheeEmail: user.email || offer.coacheeEmail,
              coacheeName: user.name || offer.coacheeName,
              coachEmail: coach.email,
              coachName: coach.name,
              date: format(scheduledAt, "EEEE d MMMM yyyy", { locale: it }),
              time: selectedTime,
              duration: offer.sessionDuration || 60,
              coachId: offer.coachId
            }
          })
        })
      } catch (emailErr) {
        console.error('Errore invio email:', emailErr)
      }
      
      setStep('confirmed')
    } catch (err) {
      console.error('Errore prenotazione:', err)
      setError('Errore durante la prenotazione')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Loading
  if (isUpdating) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Conferma pagamento in corso...</p>
        </div>
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
          <h2 className="text-xl font-semibold text-charcoal mb-2">Errore</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/dashboard" className="btn btn-primary">
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-center">
          <Logo size="sm" />
        </div>
      </header>
      
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="space-y-6">
          
          {/* Step 1: Conferma pagamento */}
          {step === 'payment' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-sm text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="text-green-500" size={40} />
              </motion.div>

              <h1 className="text-2xl font-bold text-charcoal mb-2">
                Pagamento confermato!
              </h1>
              
              <p className="text-gray-500 mb-6">
                Ora puoi prenotare la tua sessione
              </p>

              <button
                onClick={() => setStep('booking')}
                className="btn btn-primary w-full"
              >
                Prenota sessione
                <ArrowRight size={18} className="ml-2" />
              </button>
            </motion.div>
          )}
          
          {/* Step 2: Prenotazione */}
          {step === 'booking' && offer && coach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header conferma pagamento */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
                <div>
                  <p className="font-medium text-green-800">Pagamento confermato!</p>
                  <p className="text-green-600 text-sm">Sessione {sessionNumber}/{offer.totalSessions} - {offer.title}</p>
                </div>
              </div>
              
              {/* Calendario */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                  <Calendar className="text-primary-500" size={20} />
                  Scegli data e ora
                </h2>
                
                {/* Navigazione settimana */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="font-medium">
                    {format(currentWeekStart, 'MMMM yyyy', { locale: it })}
                  </span>
                  <button
                    onClick={goToNextWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                
                {/* Giorni della settimana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                    <div key={day} className="text-center text-xs text-gray-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Date */}
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((date) => {
                    const isPast = isPastDate(date)
                    const hasSlots = hasAvailability(date)
                    const isBlocked = isDateBlocked(date)
                    const isSelected = selectedDate && isSameDay(date, selectedDate)
                    const isDisabled = isPast || isBlocked || !hasSlots
                    
                    return (
                      <button
                        key={date.toISOString()}
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
              </div>
              
              {/* Orari disponibili */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Orari disponibili per {format(selectedDate, 'EEEE d MMMM', { locale: it })}
                  </h3>
                  
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
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
              
              {/* Riepilogo e conferma */}
              {selectedDate && selectedTime && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <h3 className="font-semibold text-charcoal mb-4">Riepilogo prenotazione</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar size={18} />
                      <span>{format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock size={18} />
                      <span>{selectedTime} • {offer.sessionDuration || 60} minuti</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Video size={18} />
                      <span>Videochiamata (riceverai il link via email)</span>
                    </div>
                  </div>
                  
                  {error && (
                    <p className="text-red-500 text-sm text-center mb-4">{error}</p>
                  )}
                  
                  <button
                    onClick={handleConfirmBooking}
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
            </motion.div>
          )}
          
          {/* Step 3: Prenotazione confermata */}
          {step === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 shadow-sm text-center"
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
                Riceverai un'email di conferma.
              </p>

              {offer && selectedDate && selectedTime && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                  <h3 className="font-medium text-charcoal mb-3">{offer.title}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{selectedTime} • {offer.sessionDuration || 60} minuti</span>
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
                  <ArrowRight size={18} />
                </Link>
                
                <Link
                  href="/offers"
                  className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  Le mie offerte
                </Link>
              </div>
            </motion.div>
          )}
          
        </div>
      </main>
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <PaySuccessContent />
    </Suspense>
  )
}
