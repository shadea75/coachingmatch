'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Calendar,
  Clock,
  User,
  Check,
  X,
  RefreshCw,
  Video,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  BarChart3,
  ShoppingBag,
  Star,
  Trophy,
  Users,
  Settings,
  LogOut,
  Menu,
  Filter
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy, serverTimestamp } from 'firebase/firestore'
import { format, differenceInHours, isPast } from 'date-fns'
import { it } from 'date-fns/locale'

interface Session {
  id: string
  coacheeId: string
  coacheeName: string
  coacheeEmail: string
  coacheePhoto?: string
  scheduledAt: Date
  duration: number
  status: 'pending' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show'
  type: 'free_consultation' | 'paid_session'
  notes?: string
  createdAt: Date
}

export default function CoachSessionsPage() {
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'past'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  
  // Redirect se non loggato o non coach
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    } else if (user && user.role !== 'coach' && user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, loading, router])
  
  // Carica sessioni
  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Query senza orderBy per evitare indici compositi
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id)
        )
        const snap = await getDocs(sessionsQuery)
        
        console.log('Sessioni trovate in /coach/sessions:', snap.size) // Debug
        
        const loadedSessions: Session[] = snap.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            coacheeId: data.coacheeId,
            coacheeName: data.coacheeName || 'Coachee',
            coacheeEmail: data.coacheeEmail || '',
            coacheePhoto: data.coacheePhoto,
            scheduledAt: data.scheduledAt?.toDate?.() || new Date(data.scheduledAt),
            duration: data.duration || 30,
            status: data.status || 'pending',
            type: data.type || 'free_consultation',
            notes: data.notes,
            createdAt: data.createdAt?.toDate?.() || new Date()
          }
        })
        
        // Ordina per data (ascending)
        loadedSessions.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
        
        setSessions(loadedSessions)
        setPendingCount(loadedSessions.filter(s => s.status === 'pending').length)
      } catch (err) {
        console.error('Errore caricamento sessioni:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSessions()
  }, [user?.id])
  
  // Filtra sessioni
  const filteredSessions = sessions.filter(session => {
    const now = new Date()
    switch (filter) {
      case 'pending':
        return session.status === 'pending'
      case 'confirmed':
        return session.status === 'confirmed' && session.scheduledAt >= now
      case 'past':
        return session.scheduledAt < now || ['completed', 'cancelled', 'no_show'].includes(session.status)
      default:
        return true
    }
  })
  
  // Azioni sessione
  const handleConfirm = async (sessionId: string) => {
    setActionLoading(sessionId)
    try {
      // Recupera i dati della sessione
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId))
      if (!sessionDoc.exists()) {
        throw new Error('Sessione non trovata')
      }
      const sessionData = sessionDoc.data()
      
      // Aggiorna stato
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Prepara dati per email
      const scheduledAt = sessionData.scheduledAt?.toDate?.() || new Date(sessionData.scheduledAt)
      const emailData = {
        type: 'session_confirmed',
        data: {
          sessionId,
          coachId: user?.id,
          coachName: user?.name || 'Coach',
          coachEmail: user?.email,
          coacheeId: sessionData.coacheeId,
          coacheeName: sessionData.coacheeName || 'Coachee',
          coacheeEmail: sessionData.coacheeEmail,
          date: format(scheduledAt, "EEEE d MMMM yyyy", { locale: it }),
          time: format(scheduledAt, "HH:mm"),
          duration: sessionData.duration || 30,
          sessionDate: scheduledAt.toISOString(),
          type: sessionData.type
        }
      }
      
      // Invia email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      })
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'confirmed' as const } : s
      ))
      setPendingCount(prev => prev - 1)
      
    } catch (err) {
      console.error('Errore conferma:', err)
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleReject = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler rifiutare questa prenotazione?')) return
    
    setActionLoading(sessionId)
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'cancelled',
        cancelledBy: 'coach',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'cancelled' as const } : s
      ))
      setPendingCount(prev => prev - 1)
      
      // TODO: Invia email al coachee
    } catch (err) {
      console.error('Errore rifiuto:', err)
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleCancel = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler annullare questa sessione?')) return
    
    setActionLoading(sessionId)
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'cancelled',
        cancelledBy: 'coach',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'cancelled' as const } : s
      ))
      
      // TODO: Invia email al coachee
    } catch (err) {
      console.error('Errore annullamento:', err)
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleReschedule = (session: Session) => {
    setSelectedSession(session)
    setShowRescheduleModal(true)
  }
  
  const handleMarkCompleted = async (sessionId: string) => {
    setActionLoading(sessionId)
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'completed' as const } : s
      ))
    } catch (err) {
      console.error('Errore completamento:', err)
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleMarkNoShow = async (sessionId: string) => {
    if (!confirm('Confermi che il coachee non si è presentato?')) return
    
    setActionLoading(sessionId)
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'no_show',
        updatedAt: serverTimestamp()
      })
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'no_show' as const } : s
      ))
    } catch (err) {
      console.error('Errore no show:', err)
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">In attesa</span>
      case 'confirmed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Confermata</span>
      case 'rescheduled':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Rimandata</span>
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Annullata</span>
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Completata</span>
      case 'no_show':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Non presentato</span>
      default:
        return null
    }
  }
  
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  const NavItems = () => (
    <>
      <Link
        href="/coach/dashboard"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <BarChart3 size={20} />
        <span className="font-medium">Dashboard</span>
      </Link>
      
      <Link
        href="/coach/sessions"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 text-primary-600"
      >
        <Calendar size={20} />
        <span className="font-medium">Sessioni</span>
        {pendingCount > 0 && (
          <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </Link>
      
      <Link
        href="/coach/offers"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <ShoppingBag size={20} />
        <span className="font-medium">Le mie Offerte</span>
      </Link>
      
      <Link
        href="/coach/reviews"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Star size={20} />
        <span className="font-medium">Recensioni</span>
      </Link>
      
      <Link
        href="/community/my-points"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Trophy size={20} />
        <span className="font-medium">I miei punti</span>
      </Link>
      
      <Link
        href="/coach/availability"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Clock size={20} />
        <span className="font-medium">Disponibilità</span>
      </Link>
      
      <Link
        href="/community"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Users size={20} />
        <span className="font-medium">Community</span>
      </Link>
      
      <Link
        href="/coach/settings"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Settings size={20} />
        <span className="font-medium">Impostazioni</span>
      </Link>
      
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-medium">Esci</span>
      </button>
    </>
  )
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <Logo size="sm" />
        <div className="w-6" />
      </header>
      
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Logo size="md" />
              <button onClick={() => setSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">Coach</p>
              <p className="font-semibold text-charcoal">{user?.name}</p>
            </div>
            <nav className="space-y-2">
              <NavItems />
            </nav>
          </div>
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 hidden lg:block overflow-y-auto">
        <Link href="/" className="block mb-8">
          <Logo size="md" />
        </Link>
        
        <div className="mb-6">
          <p className="text-sm text-gray-500">Coach</p>
          <p className="font-semibold text-charcoal">{user?.name}</p>
        </div>
        
        <nav className="space-y-2">
          <NavItems />
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Le mie Sessioni
            </h1>
            
            {pendingCount > 0 && (
              <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl flex items-center gap-2">
                <AlertCircle size={18} />
                <span className="font-medium">{pendingCount} in attesa di conferma</span>
              </div>
            )}
          </div>
          
          {/* Filtri */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'Tutte' },
              { id: 'pending', label: 'In attesa' },
              { id: 'confirmed', label: 'Confermate' },
              { id: 'past', label: 'Passate' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  filter === f.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
                {f.id === 'pending' && pendingCount > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Lista Sessioni */}
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nessuna sessione trovata</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map(session => {
                const isLoading = actionLoading === session.id
                const sessionPast = isPast(session.scheduledAt)
                const canMarkComplete = session.status === 'confirmed' && sessionPast
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-xl p-5 border ${
                      session.status === 'pending' 
                        ? 'border-yellow-200 bg-yellow-50/30' 
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      {session.coacheePhoto ? (
                        <img 
                          src={session.coacheePhoto}
                          alt={session.coacheeName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-600 font-semibold">
                            {session.coacheeName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-charcoal">{session.coacheeName}</p>
                          {getStatusBadge(session.status)}
                          {session.type === 'free_consultation' && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                              Gratuita
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{session.coacheeEmail}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Calendar size={14} />
                            {format(session.scheduledAt, "EEEE d MMMM yyyy", { locale: it })}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock size={14} />
                            {format(session.scheduledAt, "HH:mm")} • {session.duration} min
                          </span>
                        </div>
                      </div>
                      
                      {/* Azioni */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Sessione in attesa - Conferma/Rifiuta */}
                        {session.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleConfirm(session.id)}
                              disabled={isLoading}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                              title="Conferma"
                            >
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check size={20} />
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(session.id)}
                              disabled={isLoading}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                              title="Rifiuta"
                            >
                              <X size={20} />
                            </button>
                          </>
                        )}
                        
                        {/* Sessione confermata - Rimanda/Annulla */}
                        {session.status === 'confirmed' && !sessionPast && (
                          <>
                            <button
                              onClick={() => handleReschedule(session)}
                              disabled={isLoading}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                              title="Rimanda"
                            >
                              <RefreshCw size={20} />
                            </button>
                            <button
                              onClick={() => handleCancel(session.id)}
                              disabled={isLoading}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                              title="Annulla"
                            >
                              <X size={20} />
                            </button>
                          </>
                        )}
                        
                        {/* Sessione passata e confermata - Completa/No Show */}
                        {canMarkComplete && (
                          <>
                            <button
                              onClick={() => handleMarkCompleted(session.id)}
                              disabled={isLoading}
                              className="px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 text-sm font-medium"
                            >
                              <CheckCircle size={16} className="inline mr-1" />
                              Completata
                            </button>
                            <button
                              onClick={() => handleMarkNoShow(session.id)}
                              disabled={isLoading}
                              className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm font-medium"
                            >
                              <XCircle size={16} className="inline mr-1" />
                              No show
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      
      {/* Modal Rimanda */}
      {showRescheduleModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRescheduleModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-bold text-charcoal mb-4">Rimanda sessione</h2>
            
            <p className="text-gray-600 mb-4">
              Stai per rimandare la sessione con <strong>{selectedSession.coacheeName}</strong> 
              programmata per il {format(selectedSession.scheduledAt, "d MMMM 'alle' HH:mm", { locale: it })}.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-yellow-700 text-sm">
                <strong>Nota:</strong> Il coachee riceverà una notifica e dovrà scegliere una nuova data.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={async () => {
                  setActionLoading(selectedSession.id)
                  try {
                    await updateDoc(doc(db, 'sessions', selectedSession.id), {
                      status: 'rescheduled',
                      rescheduledBy: 'coach',
                      rescheduledAt: serverTimestamp(),
                      updatedAt: serverTimestamp()
                    })
                    
                    setSessions(prev => prev.map(s => 
                      s.id === selectedSession.id ? { ...s, status: 'rescheduled' as const } : s
                    ))
                    
                    setShowRescheduleModal(false)
                    // TODO: Invia email al coachee
                  } catch (err) {
                    console.error('Errore rimando:', err)
                  } finally {
                    setActionLoading(null)
                  }
                }}
                disabled={actionLoading === selectedSession.id}
                className="flex-1 btn btn-primary"
              >
                {actionLoading === selectedSession.id ? 'Invio...' : 'Conferma rimando'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
