'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  X,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Ban,
  User,
  RefreshCw,
  ExternalLink,
  Settings
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import CalendarSettings from '@/components/CalendarSettings'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, isBefore, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'

interface WeeklyAvailability {
  [day: number]: string[] // 0 = Domenica, 1 = Lunedì, etc.
}

interface ManualEvent {
  id: string
  title: string
  date: Date
  startTime: string
  endTime: string
  type: 'blocked' | 'external' | 'internal'
  notes?: string
}

interface BlockedDate {
  id: string
  date: Date
  reason?: string
}

interface GoogleEvent {
  id: string
  title: string
  start: Date
  end: Date
  isAllDay: boolean
}

const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  1: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Lunedì
  2: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Martedì
  3: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Mercoledì
  4: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Giovedì
  5: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Venerdì
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lunedì', short: 'Lun' },
  { id: 2, name: 'Martedì', short: 'Mar' },
  { id: 3, name: 'Mercoledì', short: 'Mer' },
  { id: 4, name: 'Giovedì', short: 'Gio' },
  { id: 5, name: 'Venerdì', short: 'Ven' },
  { id: 6, name: 'Sabato', short: 'Sab' },
  { id: 0, name: 'Domenica', short: 'Dom' },
]

export default function CoachAvailabilityPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'weekly' | 'calendar' | 'events'>('calendar')
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY)
  const [manualEvents, setManualEvents] = useState<ManualEvent[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [bookedSessions, setBookedSessions] = useState<any[]>([])
  const [externalSessions, setExternalSessions] = useState<any[]>([])
  
  // Google Calendar state
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([])
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Modal states
  const [showEventModal, setShowEventModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showCalendarSettings, setShowCalendarSettings] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    type: 'external' as 'blocked' | 'external' | 'internal',
    notes: ''
  })
  const [blockReason, setBlockReason] = useState('')
  
  // Redirect se non loggato
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])
  
  // Carica dati
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Carica disponibilità settimanale
        const availDoc = await getDoc(doc(db, 'coachAvailability', user.id))
        if (availDoc.exists()) {
          const data = availDoc.data()
          if (data.weeklySlots) {
            setWeeklyAvailability(data.weeklySlots)
          }
        }
        
        // Controlla se Google Calendar è connesso
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        if (coachDoc.exists()) {
          const coachData = coachDoc.data()
          setGoogleCalendarConnected(coachData.googleCalendarConnected || false)
        }
        
        // Carica eventi manuali
        const eventsQuery = query(
          collection(db, 'coachEvents'),
          where('coachId', '==', user.id)
        )
        const eventsSnap = await getDocs(eventsQuery)
        const events = eventsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(doc.data().date)
        })) as ManualEvent[]
        setManualEvents(events)
        
        // Carica date bloccate
        const blockedQuery = query(
          collection(db, 'coachBlockedDates'),
          where('coachId', '==', user.id)
        )
        const blockedSnap = await getDocs(blockedQuery)
        const blocked = blockedSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(doc.data().date)
        })) as BlockedDate[]
        setBlockedDates(blocked)
        
        // Carica sessioni prenotate (CoachaMi)
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        const sessions = sessionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledAt: doc.data().scheduledAt?.toDate?.() || new Date(doc.data().scheduledAt)
        }))
        setBookedSessions(sessions)
        
        // Carica sessioni esterne (clienti esterni)
        try {
          const extSessionsQuery = query(
            collection(db, 'externalSessions'),
            where('coachId', '==', user.id),
            where('status', 'in', ['pending', 'confirmed'])
          )
          const extSessionsSnap = await getDocs(extSessionsQuery)
          const extSessions = extSessionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            scheduledAt: doc.data().scheduledAt?.toDate?.() || new Date(doc.data().scheduledAt)
          }))
          setExternalSessions(extSessions)
        } catch (err) {
          console.log('Nessuna sessione esterna o collection non esistente')
        }
        
      } catch (err) {
        console.error('Errore caricamento dati:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [user?.id])
  
  // Carica eventi da Google Calendar quando cambia la settimana
  useEffect(() => {
    const loadGoogleEvents = async () => {
      if (!user?.id || !googleCalendarConnected) return
      
      setIsLoadingGoogle(true)
      setGoogleError(null)
      
      try {
        // Carica token da Firebase client-side
        const tokenDoc = await getDoc(doc(db, 'coachCalendarTokens', user.id))
        
        if (!tokenDoc.exists()) {
          setGoogleError('Token non trovato')
          setIsLoadingGoogle(false)
          return
        }
        
        const tokenData = tokenDoc.data()
        let accessToken = tokenData.accessToken
        
        // Se token scaduto, mostra errore (il refresh va fatto server-side)
        if (tokenData.expiresAt < Date.now()) {
          // Prova a fare refresh tramite API
          try {
            const refreshRes = await fetch(`/api/calendar/refresh?coachId=${user.id}`)
            const refreshData = await refreshRes.json()
            if (refreshData.accessToken) {
              accessToken = refreshData.accessToken
            } else {
              setGoogleError('Token scaduto, riconnetti il calendario')
              setIsLoadingGoogle(false)
              return
            }
          } catch {
            setGoogleError('Token scaduto, riconnetti il calendario')
            setIsLoadingGoogle(false)
            return
          }
        }
        
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
        
        // Chiama direttamente Google Calendar API
        const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
        calendarUrl.searchParams.set('timeMin', currentWeekStart.toISOString())
        calendarUrl.searchParams.set('timeMax', weekEnd.toISOString())
        calendarUrl.searchParams.set('singleEvents', 'true')
        calendarUrl.searchParams.set('orderBy', 'startTime')
        calendarUrl.searchParams.set('maxResults', '50')
        
        const response = await fetch(calendarUrl.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        
        const data = await response.json()
        
        if (data.error) {
          console.error('Google Calendar API error:', data.error)
          setGoogleError(data.error.message || 'Errore API Google')
          return
        }
        
        if (data.items) {
          const events: GoogleEvent[] = data.items.map((e: any) => ({
            id: e.id,
            title: e.summary || 'Evento',
            start: new Date(e.start?.dateTime || e.start?.date),
            end: new Date(e.end?.dateTime || e.end?.date),
            isAllDay: !e.start?.dateTime
          }))
          setGoogleEvents(events)
        }
      } catch (err) {
        console.error('Errore caricamento eventi Google:', err)
        setGoogleError('Errore nel caricamento eventi')
      } finally {
        setIsLoadingGoogle(false)
      }
    }
    
    loadGoogleEvents()
  }, [user?.id, googleCalendarConnected, currentWeekStart])
  
  // Funzione per ricaricare eventi Google
  const refreshGoogleEvents = async () => {
    if (!user?.id || !googleCalendarConnected) return
    
    setGoogleEvents([])
    setIsLoadingGoogle(true)
    setGoogleError(null)
    
    try {
      const tokenDoc = await getDoc(doc(db, 'coachCalendarTokens', user.id))
      if (!tokenDoc.exists()) {
        setGoogleError('Token non trovato')
        return
      }
      
      const tokenData = tokenDoc.data()
      const accessToken = tokenData.accessToken
      
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      
      const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      calendarUrl.searchParams.set('timeMin', currentWeekStart.toISOString())
      calendarUrl.searchParams.set('timeMax', weekEnd.toISOString())
      calendarUrl.searchParams.set('singleEvents', 'true')
      calendarUrl.searchParams.set('orderBy', 'startTime')
      calendarUrl.searchParams.set('maxResults', '50')
      
      const response = await fetch(calendarUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      
      const data = await response.json()
      
      if (data.items) {
        const events: GoogleEvent[] = data.items.map((e: any) => ({
          id: e.id,
          title: e.summary || 'Evento',
          start: new Date(e.start?.dateTime || e.start?.date),
          end: new Date(e.end?.dateTime || e.end?.date),
          isAllDay: !e.start?.dateTime
        }))
        setGoogleEvents(events)
      }
    } catch (err) {
      console.error('Errore refresh eventi:', err)
      setGoogleError('Errore nel caricamento')
    } finally {
      setIsLoadingGoogle(false)
    }
  }
  
  // Salva disponibilità settimanale
  const saveWeeklyAvailability = async () => {
    if (!user?.id) return
    
    setIsSaving(true)
    try {
      await setDoc(doc(db, 'coachAvailability', user.id), {
        coachId: user.id,
        weeklySlots: weeklyAvailability,
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      // Aggiorna anche coachApplications per compatibilità
      await setDoc(doc(db, 'coachApplications', user.id), {
        availability: weeklyAvailability,
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      alert('Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }
  
  // Toggle slot disponibilità
  const toggleSlot = (day: number, time: string) => {
    setWeeklyAvailability(prev => {
      const daySlots = prev[day] || []
      if (daySlots.includes(time)) {
        return { ...prev, [day]: daySlots.filter(t => t !== time) }
      } else {
        return { ...prev, [day]: [...daySlots, time].sort() }
      }
    })
  }
  
  // Aggiungi evento manuale
  const addManualEvent = async () => {
    if (!user?.id || !newEvent.title) return
    
    try {
      const eventRef = await addDoc(collection(db, 'coachEvents'), {
        coachId: user.id,
        title: newEvent.title,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        type: newEvent.type,
        notes: newEvent.notes,
        createdAt: serverTimestamp()
      })
      
      setManualEvents(prev => [...prev, {
        id: eventRef.id,
        ...newEvent
      }])
      
      setShowEventModal(false)
      setNewEvent({
        title: '',
        date: selectedDate || new Date(),
        startTime: '09:00',
        endTime: '10:00',
        type: 'external',
        notes: ''
      })
    } catch (err) {
      console.error('Errore aggiunta evento:', err)
      alert('Errore nell\'aggiunta evento')
    }
  }
  
  // Blocca data
  const blockDate = async () => {
    if (!user?.id || !selectedDate) return
    
    try {
      const blockRef = await addDoc(collection(db, 'coachBlockedDates'), {
        coachId: user.id,
        date: selectedDate,
        reason: blockReason,
        createdAt: serverTimestamp()
      })
      
      setBlockedDates(prev => [...prev, {
        id: blockRef.id,
        date: selectedDate,
        reason: blockReason
      }])
      
      setShowBlockModal(false)
      setBlockReason('')
    } catch (err) {
      console.error('Errore blocco data:', err)
    }
  }
  
  // Sblocca data
  const unblockDate = async (blockId: string) => {
    try {
      await deleteDoc(doc(db, 'coachBlockedDates', blockId))
      setBlockedDates(prev => prev.filter(b => b.id !== blockId))
    } catch (err) {
      console.error('Errore sblocco data:', err)
    }
  }
  
  // Elimina evento manuale
  const deleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'coachEvents', eventId))
      setManualEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (err) {
      console.error('Errore eliminazione evento:', err)
    }
  }
  
  // Genera giorni della settimana
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  
  // Verifica se una data è bloccata
  const isDateBlocked = (date: Date) => {
    return blockedDates.some(b => isSameDay(b.date, date))
  }
  
  // Ottieni eventi per una data
  const getEventsForDate = (date: Date) => {
    const events: any[] = []
    
    // Eventi manuali
    manualEvents.forEach(e => {
      if (isSameDay(e.date, date)) {
        events.push({ ...e, source: 'manual' })
      }
    })
    
    // Sessioni prenotate (CoachaMi)
    bookedSessions.forEach(s => {
      if (isSameDay(s.scheduledAt, date)) {
        events.push({
          id: s.id,
          title: `${s.coacheeName}`,
          date: s.scheduledAt,
          startTime: format(s.scheduledAt, 'HH:mm'),
          endTime: format(new Date(s.scheduledAt.getTime() + (s.duration || 30) * 60000), 'HH:mm'),
          type: 'session',
          source: 'booking'
        })
      }
    })
    
    // Sessioni esterne (clienti esterni)
    externalSessions.forEach(s => {
      if (isSameDay(s.scheduledAt, date)) {
        events.push({
          id: s.id,
          title: `${s.clientName || 'Cliente esterno'}`,
          date: s.scheduledAt,
          startTime: format(s.scheduledAt, 'HH:mm'),
          endTime: format(new Date(s.scheduledAt.getTime() + (s.duration || 60) * 60000), 'HH:mm'),
          type: 'session',
          source: 'external'
        })
      }
    })
    
    // Eventi Google Calendar
    googleEvents.forEach(g => {
      if (isSameDay(g.start, date)) {
        events.push({
          id: g.id,
          title: g.title,
          date: g.start,
          startTime: g.isAllDay ? 'Tutto il giorno' : format(g.start, 'HH:mm'),
          endTime: g.isAllDay ? '' : format(g.end, 'HH:mm'),
          type: 'external',
          source: 'google'
        })
      }
    })
    
    return events.sort((a, b) => {
      if (a.startTime === 'Tutto il giorno') return -1
      if (b.startTime === 'Tutto il giorno') return 1
      return a.startTime.localeCompare(b.startTime)
    })
  }
  
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    )
  }
  
  if (!user) return null
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-primary-500" />
              <span className="font-semibold text-charcoal">Gestione Disponibilità</span>
            </div>
          </div>
          <Logo size="sm" />
        </div>
      </header>
      
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'calendar', label: 'Calendario', icon: Calendar },
              { id: 'weekly', label: 'Orari Settimanali', icon: Clock },
              { id: 'events', label: 'I Miei Impegni', icon: User },
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Tab: Calendario */}
        {activeTab === 'calendar' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Status Google Calendar + Leggenda */}
            <div className="bg-white rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Google Calendar Status */}
                <div className="flex items-center gap-3">
                  {googleCalendarConnected ? (
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${googleError ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm text-gray-600">Google Calendar connesso</span>
                      <button
                        onClick={refreshGoogleEvents}
                        disabled={isLoadingGoogle}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Aggiorna eventi"
                      >
                        <RefreshCw size={16} className={`text-gray-500 ${isLoadingGoogle ? 'animate-spin' : ''}`} />
                      </button>
                      {/* Pulsante per aprire impostazioni/riconnettere */}
                      <button
                        onClick={() => setShowCalendarSettings(true)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Impostazioni Google Calendar"
                      >
                        <Settings size={16} className="text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCalendarSettings(true)}
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Calendar size={16} />
                      Connetti Google Calendar
                      <ExternalLink size={14} />
                    </button>
                  )}
                  {/* Messaggio errore cliccabile */}
                  {googleError && (
                    <button
                      onClick={() => setShowCalendarSettings(true)}
                      className="text-xs text-red-500 hover:text-red-700 underline cursor-pointer"
                    >
                      {googleError}
                    </button>
                  )}
                </div>
                
                {/* Leggenda */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                    <span className="text-gray-600">Coachee CoachaMi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                    <span className="text-gray-600">Clienti esterni</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                    <span className="text-gray-600">Google Calendar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                    <span className="text-gray-600">Eventi manuali</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                    <span className="text-gray-600">Giorno bloccato</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigazione settimana */}
            <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="font-semibold text-charcoal">
                {format(currentWeekStart, "d MMM", { locale: it })} - {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: it })}
              </h2>
              <button
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            {/* Griglia calendario */}
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100">
                {weekDays.map(day => {
                  const isToday = isSameDay(day, new Date())
                  const isPast = isBefore(day, startOfDay(new Date()))
                  const blocked = isDateBlocked(day)
                  const events = getEventsForDate(day)
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-3 border-r border-gray-100 last:border-r-0 ${
                        isPast ? 'bg-gray-50' : blocked ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="text-center mb-2">
                        <div className="text-xs text-gray-500 uppercase">
                          {format(day, 'EEE', { locale: it })}
                        </div>
                        <div className={`text-lg font-semibold ${
                          isToday ? 'w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center mx-auto' : ''
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                      
                      {/* Eventi del giorno */}
                      <div className="space-y-1 min-h-[100px]">
                        {blocked && (
                          <div className="text-xs bg-red-100 text-red-700 rounded px-2 py-1 flex items-center gap-1">
                            <Ban size={12} />
                            Bloccato
                          </div>
                        )}
                        {events.slice(0, 4).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs rounded px-2 py-1 truncate ${
                              event.source === 'booking'
                                ? 'bg-orange-100 text-orange-700 border-l-2 border-orange-500'
                                : event.source === 'external'
                                  ? 'bg-purple-100 text-purple-700 border-l-2 border-purple-500'
                                  : event.source === 'google'
                                    ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                                    : 'bg-gray-100 text-gray-700 border-l-2 border-gray-400'
                            }`}
                            title={`${event.title}${event.source === 'google' ? ' (Google)' : event.source === 'external' ? ' (Esterno)' : ''}`}
                          >
                            {event.startTime} {event.title}
                          </div>
                        ))}
                        {events.length > 4 && (
                          <div className="text-xs text-gray-500 px-2">
                            +{events.length - 4} altri
                          </div>
                        )}
                      </div>
                      
                      {/* Azioni */}
                      {!isPast && (
                        <div className="mt-2 flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedDate(day)
                              setNewEvent(prev => ({ ...prev, date: day }))
                              setShowEventModal(true)
                            }}
                            className="flex-1 text-xs bg-primary-50 text-primary-600 rounded py-1 hover:bg-primary-100"
                          >
                            <Plus size={12} className="inline" />
                          </button>
                          {!blocked ? (
                            <button
                              onClick={() => {
                                setSelectedDate(day)
                                setShowBlockModal(true)
                              }}
                              className="flex-1 text-xs bg-red-50 text-red-600 rounded py-1 hover:bg-red-100"
                            >
                              <Ban size={12} className="inline" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const block = blockedDates.find(b => isSameDay(b.date, day))
                                if (block) unblockDate(block.id)
                              }}
                              className="flex-1 text-xs bg-green-50 text-green-600 rounded py-1 hover:bg-green-100"
                            >
                              <Check size={12} className="inline" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Legenda */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-100"></div>
                <span className="text-gray-600">Sessioni prenotate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-100"></div>
                <span className="text-gray-600">Impegni esterni</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-100"></div>
                <span className="text-gray-600">Giorni bloccati</span>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Tab: Orari Settimanali */}
        {activeTab === 'weekly' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">Disponibilità Settimanale</h2>
                  <p className="text-sm text-gray-500">Seleziona gli orari in cui sei disponibile ogni settimana</p>
                </div>
                <button
                  onClick={saveWeeklyAvailability}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : saveSuccess ? (
                    <>
                      <Check size={18} />
                      Salvato!
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Salva
                    </>
                  )}
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-sm text-gray-500 font-medium">Orario</th>
                      {DAYS_OF_WEEK.map(day => (
                        <th key={day.id} className="py-2 px-3 text-sm text-gray-500 font-medium text-center">
                          {day.short}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map(time => (
                      <tr key={time} className="border-t border-gray-100">
                        <td className="py-2 px-3 text-sm text-gray-600">{time}</td>
                        {DAYS_OF_WEEK.map(day => {
                          const isAvailable = weeklyAvailability[day.id]?.includes(time)
                          return (
                            <td key={day.id} className="py-2 px-3 text-center">
                              <button
                                onClick={() => toggleSlot(day.id, time)}
                                className={`w-8 h-8 rounded-lg transition-colors ${
                                  isAvailable
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                                }`}
                              >
                                {isAvailable && <Check size={16} className="mx-auto" />}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Tab: I Miei Impegni */}
        {activeTab === 'events' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">I Miei Impegni</h2>
                  <p className="text-sm text-gray-500">Gestisci appuntamenti e impegni esterni</p>
                </div>
                <button
                  onClick={() => {
                    setNewEvent({
                      title: '',
                      date: new Date(),
                      startTime: '09:00',
                      endTime: '10:00',
                      type: 'external',
                      notes: ''
                    })
                    setShowEventModal(true)
                  }}
                  className="btn btn-primary"
                >
                  <Plus size={18} />
                  Aggiungi Impegno
                </button>
              </div>
              
              {/* Lista impegni */}
              <div className="space-y-3">
                {manualEvents.length === 0 && bookedSessions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nessun impegno programmato</p>
                  </div>
                ) : (
                  <>
                    {/* Sessioni prenotate */}
                    {bookedSessions
                      .filter(s => !isBefore(s.scheduledAt, startOfDay(new Date())))
                      .sort((a, b) => a.scheduledAt - b.scheduledAt)
                      .map(session => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 bg-green-50 rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                              <User className="text-green-600" size={20} />
                            </div>
                            <div>
                              <p className="font-medium text-charcoal">
                                Sessione con {session.coacheeName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(session.scheduledAt, "EEEE d MMMM 'alle' HH:mm", { locale: it })}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full">
                            Prenotata
                          </span>
                        </div>
                      ))}
                    
                    {/* Eventi manuali */}
                    {manualEvents
                      .filter(e => !isBefore(e.date, startOfDay(new Date())))
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(event => (
                        <div
                          key={event.id}
                          className={`flex items-center justify-between p-4 rounded-xl ${
                            event.type === 'external' ? 'bg-blue-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              event.type === 'external' ? 'bg-blue-100' : 'bg-gray-200'
                            }`}>
                              <Clock className={
                                event.type === 'external' ? 'text-blue-600' : 'text-gray-600'
                              } size={20} />
                            </div>
                            <div>
                              <p className="font-medium text-charcoal">{event.title}</p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(event.date), "EEEE d MMMM", { locale: it })} • {event.startTime} - {event.endTime}
                              </p>
                              {event.notes && (
                                <p className="text-xs text-gray-400 mt-1">{event.notes}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>
      
      {/* Modal: Aggiungi Evento */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Nuovo Impegno</h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Es: Riunione, Visita medica..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={format(newEvent.date, 'yyyy-MM-dd')}
                  onChange={(e) => setNewEvent({ ...newEvent, date: new Date(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ora inizio
                  </label>
                  <select
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ora fine
                  </label>
                  <select
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (opzionale)
                </label>
                <textarea
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={addManualEvent}
                disabled={!newEvent.title}
                className="flex-1 btn btn-primary disabled:opacity-50"
              >
                Aggiungi
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Modal: Blocca Data */}
      {showBlockModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Blocca Giornata</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Stai per bloccare <strong>{format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</strong>. 
              Non saranno disponibili prenotazioni per questa data.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo (opzionale)
              </label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Es: Ferie, Impegno personale..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={blockDate}
                className="flex-1 btn bg-red-500 hover:bg-red-600 text-white"
              >
                <Ban size={18} />
                Blocca Data
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Modal Impostazioni Google Calendar */}
      {showCalendarSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Google Calendar</h3>
              <button
                onClick={() => setShowCalendarSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <CalendarSettings 
              onStatusChange={(connected) => {
                setGoogleCalendarConnected(connected)
                if (connected) {
                  refreshGoogleEvents()
                }
                setShowCalendarSettings(false)
              }}
            />
          </motion.div>
        </div>
      )}
    </div>
  )
}
