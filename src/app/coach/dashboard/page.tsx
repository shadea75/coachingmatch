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
  Mail
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import StarRating from '@/components/StarRating'
import RadarChart from '@/components/RadarChart'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { LEVELS_CONFIG, getLevelFromPoints } from '@/types/community'
import { LIFE_AREAS, LifeAreaId } from '@/types'

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
    activeCoachees: 0
  })
  const [recentReviews, setRecentReviews] = useState<any[]>([])
  const [coachees, setCoachees] = useState<CoacheeData[]>([])
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
        const pending = allReviews.filter(r => !r.coachResponse).length
        
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
              offerStatus: coacheeOffers[coacheeId]?.status
            })
          }
        }
        
        setCoachees(loadedCoachees)
        
        setStats({
          totalReviews,
          averageRating: avgRating,
          pendingReviews: pending,
          totalPoints: points,
          currentLevel: level,
          totalSessions: 0,
          upcomingSessions: 0,
          activeCoachees: loadedCoachees.length
        })
      } catch (err) {
        console.error('Errore caricamento dati:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [user?.id, isAdminUser])
  
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
  
  const NavItems = () => (
    <>
      <Link
        href="/coach/dashboard"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 text-primary-600"
      >
        <BarChart3 size={20} />
        <span className="font-medium">Dashboard</span>
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
        {stats.pendingReviews > 0 && (
          <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
            {stats.pendingReviews}
          </span>
        )}
      </Link>
      
      <Link
        href="/community/my-points"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Trophy size={20} />
        <span className="font-medium">I miei punti</span>
      </Link>
      
      <Link
        href="/community"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Users size={20} />
        <span className="font-medium">Community</span>
      </Link>
      
      <Link
        href="/settings"
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-6">
              <p className="text-sm text-gray-500">Coach</p>
              <p className="font-semibold text-charcoal">{user?.name || 'Coach'}</p>
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
          <p className="text-sm text-gray-500">Coach</p>
          <p className="font-semibold text-charcoal">{user?.name || 'Coach'}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg">{LEVELS_CONFIG[stats.currentLevel as keyof typeof LEVELS_CONFIG]?.icon}</span>
            <span className="text-xs text-gray-500">
              {LEVELS_CONFIG[stats.currentLevel as keyof typeof LEVELS_CONFIG]?.label}
            </span>
          </div>
        </div>
        
        <nav className="space-y-2">
          <NavItems />
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
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
                      onClick={() => openCoacheeDetails(coachee)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {coachee.photo ? (
                          <img 
                            src={coachee.photo} 
                            alt={coachee.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold text-lg">
                              {coachee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-charcoal truncate">{coachee.name}</p>
                          <p className="text-xs text-gray-400 truncate">{coachee.email}</p>
                        </div>
                      </div>
                      
                      {/* Mini preview ruota */}
                      {coachee.areaScores && Object.keys(coachee.areaScores).length > 0 ? (
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
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={14} />
                          <span>Ruota non compilata</span>
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
                href="/coach/offers/new"
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <ShoppingBag className="text-primary-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Nuova Offerta</p>
                  <p className="text-sm text-gray-500">Crea percorso</p>
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
      </main>
      
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
