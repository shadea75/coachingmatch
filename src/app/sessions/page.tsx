'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  ChevronRight,
  MessageSquare,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { BookedSession, SessionStatus, formatSessionDate, formatSessionTime } from '@/types/sessions'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { format, isPast, isFuture, isToday } from 'date-fns'
import { it } from 'date-fns/locale'

export default function SessionsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [sessions, setSessions] = useState<BookedSession[]>([])
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  
  const isCoach = user?.role === 'coach'
  
  // Carica sessioni
  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        const field = isCoach ? 'coachId' : 'coacheeId'
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where(field, '==', user.id),
          orderBy('scheduledAt', 'desc')
        )
        
        const snapshot = await getDocs(sessionsQuery)
        const sessionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledAt: doc.data().scheduledAt?.toDate?.() || new Date(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        })) as BookedSession[]
        
        setSessions(sessionsData)
      } catch (err) {
        console.error('Errore caricamento sessioni:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSessions()
  }, [user?.id, isCoach])
  
  // Filtra sessioni
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.scheduledAt)
    if (filter === 'upcoming') {
      return isFuture(sessionDate) || isToday(sessionDate)
    }
    if (filter === 'past') {
      return isPast(sessionDate) && !isToday(sessionDate)
    }
    return true
  })
  
  // Conta sessioni
  const upcomingCount = sessions.filter(s => {
    const d = new Date(s.scheduledAt)
    return (isFuture(d) || isToday(d)) && s.status !== 'cancelled'
  }).length
  const pastCount = sessions.filter(s => {
    const d = new Date(s.scheduledAt)
    return isPast(d) && !isToday(d)
  }).length
  
  // Cancella sessione
  const handleCancel = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler cancellare questa sessione?')) return
    
    setCancellingId(sessionId)
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: isCoach ? 'coach' : 'coachee',
        updatedAt: serverTimestamp()
      })
      
      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, status: 'cancelled' } : s
      ))
    } catch (err) {
      console.error('Errore cancellazione:', err)
      alert('Errore durante la cancellazione')
    } finally {
      setCancellingId(null)
    }
  }
  
  // Badge stato
  const getStatusBadge = (status: SessionStatus, date: Date) => {
    if (status === 'cancelled') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
          <XCircle size={12} />
          Cancellata
        </span>
      )
    }
    if (status === 'completed') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircle size={12} />
          Completata
        </span>
      )
    }
    if (isToday(date)) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
          <Clock size={12} />
          Oggi
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
        <CheckCircle size={12} />
        Confermata
      </span>
    )
  }
  
  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Logo size="sm" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Le mie sessioni</h1>
                <p className="text-sm text-gray-500">
                  {upcomingCount} {upcomingCount === 1 ? 'sessione' : 'sessioni'} in programma
                </p>
              </div>
            </div>
            {!isCoach && (
              <Link
                href="/matching"
                className="btn bg-primary-500 text-white hover:bg-primary-600"
              >
                <Plus size={18} />
                Prenota
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filtri */}
            <div className="flex gap-2">
              {[
                { id: 'upcoming', label: 'In programma', count: upcomingCount },
                { id: 'past', label: 'Passate', count: pastCount },
                { id: 'all', label: 'Tutte', count: sessions.length }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.id
                      ? 'bg-charcoal text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            
            {/* Lista sessioni */}
            {filteredSessions.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredSessions.map((session, index) => {
                    const sessionDate = new Date(session.scheduledAt)
                    const isUpcoming = isFuture(sessionDate) || isToday(sessionDate)
                    const canCancel = isUpcoming && session.status !== 'cancelled'
                    
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-white rounded-xl p-5 shadow-sm ${
                          isToday(sessionDate) && session.status !== 'cancelled'
                            ? 'border-l-4 border-amber-400'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Info sessione */}
                          <div className="flex items-start gap-4">
                            {/* Data */}
                            <div className="w-14 h-14 rounded-xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-xs text-primary-600 uppercase">
                                {format(sessionDate, 'MMM', { locale: it })}
                              </span>
                              <span className="text-xl font-bold text-primary-600">
                                {format(sessionDate, 'd')}
                              </span>
                            </div>
                            
                            {/* Dettagli */}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-charcoal">
                                  {isCoach ? session.coacheeName : session.coachName}
                                </p>
                                {getStatusBadge(session.status, sessionDate)}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={14} />
                                  {format(sessionDate, 'HH:mm')} - {session.duration} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Video size={14} />
                                  Videochiamata
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Azioni */}
                          <div className="flex items-center gap-2 ml-auto">
                            {session.status !== 'cancelled' && (
                              <>
                                {isUpcoming && session.meetingUrl && (
                                  <a
                                    href={session.meetingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 flex items-center gap-2"
                                  >
                                    <Video size={16} />
                                    Partecipa
                                  </a>
                                )}
                                
                                {canCancel && (
                                  <button
                                    onClick={() => handleCancel(session.id)}
                                    disabled={cancellingId === session.id}
                                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    {cancellingId === session.id ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <XCircle size={16} />
                                    )}
                                    Cancella
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Note/riassunto (se presente) */}
                        {session.sessionSummary && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-500 flex items-start gap-2">
                              <MessageSquare size={14} className="mt-0.5 flex-shrink-0" />
                              {session.sessionSummary}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center">
                <Calendar className="text-gray-200 mx-auto mb-4" size={48} />
                <p className="text-gray-500 mb-4">
                  {filter === 'upcoming' 
                    ? 'Nessuna sessione in programma' 
                    : filter === 'past'
                    ? 'Nessuna sessione passata'
                    : 'Nessuna sessione'}
                </p>
                {!isCoach && (
                  <Link
                    href="/coaches"
                    className="text-primary-500 hover:underline"
                  >
                    Trova un coach e prenota →
                  </Link>
                )}
              </div>
            )}
            
            {/* Link disponibilità per coach */}
            {isCoach && (
              <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="text-blue-500" size={20} />
                  <p className="text-blue-700">Gestisci la tua disponibilità</p>
                </div>
                <Link
                  href="/coach/availability"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  Impostazioni <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
