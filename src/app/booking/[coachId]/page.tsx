'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Video, 
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  User
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, addWeeks } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { LIFE_AREAS } from '@/types'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore'

interface CoachData {
  id: string
  name: string
  email: string
  photo: string | null
  lifeArea: string | null
  specialization: string
  bio: string
  availability: Record<number, string[]>
}

export default function BookingPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const coachId = params.coachId as string
  
  const [coach, setCoach] = useState<CoachData | null>(null)
  const [isLoadingCoach, setIsLoadingCoach] = useState(true)
  const [bookedSlots, setBookedSlots] = useState<{date: string, time: string}[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [manualEvents, setManualEvents] = useState<{date: string, startTime: string, endTime: string}[]>([])
  const [hasUsedFreeCall, setHasUsedFreeCall] = useState(false)
  const [totalFreeCallsUsed, setTotalFreeCallsUsed] = useState(0)
  const MAX_FREE_CALLS = 5
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Stati per richiesta offerta
  const [showOfferRequestModal, setShowOfferRequestModal] = useState(false)
  const [offerRequestForm, setOfferRequestForm] = useState({
    objectives: '',
    budget: '',
    notes: ''
  })
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  
  // Carica dati coach da Firebase
  useEffect(() => {
    const loadCoach = async () => {
      setIsLoadingCoach(true)
      try {
        // Prova prima dalla collection coachApplications
        const coachDoc = await getDoc(doc(db, 'coachApplications', coachId))
        
        if (coachDoc.exists()) {
          const data = coachDoc.data()
          
          // Crea disponibilità di default se non esiste
          const defaultAvailability: Record<number, string[]> = {
            1: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            2: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            3: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            4: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            5: ['09:00', '10:00', '11:00', '12:00', '13:00'],
          }
          
          setCoach({
            id: coachDoc.id,
            name: data.name || 'Coach',
            email: data.email || '',
            photo: data.photo || null,
            lifeArea: data.lifeArea || null,
            specialization: data.lifeArea 
              ? (LIFE_AREAS.find(a => a.id === data.lifeArea)?.label || 'Life Coach')
              : (data.specializations?.focusTopics?.[0] || 'Life Coach'),
            bio: data.bio || data.motivation || '',
            availability: data.availability || defaultAvailability
          })
        } else {
          setError('Coach non trovato')
        }
        
        // Carica slot già prenotati
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', coachId),
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
        
        // Carica date bloccate dal coach
        const blockedQuery = query(
          collection(db, 'coachBlockedDates'),
          where('coachId', '==', coachId)
        )
        const blockedSnap = await getDocs(blockedQuery)
        const blocked = blockedSnap.docs.map(doc => {
          const data = doc.data()
          const date = data.date?.toDate?.() || new Date(data.date)
          return format(date, 'yyyy-MM-dd')
        })
        setBlockedDates(blocked)
        
        // Carica impegni manuali del coach
        const eventsQuery = query(
          collection(db, 'coachEvents'),
          where('coachId', '==', coachId)
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
        
      } catch (err) {
        console.error('Errore caricamento coach:', err)
        setError('Errore nel caricamento dei dati')
      } finally {
        setIsLoadingCoach(false)
      }
    }
    
    if (coachId) {
      loadCoach()
    }
  }, [coachId])
  
  // Controlla call gratuite usate
  useEffect(() => {
    const checkFreeCalls = async () => {
      if (!user?.id) return
      
      try {
        // Controlla se ha già usato call gratuita con questo coach
        // Escludiamo le sessioni cancelled e rescheduled (non contano come "usate")
        const freeCallWithCoachQuery = query(
          collection(db, 'sessions'),
          where('coacheeId', '==', user.id),
          where('coachId', '==', coachId),
          where('type', '==', 'free_consultation')
        )
        const freeCallWithCoachSnap = await getDocs(freeCallWithCoachQuery)
        
        // Filtra solo le sessioni che contano come "usate" (pending, confirmed, completed)
        const validStatuses = ['pending', 'confirmed', 'completed']
        const validCallsWithCoach = freeCallWithCoachSnap.docs.filter(doc => 
          validStatuses.includes(doc.data().status)
        )
        setHasUsedFreeCall(validCallsWithCoach.length > 0)
        
        // Conta totale call gratuite usate (escludendo cancelled e rescheduled)
        const totalFreeCallsQuery = query(
          collection(db, 'sessions'),
          where('coacheeId', '==', user.id),
          where('type', '==', 'free_consultation')
        )
        const totalFreeCallsSnap = await getDocs(totalFreeCallsQuery)
        
        const validTotalCalls = totalFreeCallsSnap.docs.filter(doc => 
          validStatuses.includes(doc.data().status)
        )
        setTotalFreeCallsUsed(validTotalCalls.length)
      } catch (err) {
        console.error('Errore controllo call gratuite:', err)
      }
    }
    
    checkFreeCalls()
  }, [user?.id, coachId])
  
  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  
  // Get available slots for selected date
  const getAvailableSlots = (date: Date): string[] => {
    if (!coach) return []
    
    const dayOfWeek = date.getDay()
    const slots = coach.availability[dayOfWeek] || []
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // Se la data è bloccata, nessuno slot disponibile
    if (blockedDates.includes(dateStr)) {
      return []
    }
    
    // Filter out booked slots, manual events, and past times
    return slots.filter(time => {
      // Check if slot is booked
      const isBooked = bookedSlots.some(
        slot => slot.date === dateStr && slot.time === time
      )
      if (isBooked) return false
      
      // Check if slot overlaps with manual events
      const hasConflict = manualEvents.some(event => {
        if (event.date !== dateStr) return false
        // Check if the time slot falls within the event
        return time >= event.startTime && time < event.endTime
      })
      if (hasConflict) return false
      
      // If today, filter out past times
      if (isToday(date)) {
        const [hours, minutes] = time.split(':').map(Number)
        const slotTime = new Date()
        slotTime.setHours(hours, minutes, 0)
        if (isBefore(slotTime, new Date())) return false
      }
      
      return true
    })
  }
  
  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : []
  
  // Handle booking confirmation
  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !coach || !user) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      // Crea data/ora completa
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const scheduledAt = new Date(selectedDate)
      scheduledAt.setHours(hours, minutes, 0, 0)
      
      // Salva sessione in Firebase
      const sessionRef = await addDoc(collection(db, 'sessions'), {
        coachId: coach.id,
        coachName: coach.name,
        coachEmail: coach.email,
        coachPhoto: coach.photo,
        coacheeId: user.id,
        coacheeName: user.name || user.email?.split('@')[0] || 'Coachee',
        coacheeEmail: user.email,
        scheduledAt: scheduledAt,
        duration: 30,
        status: 'pending', // In attesa conferma coach
        type: 'free_consultation',
        meetingProvider: 'google_meet',
        notes: 'Prima call di orientamento gratuita',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Invia email di conferma
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_confirmation',
          data: {
            sessionId: sessionRef.id,
            coachName: coach.name,
            coachEmail: coach.email,
            coacheeName: user.name || user.email?.split('@')[0],
            coacheeEmail: user.email,
            date: format(scheduledAt, "EEEE d MMMM yyyy", { locale: it }),
            time: selectedTime,
            duration: 30,
            sessionDate: scheduledAt.toISOString() // Per generare link calendario
          }
        })
      })
      
      setIsConfirmed(true)
    } catch (err: any) {
      console.error('Errore prenotazione:', err)
      setError('Errore durante la prenotazione. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Invia richiesta offerta
  const handleSubmitOfferRequest = async () => {
    if (!coach || !user || !offerRequestForm.objectives.trim()) return
    
    setIsSubmittingRequest(true)
    try {
      // Salva richiesta in Firebase
      await addDoc(collection(db, 'offerRequests'), {
        coachId: coach.id,
        coachName: coach.name,
        coachEmail: coach.email,
        coacheeId: user.id,
        coacheeName: user.name || user.email?.split('@')[0] || 'Coachee',
        coacheeEmail: user.email,
        objectives: offerRequestForm.objectives,
        budget: offerRequestForm.budget || null,
        notes: offerRequestForm.notes || null,
        status: 'pending',
        createdAt: serverTimestamp()
      })
      
      // Invia email al coach
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offer_request',
          data: {
            coachName: coach.name,
            coachEmail: coach.email,
            coacheeName: user.name || user.email?.split('@')[0],
            coacheeEmail: user.email,
            objectives: offerRequestForm.objectives,
            budget: offerRequestForm.budget,
            notes: offerRequestForm.notes
          }
        })
      })
      
      setRequestSent(true)
      setShowOfferRequestModal(false)
    } catch (err) {
      console.error('Errore invio richiesta:', err)
      setError('Errore durante l\'invio della richiesta')
    } finally {
      setIsSubmittingRequest(false)
    }
  }
  
  // Navigation
  const goToPreviousWeek = () => {
    const prevWeek = addWeeks(currentWeekStart, -1)
    if (!isBefore(prevWeek, startOfWeek(new Date(), { weekStartsOn: 1 }))) {
      setCurrentWeekStart(prevWeek)
      setSelectedDate(null)
      setSelectedTime(null)
    }
  }
  
  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
    setSelectedDate(null)
    setSelectedTime(null)
  }
  
  // Loading state
  if (isLoadingCoach) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }
  
  // Error state
  if (error && !coach) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/matching" className="btn btn-primary">
            Torna ai coach
          </Link>
        </div>
      </div>
    )
  }
  
  // Confirmation state
  if (isConfirmed && coach && selectedDate && selectedTime) {
    // Crea data/ora per i link calendario
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const startDate = new Date(selectedDate)
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + 30 * 60000) // +30 minuti
    
    // Formatta per Google Calendar (YYYYMMDDTHHmmss)
    const formatForGoogle = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    
    // Formatta per Apple/ICS (YYYYMMDDTHHMMSS)
    const formatForICS = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0')
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
    }
    
    const eventTitle = `Call di coaching con ${coach.name}`
    const eventDescription = `Prima call di orientamento gratuita con ${coach.name} su CoachaMi`
    
    // Link Google Calendar
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatForGoogle(startDate)}/${formatForGoogle(endDate)}&details=${encodeURIComponent(eventDescription)}&location=Videochiamata`
    
    // Genera file ICS per Apple Calendar
    const generateICSFile = () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CoachaMi//IT
BEGIN:VEVENT
DTSTART:${formatForICS(startDate)}
DTEND:${formatForICS(endDate)}
SUMMARY:${eventTitle}
DESCRIPTION:${eventDescription}
LOCATION:Videochiamata
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`
      
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `coaching-${format(startDate, 'yyyy-MM-dd')}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg"
        >
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-500" strokeWidth={2} />
          </div>
          
          <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
            Richiesta inviata!
          </h1>
          <p className="text-gray-500 mb-6">
            Il coach deve confermare la tua prenotazione. Riceverai una email quando sarà confermata.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-700 text-sm font-medium">
              ⏳ In attesa di conferma dal coach
            </p>
          </div>
          
          <div className="bg-cream rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-4 mb-4">
              {coach.photo ? (
                <img 
                  src={coach.photo}
                  alt={coach.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-500" />
                </div>
              )}
              <div>
                <p className="font-medium text-charcoal">{coach.name}</p>
                <p className="text-sm text-gray-500">{coach.specialization}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={16} />
                <span>
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} />
                <span>{selectedTime} • 30 minuti</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Video size={16} />
                <span>Videochiamata</span>
              </div>
            </div>
          </div>
          
          {/* Bottoni Aggiungi al Calendario */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">Aggiungi al calendario:</p>
            <div className="flex gap-2">
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3z" stroke="#4285F4" strokeWidth="1.5"/>
                  <path d="M8 10h8M8 14h5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M16 3v3M8 3v3" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Google
              </a>
              <button
                onClick={generateICSFile}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="17" rx="2" stroke="#333" strokeWidth="1.5"/>
                  <path d="M3 9h18" stroke="#333" strokeWidth="1.5"/>
                  <path d="M9 4V2M15 4V2" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Apple / Altro
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full btn btn-primary"
            >
              Vai alla dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full btn btn-ghost"
            >
              Torna alla home
            </button>
          </div>
        </motion.div>
      </div>
    )
  }
  
  if (!coach) return null
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary-500" />
              <span className="font-semibold text-charcoal">Prenota call gratuita</span>
            </div>
          </div>
          <Logo size="sm" />
        </div>
      </header>
      
      {/* Main */}
      <main className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Coach info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 mb-6 flex items-center gap-4"
          >
            {coach.photo ? (
              <img 
                src={coach.photo}
                alt={coach.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center">
                <User className="w-8 h-8 text-primary-500" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-charcoal">{coach.name}</h2>
              {(() => {
                const area = coach.lifeArea ? LIFE_AREAS.find(a => a.id === coach.lifeArea) : null
                return area ? (
                  <p className="font-medium" style={{ color: area.color }}>{area.label}</p>
                ) : (
                  <p className="text-gray-500">{coach.specialization}</p>
                )
              })()}
            </div>
          </motion.div>
          
          {/* Blocco se call gratuita già usata o limite raggiunto */}
          {(hasUsedFreeCall || totalFreeCallsUsed >= MAX_FREE_CALLS) ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 text-center"
            >
              {requestSent ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-charcoal mb-2">
                    Richiesta inviata!
                  </h2>
                  <p className="text-gray-500 mb-6">
                    {coach.name} riceverà la tua richiesta e ti contatterà con un'offerta personalizzata.
                  </p>
                  <Link href="/dashboard" className="btn btn-primary">
                    Vai alla dashboard
                  </Link>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-yellow-500" />
                  </div>
                  
                  {hasUsedFreeCall ? (
                    <>
                      <h2 className="text-xl font-bold text-charcoal mb-2">
                        Hai già usato la call gratuita con questo coach
                      </h2>
                      <p className="text-gray-500 mb-6">
                        Puoi prenotare una call gratuita solo una volta per ogni coach.
                        Per continuare il percorso, chiedi a {coach.name} un'offerta personalizzata.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-charcoal mb-2">
                        Hai raggiunto il limite di call gratuite
                      </h2>
                      <p className="text-gray-500 mb-6">
                        Puoi prenotare massimo {MAX_FREE_CALLS} call gratuite con coach diversi.
                        Per continuare, scegli uno dei coach con cui hai già parlato.
                      </p>
                    </>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => router.back()}
                      className="btn btn-secondary"
                    >
                      Torna indietro
                    </button>
                    {hasUsedFreeCall && (
                      <button
                        onClick={() => setShowOfferRequestModal(true)}
                        className="btn btn-primary"
                      >
                        Richiedi offerta
                      </button>
                    )}
                    <Link href="/dashboard" className="btn btn-ghost">
                      Vai alla dashboard
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
          <>
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-charcoal">Seleziona data e ora</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={isBefore(addWeeks(currentWeekStart, -1), startOfWeek(new Date(), { weekStartsOn: 1 }))}
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <span className="text-sm text-gray-600 min-w-[140px] text-center">
                  {format(currentWeekStart, "d MMM", { locale: it })} - {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: it })}
                </span>
                <button
                  onClick={goToNextWeek}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Week days */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {weekDays.map(day => {
                const isPast = isBefore(day, new Date()) && !isToday(day)
                const hasSlots = getAvailableSlots(day).length > 0
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      if (!isPast && hasSlots) {
                        setSelectedDate(day)
                        setSelectedTime(null)
                      }
                    }}
                    disabled={isPast || !hasSlots}
                    className={`
                      p-3 rounded-xl text-center transition-all
                      ${isSelected 
                        ? 'bg-primary-500 text-white' 
                        : isPast || !hasSlots
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-50 hover:bg-gray-100 text-charcoal'
                      }
                    `}
                  >
                    <div className="text-xs uppercase mb-1">
                      {format(day, 'EEE', { locale: it })}
                    </div>
                    <div className="text-lg font-semibold">
                      {format(day, 'd')}
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* Time slots */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border-t border-gray-100 pt-6"
              >
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Orari disponibili per {format(selectedDate, "EEEE d MMMM", { locale: it })}
                </h4>
                
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map(time => (
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
          </motion.div>
          
          {/* Summary and confirm */}
          {selectedDate && selectedTime && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6"
            >
              <h3 className="font-semibold text-charcoal mb-4">Riepilogo</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar size={18} />
                  <span>{format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock size={18} />
                  <span>{selectedTime} • 30 minuti</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Video size={18} />
                  <span>Videochiamata (riceverai il link via email)</span>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-700 text-sm font-medium">
                  ✓ Prima call di orientamento gratuita
                </p>
              </div>
              
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}
              
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || !user}
                className="w-full btn btn-primary py-4 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Conferma in corso...
                  </>
                ) : !user ? (
                  'Accedi per prenotare'
                ) : (
                  'Conferma prenotazione'
                )}
              </button>
              
              {!user && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  <Link href="/login" className="text-primary-500 hover:underline">
                    Accedi
                  </Link>
                  {' '}per confermare la prenotazione
                </p>
              )}
            </motion.div>
          )}
          </>
          )}
        </div>
      </main>
      
      {/* Modal Richiesta Offerta */}
      {showOfferRequestModal && coach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowOfferRequestModal(false)} 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-charcoal mb-2">
              Richiedi offerta a {coach.name}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Descrivi cosa stai cercando e il coach ti invierà un'offerta personalizzata.
            </p>
            
            <div className="space-y-4">
              {/* Obiettivi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cosa vorresti raggiungere? *
                </label>
                <textarea
                  value={offerRequestForm.objectives}
                  onChange={(e) => setOfferRequestForm(prev => ({ ...prev, objectives: e.target.value }))}
                  placeholder="Es: Vorrei migliorare la mia autostima e gestire meglio lo stress lavorativo..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                />
              </div>
              
              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget indicativo (opzionale)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={offerRequestForm.budget === 'da_definire' ? '' : offerRequestForm.budget}
                    onChange={(e) => setOfferRequestForm(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="Es: €300, €500, ecc."
                    disabled={offerRequestForm.budget === 'da_definire'}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offerRequestForm.budget === 'da_definire'}
                      onChange={(e) => setOfferRequestForm(prev => ({ 
                        ...prev, 
                        budget: e.target.checked ? 'da_definire' : '' 
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">Da definire insieme al coach</span>
                  </label>
                </div>
              </div>
              
              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note aggiuntive (opzionale)
                </label>
                <textarea
                  value={offerRequestForm.notes}
                  onChange={(e) => setOfferRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Altre informazioni utili per il coach..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                />
              </div>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm mt-4">{error}</p>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOfferRequestModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmitOfferRequest}
                disabled={isSubmittingRequest || !offerRequestForm.objectives.trim()}
                className="flex-1 btn btn-primary disabled:opacity-50"
              >
                {isSubmittingRequest ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Invio...
                  </>
                ) : (
                  'Invia richiesta'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
