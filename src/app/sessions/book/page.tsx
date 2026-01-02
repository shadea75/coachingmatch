'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Video,
  CheckCircle,
  Loader2,
  AlertCircle,
  Package
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  CoachAvailability,
  BookedSession,
  AvailableSlot,
  DAYS_SHORT,
  DAYS_OF_WEEK,
  generateAvailableSlots,
  formatSessionDate
} from '@/types/sessions'
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
import { format, addDays, startOfDay, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'

function BookSessionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const coachId = searchParams.get('coachId')
  const packageId = searchParams.get('packageId')
  const offerId = searchParams.get('offerId')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [coach, setCoach] = useState<any>(null)
  const [availability, setAvailability] = useState<CoachAvailability | null>(null)
  const [bookedSessions, setBookedSessions] = useState<BookedSession[]>([])
  const [purchasedPackage, setPurchasedPackage] = useState<any>(null)
  
  // Selezione
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  
  // Calendario
  const [calendarStart, setCalendarStart] = useState(startOfDay(new Date()))
  const daysToShow = 14
  
  // Carica dati
  useEffect(() => {
    const loadData = async () => {
      if (!coachId) {
        setError('Coach non specificato')
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // Carica coach
        const coachDoc = await getDoc(doc(db, 'users', coachId))
        if (!coachDoc.exists()) {
          setError('Coach non trovato')
          return
        }
        setCoach({ id: coachDoc.id, ...coachDoc.data() })
        
        // Carica disponibilità
        const availDoc = await getDoc(doc(db, 'coachAvailability', coachId))
        if (!availDoc.exists()) {
          setError('Il coach non ha ancora impostato la disponibilità')
          return
        }
        setAvailability(availDoc.data() as CoachAvailability)
        
        // Carica sessioni già prenotate
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', coachId),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        const sessions = sessionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledAt: doc.data().scheduledAt?.toDate?.() || new Date()
        })) as BookedSession[]
        setBookedSessions(sessions)
        
        // Carica pacchetto se specificato
        if (packageId) {
          const pkgDoc = await getDoc(doc(db, 'purchasedPackages', packageId))
          if (pkgDoc.exists()) {
            setPurchasedPackage({ id: pkgDoc.id, ...pkgDoc.data() })
          }
        }
        
      } catch (err) {
        console.error('Errore caricamento:', err)
        setError('Errore nel caricamento dei dati')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [coachId, packageId])
  
  // Genera slot quando cambia la data selezionata
  useEffect(() => {
    if (selectedDate && availability) {
      const duration = purchasedPackage?.sessionDuration || availability.sessionDurations[0] || 60
      const slots = generateAvailableSlots(selectedDate, availability, bookedSessions, duration)
      setAvailableSlots(slots)
      setSelectedSlot(null)
    }
  }, [selectedDate, availability, bookedSessions, purchasedPackage])
  
  // Genera giorni calendario
  const calendarDays = Array.from({ length: daysToShow }, (_, i) => addDays(calendarStart, i))
  
  // Naviga calendario
  const goToPrevWeek = () => setCalendarStart(prev => addDays(prev, -7))
  const goToNextWeek = () => setCalendarStart(prev => addDays(prev, 7))
  
  // Verifica se un giorno ha disponibilità
  const hasAvailability = (date: Date): boolean => {
    if (!availability) return false
    const dayOfWeek = date.getDay()
    const dailyAvail = availability.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek)
    return dailyAvail?.enabled || false
  }
  
  // Prenota sessione
  const handleBook = async () => {
    if (!selectedSlot || !user || !coach) return
    
    setIsBooking(true)
    setError('')
    
    try {
      const sessionData: Partial<BookedSession> = {
        coachId: coach.id,
        coachName: coach.name,
        coachEmail: coach.email,
        coacheeId: user.id,
        coacheeName: user.name || 'Coachee',
        coacheeEmail: user.email,
        offerId: offerId || undefined,
        packageId: packageId || undefined,
        scheduledAt: selectedSlot.datetime,
        duration: purchasedPackage?.sessionDuration || availability?.sessionDurations[0] || 60,
        timezone: 'Europe/Rome',
        status: 'confirmed', // Auto-conferma
        confirmedAt: new Date(),
        confirmedBy: 'auto',
        remindersSent: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await addDoc(collection(db, 'sessions'), {
        ...sessionData,
        scheduledAt: selectedSlot.datetime,
        confirmedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Aggiorna pacchetto se presente
      if (packageId && purchasedPackage) {
        await updateDoc(doc(db, 'purchasedPackages', packageId), {
          usedSessions: (purchasedPackage.usedSessions || 0) + 1,
          remainingSessions: (purchasedPackage.remainingSessions || 0) - 1,
          updatedAt: serverTimestamp()
        })
      }
      
      setSuccess(true)
      
      // TODO: Invia email di conferma
      
    } catch (err) {
      console.error('Errore prenotazione:', err)
      setError('Errore durante la prenotazione')
    } finally {
      setIsBooking(false)
    }
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">Devi essere loggato per prenotare</p>
      </div>
    )
  }
  
  if (success) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <header className="bg-white border-b border-gray-100 p-4">
          <div className="max-w-2xl mx-auto flex justify-center">
            <Logo size="md" />
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="text-green-500" size={48} />
            </motion.div>
            
            <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
              Sessione prenotata! 🎉
            </h1>
            <p className="text-gray-500 mb-6">
              La tua sessione con {coach?.name} è confermata.
            </p>
            
            <div className="bg-cream rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="text-primary-500" size={20} />
                <div>
                  <p className="font-medium text-charcoal">
                    {selectedSlot && formatSessionDate(selectedSlot.datetime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedSlot?.startTime} - {selectedSlot?.endTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="text-primary-500" size={20} />
                <p className="text-charcoal">{coach?.name}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Link
                href="/sessions"
                className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Calendar size={20} />
                Vedi le mie sessioni
              </Link>
              
              <Link
                href="/dashboard"
                className="w-full px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors block"
              >
                Torna alla dashboard
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
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/sessions"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Prenota sessione</h1>
                <p className="text-sm text-gray-500">
                  {coach?.name ? `con ${coach.name}` : 'Caricamento...'}
                </p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/dashboard" className="text-primary-500 hover:underline">
              Torna alla dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info pacchetto */}
            {purchasedPackage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary-50 rounded-xl p-4 flex items-center gap-3"
              >
                <Package className="text-primary-500" size={24} />
                <div>
                  <p className="font-medium text-primary-700">{purchasedPackage.title}</p>
                  <p className="text-sm text-primary-600">
                    {purchasedPackage.remainingSessions} sessioni rimanenti su {purchasedPackage.totalSessions}
                  </p>
                </div>
              </motion.div>
            )}
            
            {/* Calendario */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-charcoal flex items-center gap-2">
                  <Calendar size={20} className="text-primary-500" />
                  Scegli una data
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevWeek}
                    disabled={isSameDay(calendarStart, startOfDay(new Date()))}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={goToNextWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              
              {/* Mese */}
              <p className="text-sm text-gray-500 mb-4">
                {format(calendarStart, 'MMMM yyyy', { locale: it })}
              </p>
              
              {/* Giorni */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  const isAvailable = hasAvailability(day)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isPast = day < startOfDay(new Date())
                  
                  return (
                    <button
                      key={index}
                      onClick={() => isAvailable && !isPast && setSelectedDate(day)}
                      disabled={!isAvailable || isPast}
                      className={`p-3 rounded-xl text-center transition-all ${
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : isAvailable && !isPast
                          ? 'bg-gray-50 hover:bg-primary-50 text-charcoal'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <p className="text-xs mb-1">{DAYS_SHORT[day.getDay()]}</p>
                      <p className="font-semibold">{format(day, 'd')}</p>
                    </button>
                  )
                })}
              </div>
            </motion.div>
            
            {/* Slot orari */}
            <AnimatePresence>
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-primary-500" />
                    Orari disponibili - {format(selectedDate, "EEEE d MMMM", { locale: it })}
                  </h2>
                  
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl text-center transition-all ${
                            selectedSlot === slot
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-50 hover:bg-primary-50 text-charcoal'
                          }`}
                        >
                          <p className="font-medium">{slot.startTime}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Nessun orario disponibile per questa data
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Riepilogo e conferma */}
            <AnimatePresence>
              {selectedSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <h2 className="font-semibold text-charcoal mb-4">Riepilogo prenotazione</h2>
                  
                  <div className="bg-cream rounded-xl p-4 mb-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="text-gray-400" size={18} />
                      <span className="text-charcoal">{coach?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="text-gray-400" size={18} />
                      <span className="text-charcoal">
                        {formatSessionDate(selectedSlot.datetime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="text-gray-400" size={18} />
                      <span className="text-charcoal">
                        {selectedSlot.startTime} - {selectedSlot.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Video className="text-gray-400" size={18} />
                      <span className="text-charcoal">Videochiamata</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleBook}
                    disabled={isBooking}
                    className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-colors"
                  >
                    {isBooking ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
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
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}

export default function BookSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <BookSessionContent />
    </Suspense>
  )
}
