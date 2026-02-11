'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  BarChart3,
  Settings,
  LogOut,
  Video,
  Clock,
  ChevronRight,
  Crown,
  MessageCircle,
  Menu,
  X,
  Shield,
  Gift,
  FileText,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LIFE_AREAS } from '@/types'
import RadarChart from '@/components/RadarChart'
import Logo from '@/components/Logo'
import { format, differenceInHours } from 'date-fns'
import { it } from 'date-fns/locale'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore'

export default function DashboardPage() {
  const router = useRouter()
  const { user, signOut, canAccessAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'community'>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState({ activeCoaches: 0, totalCoachees: 0 })
  const [communitySettings, setCommunitySettings] = useState({ 
    freeTrialDays: 30,
  })
  const [userCalls, setUserCalls] = useState<any[]>([])
  const [pendingOffersCount, setPendingOffersCount] = useState(0)
  const [isLoadingCalls, setIsLoadingCalls] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Funzione per verificare se può annullare (>24h prima)
  const canCancelOrReschedule = (callDate: Date) => {
    const hoursUntilCall = differenceInHours(callDate, new Date())
    return hoursUntilCall > 24
  }
  
  // Annulla sessione
  const handleCancelSession = async (sessionId: string, callDate: Date) => {
    if (!canCancelOrReschedule(callDate)) {
      alert('Non puoi annullare una sessione a meno di 24 ore dall\'inizio. La sessione verrà considerata persa.')
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
      
      setUserCalls(prev => prev.filter(c => c.id !== sessionId))
    } catch (err) {
      console.error('Errore annullamento:', err)
      alert('Errore durante l\'annullamento')
    } finally {
      setActionLoading(null)
    }
  }
  
  // Rimanda sessione
  const handleRescheduleSession = async (sessionId: string, callDate: Date) => {
    if (!canCancelOrReschedule(callDate)) {
      alert('Non puoi rimandare una sessione a meno di 24 ore dall\'inizio. La sessione verrà considerata persa.')
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
      
      setUserCalls(prev => prev.filter(c => c.id !== sessionId))
      // TODO: Redirect a pagina booking per scegliere nuova data
      alert('Sessione rimandata. Prenota una nuova data.')
    } catch (err) {
      console.error('Errore rimando:', err)
      alert('Errore durante il rimando')
    } finally {
      setActionLoading(null)
    }
  }
  
  // Redirect coach alla loro dashboard, admin alla dashboard admin
  useEffect(() => {
    if (user?.role === 'admin') {
      router.push('/admin')
    } else if (user?.role === 'coach') {
      router.push('/coach/dashboard')
    }
  }, [user?.role, router])
  
  // Carica statistiche reali e offerte pendenti
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Conta coach approvati
        const coachesQuery = query(
          collection(db, 'coachApplications'),
          where('status', '==', 'approved')
        )
        const coachesSnap = await getDocs(coachesQuery)
        
        // Conta utenti coachee
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'coachee')
        )
        const usersSnap = await getDocs(usersQuery)
        
        setStats({
          activeCoaches: coachesSnap.size,
          totalCoachees: usersSnap.size
        })
        
        // Carica impostazioni community
        const settingsDoc = await getDoc(doc(db, 'settings', 'community'))
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setCommunitySettings({
            freeTrialDays: data.freeTrialDays ?? 30,
          })
        }
        
        // Conta offerte pendenti per l'utente
        if (user?.id) {
          const offersQuery = query(
            collection(db, 'offers'),
            where('coacheeId', '==', user.id),
            where('status', '==', 'pending')
          )
          const offersSnap = await getDocs(offersQuery)
          setPendingOffersCount(offersSnap.size)
        }
      } catch (err) {
        console.error('Errore caricamento stats:', err)
      }
    }
    loadStats()
  }, [user?.id])
  
  // Carica le sessioni/call dell'utente
  useEffect(() => {
    const loadUserCalls = async () => {
      if (!user?.id) return
      
      setIsLoadingCalls(true)
      try {
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coacheeId', '==', user.id),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        
        const calls = sessionsSnap.docs.map(doc => {
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
            meetingLink: data.meetingLink
          }
        })
        
        // Ordina per data (prossime prima) e filtra solo le future
        const now = new Date()
        const upcomingCalls = calls
          .filter(call => call.date >= now)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        setUserCalls(upcomingCalls)
      } catch (err) {
        console.error('Errore caricamento sessioni:', err)
      } finally {
        setIsLoadingCalls(false)
      }
    }
    
    loadUserCalls()
  }, [user?.id])
  
  // Calcola se l'utente è nel periodo di prova gratuito (30 giorni dalla registrazione)
  const isInFreeTrial = () => {
    if (!user?.createdAt) return false
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)
    const trialEndDate = new Date(createdAt.getTime() + communitySettings.freeTrialDays * 24 * 60 * 60 * 1000)
    return new Date() < trialEndDate
  }
  
  const daysLeftInTrial = () => {
    if (!user?.createdAt) return 0
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)
    const trialEndDate = new Date(createdAt.getTime() + communitySettings.freeTrialDays * 24 * 60 * 60 * 1000)
    const daysLeft = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, daysLeft)
  }
  
  // Accesso community: abbonamento attivo O periodo di prova (30 giorni)
  const canAccessCommunity = user?.membershipStatus === 'active' || isInFreeTrial()
  
  // Mock area scores
  const mockScores = user?.areaScores || {
    salute: 6,
    finanze: 5,
    carriera: 7,
    relazioni: 8,
    amore: 7,
    crescita: 5,
    spiritualita: 6,
    divertimento: 4
  }

  const NavItems = () => (
    <>
      <button
        onClick={() => setActiveTab('overview')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          activeTab === 'overview' 
            ? 'bg-primary-50 text-primary-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <BarChart3 size={20} />
        <span className="font-medium">Panoramica</span>
      </button>
      
      <button
        onClick={() => setActiveTab('calls')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          activeTab === 'calls' 
            ? 'bg-primary-50 text-primary-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Calendar size={20} />
        <span className="font-medium">Le mie call</span>
      </button>
      
      {/* NUOVO: Link Offerte */}
      <Link
        href="/offers"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <FileText size={20} />
        <span className="font-medium">Offerte</span>
        {pendingOffersCount > 0 && (
          <span className="ml-auto bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
            {pendingOffersCount}
          </span>
        )}
      </Link>
      
      {/* Link Messaggi */}
      <Link
        href="/messages"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <MessageCircle size={20} />
        <span className="font-medium">Messaggi</span>
      </Link>
      
      {/* Link I miei acquisti */}
      <Link
        href="/dashboard/purchases"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Gift size={20} />
        <span className="font-medium">I miei acquisti</span>
      </Link>
      
      <button
        onClick={() => setActiveTab('community')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          activeTab === 'community' 
            ? 'bg-primary-50 text-primary-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Users size={20} />
        <span className="font-medium">Community</span>
        {user?.membershipStatus !== 'active' && (
          <Crown size={16} className="text-amber-500 ml-auto" />
        )}
      </button>
      
      {/* Admin Panel - solo per admin/moderatori */}
      {canAccessAdmin && (
        <>
          <div className="border-t border-gray-100 my-4" />
          <Link
            href="/admin"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <Shield size={20} />
            <span className="font-medium">Pannello Admin</span>
          </Link>
        </>
      )}
      
      <div className="border-t border-gray-100 my-4" />
      
      <Link
        href="/settings"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Settings size={20} />
        <span className="font-medium">Impostazioni</span>
      </Link>
      
      <button
        onClick={() => signOut()}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-medium">Esci</span>
      </button>
    </>
  )
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-6">
              <p className="text-sm text-gray-500">Ciao,</p>
              <p className="font-semibold text-charcoal">{user?.name}</p>
            </div>
            <nav className="space-y-2">
              <NavItems />
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 hidden lg:block">
        <Link href="/" className="block mb-8">
          <Logo size="md" />
        </Link>
        
        <div className="mb-6">
          <p className="text-sm text-gray-500">Ciao,</p>
          <p className="font-semibold text-charcoal">{user?.name}</p>
        </div>
        
        <nav className="space-y-2">
          <NavItems />
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h1 className="text-2xl font-display font-bold text-charcoal">
              La tua panoramica
            </h1>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Radar Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6">
                <h2 className="font-semibold text-charcoal mb-4">Le tue aree della vita</h2>
                <RadarChart scores={mockScores} />
                
                {/* Score Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  {Object.entries(mockScores).map(([key, value]) => {
                    const area = LIFE_AREAS[key as keyof typeof LIFE_AREAS]
                    if (!area || typeof area !== 'object' || !('label' in area)) return null
                    return (
                      <div key={key} className="bg-cream rounded-xl p-3">
                        <p className="text-xs text-gray-500">{area.label}</p>
                        <p className="text-xl font-bold text-primary-500">{value}/10</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Next Call Card */}
              <div className="bg-white rounded-2xl p-6">
                <h2 className="font-semibold text-charcoal mb-4">Prossima call</h2>
                
                {isLoadingCalls ? (
                  <div className="text-center py-4">
                    <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : userCalls.length > 0 ? (
                  <div className="flex items-center gap-3">
                    {userCalls[0].coachPhoto ? (
                      <img 
                        src={userCalls[0].coachPhoto}
                        alt={userCalls[0].coachName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-charcoal">{userCalls[0].coachName}</p>
                      <p className="text-sm text-gray-500">
                        {format(userCalls[0].date, "EEEE d MMMM", { locale: it })} alle {userCalls[0].time}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        userCalls[0].status === 'confirmed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {userCalls[0].status === 'confirmed' ? 'Confermata' : 'In attesa'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 mb-4">Nessuna call in programma</p>
                    <Link href="/matching" className="btn btn-primary text-sm">
                      Trova un coach
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Link 
                href="/matching"
                className="bg-white rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Trova coach</p>
                  <p className="text-sm text-gray-500">Scopri nuovi match</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
              
              <Link 
                href="/onboarding"
                className="bg-white rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Rivaluta aree</p>
                  <p className="text-sm text-gray-500">Aggiorna il profilo</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
              
              <button 
                onClick={() => setActiveTab('community')}
                className="bg-white rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Community</p>
                  <p className="text-sm text-gray-500">Unisciti alla chat</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Le mie call
            </h1>
            
            <div className="bg-white rounded-2xl p-6">
              <h2 className="font-semibold text-charcoal mb-4">Prossime call</h2>
              
              {isLoadingCalls ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-500 mt-2">Caricamento...</p>
                </div>
              ) : userCalls.length > 0 ? (
                <div className="space-y-4">
                  {userCalls.map(call => {
                    const canModify = canCancelOrReschedule(call.date)
                    const hoursLeft = differenceInHours(call.date, new Date())
                    const isLoading = actionLoading === call.id
                    
                    return (
                      <div key={call.id} className="bg-cream rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          {call.coachPhoto ? (
                            <img 
                              src={call.coachPhoto}
                              alt={call.coachName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                              <Users className="w-6 h-6 text-primary-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-charcoal">{call.coachName}</p>
                            <p className="text-sm text-gray-500">
                              {format(call.date, "EEEE d MMMM", { locale: it })} alle {call.time}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                call.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {call.status === 'confirmed' ? 'Confermata' : 'In attesa'}
                              </span>
                              {call.type === 'free_consultation' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  Gratuita
                                </span>
                              )}
                            </div>
                          </div>
                          {call.meetingLink && call.status === 'confirmed' && (
                            <a 
                              href={call.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary text-sm py-2"
                            >
                              <Video size={16} />
                              Partecipa
                            </a>
                          )}
                        </div>
                        
                        {/* Azioni rimanda/annulla */}
                        {call.status !== 'cancelled' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            {canModify ? (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-400">
                                  Puoi modificare fino a 24h prima della sessione
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRescheduleSession(call.id, call.date)}
                                    disabled={isLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                  >
                                    <RefreshCw size={14} />
                                    Rimanda
                                  </button>
                                  <button
                                    onClick={() => handleCancelSession(call.id, call.date)}
                                    disabled={isLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                                  >
                                    <X size={14} />
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                <AlertTriangle size={16} />
                                <p className="text-sm">
                                  Non puoi più modificare (meno di 24h). Se non partecipi, la sessione sarà persa.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">
                    Nessuna call in programma
                  </p>
                  <Link href="/matching" className="btn btn-primary">
                    Prenota una call
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Community Tab */}
        {activeTab === 'community' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Community
            </h1>
            
            {canAccessCommunity ? (
              <div className="space-y-4">
                {/* Banner periodo gratuito */}
                {isInFreeTrial() && user?.membershipStatus !== 'active' && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white flex items-center gap-3">
                    <Gift size={24} />
                    <div className="flex-1">
                      <p className="font-semibold">Periodo di prova gratuito!</p>
                      <p className="text-sm text-green-100">
                        Ti restano {daysLeftInTrial()} giorni di accesso gratuito alla community
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="font-semibold text-charcoal mb-4">Accedi alla Community</h2>
                  <p className="text-gray-500 mb-6">
                    Interagisci con coach e altri coachee, scopri contenuti esclusivi e partecipa agli eventi.
                  </p>
                  <Link 
                    href="/community"
                    className="btn bg-primary-500 text-white hover:bg-primary-600 w-full justify-center"
                  >
                    <Users size={20} />
                    Entra nella Community
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-display font-bold text-charcoal mb-2">
                  Unisciti alla Community
                </h2>
                <p className="text-gray-500 mb-6">
                  Accedi a contenuti esclusivi, eventi con i coach, 
                  e connettiti con altri membri del percorso.
                </p>
                
                <div className="bg-cream rounded-xl p-4 mb-6 text-left">
                  <p className="font-medium text-charcoal mb-2">Cosa include:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Canali per area della vita
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Domande guidate settimanali
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Eventi online con coach
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Priorità nel matching
                    </li>
                  </ul>
                </div>
                
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/community-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: user?.id,
                          userEmail: user?.email,
                          userName: user?.name || user?.email?.split('@')[0]
                        })
                      })
                      const data = await res.json()
                      if (data.url) {
                        window.location.href = data.url
                      }
                    } catch (err) {
                      console.error('Errore abbonamento:', err)
                    }
                  }}
                  className="btn btn-primary w-full"
                >
                  Abbonati a €29/mese
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Il periodo di prova gratuito è terminato
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
