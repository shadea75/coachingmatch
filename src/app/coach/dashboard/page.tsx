'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Star, 
  MessageSquare, 
  Trophy,
  Users,
  Calendar,
  ChevronRight,
  Settings,
  LogOut,
  BarChart3,
  Menu,
  X,
  ShoppingBag,
  Eye,
  Target,
  TrendingUp,
  Clock,
  Mail,
  Check,
  Video,
  AlertCircle,
  Building2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import StarRating from '@/components/StarRating'
import RadarChart from '@/components/RadarChart'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { LEVELS_CONFIG, getLevelFromPoints } from '@/types/community'
import { LIFE_AREAS, LifeAreaId } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// ADMIN_EMAILS - redirect forzato per admin
const ADMIN_EMAILS = ['debora.carofiglio@gmail.com']

interface CoacheeData {
  id: string
  name: string
  email: string
  photo?: string
  areaScores?: Record<LifeAreaId, number>
  selectedObjectives?: Record<LifeAreaId, string[]>
  areasToImprove?: LifeAreaId[]
  wheelCompletedAt?: Date
  offerId?: string
  offerStatus?: string
  lastSessionDate?: Date
  source?: 'coachami' | 'external' // Nuovo campo
}

export default function CoachDashboardPage() {
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    pendingReviews: 0,
    totalPoints: 0,
    currentLevel: 'rookie' as string,
    totalSessions: 0,
    upcomingSessions: 0,
    activeCoachees: 0,
    pendingSessions: 0
  })
  const [recentReviews, setRecentReviews] = useState<any[]>([])
  const [coachees, setCoachees] = useState<CoacheeData[]>([])
  const [pendingSessions, setPendingSessions] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedCoachee, setSelectedCoachee] = useState<CoacheeData | null>(null)
  const [showCoacheeModal, setShowCoacheeModal] = useState(false)
  
  // Check se è admin
  const isAdminByEmail = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false
  const isAdminByRole = user?.role === 'admin'
  const isAdminUser = isAdminByEmail || isAdminByRole
  
  // REDIRECT per admin
  useEffect(() => {
    if (user && isAdminUser) {
      setShouldRedirect(true)
      window.location.href = '/admin'
    }
  }, [user, isAdminUser])
  
  // Redirect se non loggato
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])
  
  // Se non è un coach, redirect
  useEffect(() => {
    if (user && user.role !== 'coach' && user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])
  
  // Carica dati
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || isAdminUser) return
      
      setIsLoading(true)
      try {
        // Carica recensioni
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(3)
        )
        const reviewsSnap = await getDocs(reviewsQuery)
        const reviews = reviewsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }))
        setRecentReviews(reviews)
        
        // Carica tutte le recensioni per statistiche
        const allReviewsQuery = query(
          collection(db, 'reviews'),
          where('coachId', '==', user.id)
        )
        const allReviewsSnap = await getDocs(allReviewsQuery)
        const allReviews = allReviewsSnap.docs.map(doc => doc.data())
        
        const totalReviews = allReviews.length
        const avgRating = totalReviews > 0 
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
          : 0
        const pendingReviewsCount = allReviews.filter(r => !r.coachResponse).length
        
        // Carica punti
        const pointsQuery = query(
          collection(db, 'coachPoints'),
          where('coachId', '==', user.id)
        )
        const pointsSnap = await getDocs(pointsQuery)
        let points = 0
        let level = 'rookie'
        if (!pointsSnap.empty) {
          const pointsData = pointsSnap.docs[0].data()
          points = pointsData.totalPoints || 0
          level = getLevelFromPoints(points)
        }
        
        // Carica coachee dalle offerte attive
        const offersQuery = query(
          collection(db, 'offers'),
          where('coachId', '==', user.id),
          where('status', 'in', ['active', 'accepted', 'pending'])
        )
        const offersSnap = await getDocs(offersQuery)
        
        const coacheeIds = new Set<string>()
        const coacheeOffers: Record<string, { offerId: string, status: string }> = {}
        
        offersSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.coacheeId) {
            coacheeIds.add(data.coacheeId)
            coacheeOffers[data.coacheeId] = {
              offerId: doc.id,
              status: data.status
            }
          }
        })
        
        // Carica dati coachee
        const loadedCoachees: CoacheeData[] = []
        const coacheeIdsArray = Array.from(coacheeIds)
        for (const coacheeId of coacheeIdsArray) {
          const userDoc = await getDoc(doc(db, 'users', coacheeId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            loadedCoachees.push({
              id: coacheeId,
              name: userData.name || 'Coachee',
              email: userData.email || '',
              photo: userData.photo,
              areaScores: userData.areaScores,
              selectedObjectives: userData.selectedObjectives,
              areasToImprove: userData.areasToImprove,
              wheelCompletedAt: userData.wheelCompletedAt?.toDate?.() || null,
              offerId: coacheeOffers[coacheeId]?.offerId,
              offerStatus: coacheeOffers[coacheeId]?.status,
              source: 'coachami'
            })
          }
        }
        
        // Carica anche clienti esterni
        const externalClientsQuery = query(
          collection(db, 'coachClients'),
          where('coachId', '==', user.id)
        )
        const externalSnap = await getDocs(externalClientsQuery)
        
        for (const clientDoc of externalSnap.docs) {
          const clientData = clientDoc.data()
          
          // Cerca offerta attiva per questo cliente
          const extOfferQuery = query(
            collection(db, 'externalOffers'),
            where('coachId', '==', user.id),
            where('clientId', '==', clientDoc.id),
            where('status', 'in', ['active', 'accepted'])
          )
          const extOfferSnap = await getDocs(extOfferQuery)
          const activeOffer = extOfferSnap.docs[0]
          
          loadedCoachees.push({
            id: clientDoc.id,
            name: clientData.name || 'Cliente',
            email: clientData.email || '',
            source: 'external',
            offerId: activeOffer?.id,
            offerStatus: activeOffer?.data()?.status
          })
        }
        
        setCoachees(loadedCoachees)
        
        // Carica sessioni pendenti e upcoming
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        
        console.log('Sessioni trovate:', sessionsSnap.size) // Debug
        
        const now = new Date()
        const sessions = sessionsSnap.docs.map(doc => {
          const data = doc.data()
          console.log('Sessione:', doc.id, data) // Debug
          return {
            id: doc.id,
            coacheeName: data.coacheeName || 'Coachee',
            coacheeEmail: data.coacheeEmail || '',
            status: data.status as string,
            type: data.type as string,
            scheduledAt: data.scheduledAt?.toDate?.() || new Date(data.scheduledAt)
          }
        })
        
        // Ordina per data (ascending)
        sessions.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
        
        const pendingSessionsList = sessions.filter(s => s.status === 'pending')
        const upcoming = sessions.filter(s => s.status === 'confirmed' && s.scheduledAt > now)
        
        setPendingSessions(pendingSessionsList)
        
        setStats({
          totalReviews,
          averageRating: avgRating,
          pendingReviews: pendingReviewsCount,
          totalPoints: points,
          currentLevel: level,
          totalSessions: sessions.length,
          upcomingSessions: upcoming.length,
          activeCoachees: loadedCoachees.length,
          pendingSessions: pendingSessionsList.length
        })
      } catch (err) {
        console.error('Errore caricamento dati:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [user?.id, isAdminUser])
  
  // Conferma sessione
  const handleConfirmSession = async (sessionId: string) => {
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
      
      setPendingSessions(prev => prev.filter(s => s.id !== sessionId))
      setStats(prev => ({
        ...prev,
        pendingSessions: prev.pendingSessions - 1,
        upcomingSessions: prev.upcomingSessions + 1
      }))
      
    } catch (err) {
      console.error('Errore conferma:', err)
    } finally {
      setActionLoading(null)
    }
  }
  
  // Rifiuta sessione
  const handleRejectSession = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler rifiutare questa prenotazione?')) return
    
    setActionLoading(sessionId)
    try {
      // Recupera i dati della sessione
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId))
      if (!sessionDoc.exists()) {
        throw new Error('Sessione non trovata')
      }
      const sessionData = sessionDoc.data()
      
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'cancelled',
        cancelledBy: 'coach',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Prepara dati per email
      const scheduledAt = sessionData.scheduledAt?.toDate?.() || new Date(sessionData.scheduledAt)
      const emailData = {
        type: 'session_cancelled_by_coach',
        data: {
          coachName: user?.name || 'Coach',
          coachEmail: user?.email,
          coacheeName: sessionData.coacheeName || 'Coachee',
          coacheeEmail: sessionData.coacheeEmail,
          date: format(scheduledAt, "EEEE d MMMM yyyy", { locale: it }),
          time: format(scheduledAt, "HH:mm"),
          reason: 'cancelled'
        }
      }
      
      // Invia email al coachee
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      })
      
      setPendingSessions(prev => prev.filter(s => s.id !== sessionId))
      setStats(prev => ({
        ...prev,
        pendingSessions: prev.pendingSessions - 1
      }))
      
    } catch (err) {
      console.error('Errore rifiuto:', err)
    } finally {
      setActionLoading(null)
    }
  }
  
  // Handler logout
  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  // Apri modal coachee
  const openCoacheeDetails = (coachee: CoacheeData) => {
    setSelectedCoachee(coachee)
    setShowCoacheeModal(true)
  }
  
  // Se è admin, mostra loading
  if (shouldRedirect || isAdminUser) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Reindirizzamento al pannello admin...</p>
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  return (
    <div className="p-4 lg:p-8">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <h1 className="text-2xl font-display font-bold text-charcoal">
            Dashboard Coach
          </h1>
            
            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <Star className="text-yellow-400" size={24} />
                  <span className="text-xs text-gray-400">Rating</span>
                </div>
                <p className="text-3xl font-bold text-charcoal">
                  {stats.averageRating.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500">{stats.totalReviews} recensioni</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <Trophy className="text-primary-500" size={24} />
                  <span className="text-xs text-gray-400">Punti</span>
                </div>
                <p className="text-3xl font-bold text-charcoal">{stats.totalPoints}</p>
                <p className="text-sm text-gray-500">
                  {LEVELS_CONFIG[stats.currentLevel as keyof typeof LEVELS_CONFIG]?.label}
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <MessageSquare className="text-amber-500" size={24} />
                  <span className="text-xs text-gray-400">Da rispondere</span>
                </div>
                <p className="text-3xl font-bold text-charcoal">{stats.pendingReviews}</p>
                <p className="text-sm text-gray-500">recensioni</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="text-green-500" size={24} />
                  <span className="text-xs text-gray-400">Sessioni</span>
                </div>
                <p className="text-3xl font-bold text-charcoal">{stats.upcomingSessions}</p>
                <p className="text-sm text-gray-500">in programma</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-5 shadow-sm bg-gradient-to-br from-primary-50 to-white"
              >
                <div className="flex items-center justify-between mb-3">
                  <Users className="text-primary-500" size={24} />
                  <span className="text-xs text-gray-400">Coachee</span>
                </div>
                <p className="text-3xl font-bold text-primary-600">{stats.activeCoachees}</p>
                <p className="text-sm text-gray-500">attivi</p>
              </motion.div>
            </div>
            
            {/* Sessioni in attesa di conferma */}
            {pendingSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-yellow-500"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-charcoal flex items-center gap-2">
                    <AlertCircle size={20} className="text-yellow-500" />
                    Sessioni in attesa di conferma
                  </h2>
                  <Link 
                    href="/coach/sessions"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    Vedi tutte
                  </Link>
                </div>
                
                <div className="space-y-3">
                  {pendingSessions.slice(0, 3).map(session => (
                    <div 
                      key={session.id} 
                      className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-yellow-600 font-semibold">
                          {session.coacheeName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-charcoal truncate">{session.coacheeName}</p>
                        <p className="text-sm text-gray-500">
                          {format(session.scheduledAt, "EEE d MMM 'alle' HH:mm", { locale: it })}
                        </p>
                        {session.type === 'free_consultation' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Call gratuita
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleConfirmSession(session.id)}
                          disabled={actionLoading === session.id}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                          title="Conferma"
                        >
                          {actionLoading === session.id ? (
                            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectSession(session.id)}
                          disabled={actionLoading === session.id}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          title="Rifiuta"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {pendingSessions.length > 3 && (
                  <Link 
                    href="/coach/sessions"
                    className="block mt-4 text-center text-sm text-primary-500 hover:underline"
                  >
                    + altre {pendingSessions.length - 3} sessioni in attesa
                  </Link>
                )}
              </motion.div>
            )}
            
            {/* I Miei Coachee */}
            {coachees.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-charcoal flex items-center gap-2">
                    <Users size={20} className="text-primary-500" />
                    I Miei Coachee
                  </h2>
                  <span className="text-sm text-gray-400">{coachees.length} totali</span>
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coachees.map(coachee => (
                    <div 
                      key={coachee.id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => coachee.source === 'external' 
                        ? window.location.href = `/coach/office/clients/${coachee.id}?source=external`
                        : openCoacheeDetails(coachee)
                      }
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {coachee.photo ? (
                          <img 
                            src={coachee.photo} 
                            alt={coachee.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            coachee.source === 'external' ? 'bg-purple-100' : 'bg-primary-100'
                          }`}>
                            <span className={`font-semibold text-lg ${
                              coachee.source === 'external' ? 'text-purple-600' : 'text-primary-600'
                            }`}>
                              {coachee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-charcoal truncate">{coachee.name}</p>
                            {coachee.source === 'external' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex-shrink-0">
                                Esterno
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{coachee.email}</p>
                        </div>
                      </div>
                      
                      {/* Mini preview ruota - solo per coachami */}
                      {coachee.source !== 'external' && coachee.areaScores && Object.keys(coachee.areaScores).length > 0 ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Target size={14} />
                            <span>Ruota completata</span>
                          </div>
                          <button className="text-xs text-primary-500 flex items-center gap-1 hover:underline">
                            <Eye size={14} />
                            Vedi
                          </button>
                        </div>
                      ) : coachee.source !== 'external' ? (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={14} />
                          <span>Ruota non compilata</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-purple-500">
                          <Building2 size={14} />
                          <span>Cliente esterno</span>
                        </div>
                      )}
                      
                      {/* Status offerta */}
                      {coachee.offerStatus && (
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            coachee.offerStatus === 'active' ? 'bg-green-100 text-green-700' :
                            coachee.offerStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {coachee.offerStatus === 'active' ? 'Percorso attivo' :
                             coachee.offerStatus === 'pending' ? 'Offerta in attesa' :
                             coachee.offerStatus === 'accepted' ? 'Offerta accettata' :
                             coachee.offerStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Link
                href="/coach/office"
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Building2 className="text-purple-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Ufficio Virtuale</p>
                  <p className="text-sm text-gray-500">Gestisci clienti esterni</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
              
              <Link
                href="/coach/reviews"
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Star className="text-yellow-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Recensioni</p>
                  <p className="text-sm text-gray-500">Gestisci feedback</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
              
              <Link
                href="/community/new"
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <MessageSquare className="text-green-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Nuovo Post</p>
                  <p className="text-sm text-gray-500">Scrivi contenuto</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
            </div>
            
            {/* Recent Reviews */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-charcoal">Ultime recensioni</h2>
                <Link href="/coach/reviews" className="text-sm text-primary-500 hover:underline">
                  Vedi tutte
                </Link>
              </div>
              
              {recentReviews.length > 0 ? (
                <div className="space-y-4">
                  {recentReviews.map(review => (
                    <div key={review.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-semibold">
                          {review.coacheeName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-charcoal text-sm">{review.coacheeName}</p>
                          <StarRating rating={review.rating} readonly size="sm" />
                        </div>
                        <p className="text-gray-500 text-sm line-clamp-2 mt-1">{review.message}</p>
                        {!review.coachResponse && (
                          <span className="inline-block mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Da rispondere
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nessuna recensione ancora
                </p>
              )}
            </div>
          </motion.div>
        )}
      
      {/* Modal dettaglio coachee con ruota */}
      {showCoacheeModal && selectedCoachee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCoacheeModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {selectedCoachee.photo ? (
                  <img 
                    src={selectedCoachee.photo} 
                    alt={selectedCoachee.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-2xl">
                      {selectedCoachee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-charcoal">{selectedCoachee.name}</h2>
                  <p className="text-gray-500">{selectedCoachee.email}</p>
                </div>
                <button 
                  onClick={() => setShowCoacheeModal(false)}
                  className="ml-auto p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              {selectedCoachee.areaScores && Object.keys(selectedCoachee.areaScores).length > 0 ? (
                <>
                  {/* Radar Chart */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                      <Target size={18} className="text-primary-500" />
                      Ruota della Vita
                    </h3>
                    <div className="flex justify-center">
                      <RadarChart 
                        scores={selectedCoachee.areaScores} 
                        size={280}
                        showLabels={true}
                      />
                    </div>
                  </div>
                  
                  {/* Punteggi per area */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-charcoal mb-3">Punteggi per area</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {LIFE_AREAS.map(area => {
                        const score = selectedCoachee.areaScores?.[area.id] || 0
                        const isLow = score <= 5
                        return (
                          <div 
                            key={area.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${isLow ? 'bg-red-50' : 'bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: area.color }}
                              />
                              <span className="text-sm text-gray-700">{area.label}</span>
                            </div>
                            <span 
                              className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}
                              style={{ color: isLow ? undefined : area.color }}
                            >
                              {score}/10
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Aree da migliorare */}
                  {selectedCoachee.areasToImprove && selectedCoachee.areasToImprove.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
                        <TrendingUp size={18} className="text-amber-500" />
                        Aree prioritarie da migliorare
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCoachee.areasToImprove.map(areaId => {
                          const area = LIFE_AREAS.find(a => a.id === areaId)
                          if (!area) return null
                          return (
                            <span 
                              key={areaId}
                              className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: area.color }}
                            >
                              {area.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Obiettivi selezionati */}
                  {selectedCoachee.selectedObjectives && Object.keys(selectedCoachee.selectedObjectives).length > 0 && (
                    <div>
                      <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
                        <Target size={18} className="text-green-500" />
                        Obiettivi selezionati
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(selectedCoachee.selectedObjectives).map(([areaId, objectives]) => {
                          if (!objectives || objectives.length === 0) return null
                          const area = LIFE_AREAS.find(a => a.id === areaId)
                          if (!area) return null
                          return (
                            <div key={areaId} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium mb-2" style={{ color: area.color }}>
                                {area.label}
                              </p>
                              <ul className="space-y-1">
                                {(objectives as string[]).map((obj, idx) => (
                                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    {obj}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Data compilazione */}
                  {selectedCoachee.wheelCompletedAt && (
                    <p className="text-xs text-gray-400 mt-6 text-center">
                      Ruota compilata il {selectedCoachee.wheelCompletedAt.toLocaleDateString('it-IT')}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Target size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-6">Questo coachee non ha ancora compilato la Ruota della Vita</p>
                  
                  <div className="bg-primary-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Invita <strong>{selectedCoachee.name}</strong> a compilare la Ruota della Vita per capire meglio i suoi obiettivi prima della sessione.
                    </p>
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent('Completa la tua Ruota della Vita su CoachaMi')
                        const body = encodeURIComponent(
`Ciao ${selectedCoachee.name},

Per prepararci al meglio alla nostra sessione, ti invito a completare la Ruota della Vita su CoachaMi.

Bastano 5 minuti e mi aiuterà a capire meglio le aree su cui vorresti lavorare.

Clicca qui per iniziare: https://www.coachami.it/onboarding

A presto!
${user?.name || 'Il tuo Coach'}`)
                        window.open(`mailto:${selectedCoachee.email}?subject=${subject}&body=${body}`, '_blank')
                      }}
                      className="w-full btn btn-primary justify-center"
                    >
                      <Mail size={18} />
                      Invia invito via email
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    Oppure condividi il link: <span className="font-mono text-primary-500">coachami.it/onboarding</span>
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowCoacheeModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Chiudi
              </button>
              {selectedCoachee.offerId && (
                <Link
                  href={`/coach/offers/${selectedCoachee.offerId}`}
                  className="flex-1 btn btn-primary justify-center"
                >
                  Vedi Offerta
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
