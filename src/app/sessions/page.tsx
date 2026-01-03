'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Video,
  Clock,
  ArrowLeft,
  RefreshCw,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle,
  User
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { format, differenceInHours } from 'date-fns'
import { it } from 'date-fns/locale'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore'

interface Session {
  id: string
  coachId: string
  coachName: string
  coachPhoto: string | null
  date: Date
  time: string
  duration: number
  status: string
  type: string
  meetingLink?: string
  offerTitle?: string
  sessionNumber?: number
  totalSessions?: number
}

export default function SessionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [pastSessions, setPastSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Funzione per verificare se può annullare (>24h prima)
  const canCancelOrReschedule = (callDate: Date) => {
    const hoursUntilCall = differenceInHours(callDate, new Date())
    return hoursUntilCall > 24
  }
  
  // Annulla sessione
  const handleCancelSession = async (sessionId: string, callDate: Date) => {
    if (!canCancelOrReschedule(callDate)) {
      alert('Non puoi annullare una sessione a meno di 24 ore dall\'inizio.')
      return
    }
    
    if (!confirm('Sei sicuro di voler annullare questa sessione?')) return
    
    setActionLoading(sessionId)
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'cancelled',
        cancelledBy: 'coachee',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (err) {
      console.error('Errore annullamento:', err)
      alert('Errore durante l\'annullamento')
    } finally {
      setActionLoading(null)
    }
  }
  
  // Rimanda sessione
  const handleRescheduleSession = async (sessionId: string, callDate: Date, coachId: string) => {
    if (!canCancelOrReschedule(callDate)) {
      alert('Non puoi rimandare una sessione a meno di 24 ore dall\'inizio.')
      return
    }
    
    if (!confirm('Vuoi rimandare questa sessione? Dovrai scegliere una nuova data.')) return
    
    setActionLoading(sessionId)
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'rescheduled',
        rescheduledBy: 'coachee',
        rescheduledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      router.push(`/booking/${coachId}`)
    } catch (err) {
      console.error('Errore rimando:', err)
      alert('Errore durante il rimando')
    } finally {
      setActionLoading(null)
    }
  }
  
  // Carica sessioni
  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Sessioni attive (pending, confirmed)
        const activeQuery = query(
          collection(db, 'sessions'),
          where('coacheeId', '==', user.id),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const activeSnap = await getDocs(activeQuery)
        
        const activeSessions = activeSnap.docs.map(doc => {
          const data = doc.data()
          const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt)
          return {
            id: doc.id,
            coachId: data.coachId,
            coachName: data.coachName || 'Coach',
            coachPhoto: data.coachPhoto || null,
            date: scheduledAt,
            time: format(scheduledAt, 'HH:mm'),
            duration: data.duration || 30,
            status: data.status,
            type: data.type,
            meetingLink: data.meetingLink,
            offerTitle: data.offerTitle,
            sessionNumber: data.sessionNumber,
            totalSessions: data.totalSessions
          }
        })
        
        // Ordina per data
        const now = new Date()
        const upcoming = activeSessions
          .filter(s => s.date >= now)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        setSessions(upcoming)
        
        // Sessioni passate (completed)
        const pastQuery = query(
          collection(db, 'sessions'),
          where('coacheeId', '==', user.id),
          where('status', '==', 'completed')
        )
        const pastSnap = await getDocs(pastQuery)
        
        const past = pastSnap.docs.map(doc => {
          const data = doc.data()
          const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt)
          return {
            id: doc.id,
            coachId: data.coachId,
            coachName: data.coachName || 'Coach',
            coachPhoto: data.coachPhoto || null,
            date: scheduledAt,
            time: format(scheduledAt, 'HH:mm'),
            duration: data.duration || 30,
            status: data.status,
            type: data.type,
            meetingLink: data.meetingLink,
            offerTitle: data.offerTitle,
            sessionNumber: data.sessionNumber,
            totalSessions: data.totalSessions
          }
        }).sort((a, b) => b.date.getTime() - a.date.getTime())
        
        setPastSessions(past)
        
      } catch (err) {
        console.error('Errore caricamento sessioni:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSessions()
  }, [user?.id])
  
  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }
  
  // Non autorizzato
  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Effettua il login per vedere le tue sessioni</p>
          <Link href="/login" className="text-primary-500 hover:underline">
            Accedi
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <Logo size="sm" />
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-charcoal mb-6 flex items-center gap-3">
          <Calendar className="text-primary-500" size={28} />
          Le mie sessioni
        </h1>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sessioni programmate */}
            <section>
              <h2 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Clock className="text-blue-500" size={20} />
                Prossime sessioni ({sessions.length})
              </h2>
              
              {sessions.length > 0 ? (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const canModify = canCancelOrReschedule(session.date)
                    const isLoading = actionLoading === session.id
                    
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar coach */}
                          {session.coachPhoto ? (
                            <img 
                              src={session.coachPhoto} 
                              alt={session.coachName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                              <User className="text-primary-500" size={24} />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <p className="font-semibold text-charcoal">{session.coachName}</p>
                            <p className="text-sm text-gray-500">
                              {format(session.date, "EEEE d MMMM yyyy", { locale: it })} alle {session.time}
                            </p>
                            <p className="text-sm text-gray-400">
                              Durata: {session.duration} minuti
                            </p>
                            
                            {/* Badge tipo e stato */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                session.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {session.status === 'confirmed' ? '✓ Confermata' : '⏳ In attesa'}
                              </span>
                              
                              {session.type === 'free_consultation' && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                  Gratuita
                                </span>
                              )}
                              
                              {session.type === 'paid_session' && session.offerTitle && (
                                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                  {session.offerTitle} #{session.sessionNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Bottone partecipa */}
                          {session.meetingLink && session.status === 'confirmed' && (
                            <a 
                              href={session.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary text-sm py-2 px-4"
                            >
                              <Video size={16} />
                              Partecipa
                            </a>
                          )}
                        </div>
                        
                        {/* Azioni rimanda/annulla */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {canModify ? (
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">
                                Puoi modificare fino a 24h prima
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRescheduleSession(session.id, session.date, session.coachId)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                >
                                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                  Rimanda
                                </button>
                                <button
                                  onClick={() => handleCancelSession(session.id, session.date)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                                >
                                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                  Annulla
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                              <AlertTriangle size={16} />
                              <p className="text-sm">
                                Meno di 24h alla sessione. Non puoi più modificare.
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center">
                  <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">
                    Nessuna sessione in programma
                  </p>
                  <Link href="/matching" className="btn btn-primary">
                    Prenota una sessione
                  </Link>
                </div>
              )}
            </section>
            
            {/* Sessioni passate */}
            {pastSessions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={20} />
                  Sessioni completate ({pastSessions.length})
                </h2>
                
                <div className="space-y-3">
                  {pastSessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4"
                    >
                      {session.coachPhoto ? (
                        <img 
                          src={session.coachPhoto} 
                          alt={session.coachName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="text-gray-400" size={20} />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <p className="font-medium text-charcoal">{session.coachName}</p>
                        <p className="text-sm text-gray-500">
                          {format(session.date, "d MMMM yyyy", { locale: it })} - {session.time}
                        </p>
                      </div>
                      
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Completata
                      </span>
                    </div>
                  ))}
                  
                  {pastSessions.length > 5 && (
                    <p className="text-center text-sm text-gray-400">
                      E altre {pastSessions.length - 5} sessioni...
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
