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
  TrendingUp,
  ChevronRight,
  Settings,
  LogOut,
  BarChart3,
  Menu,
  X,
  Crown,
  Video,
  Clock,
  Shield
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import StarRating from '@/components/StarRating'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { LEVELS_CONFIG, getLevelFromPoints } from '@/types/community'

export default function CoachDashboardPage() {
  const router = useRouter()
  const { user, signOut, canAccessAdmin, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // ADMIN_EMAILS - redirect forzato per admin
  const ADMIN_EMAILS = ['debora.carofiglio@gmail.com']
  
  // Redirect se non loggato o se admin
  useEffect(() => {
    // Se ancora caricando, aspetta
    if (loading) return
    
    // Se non loggato, vai al login
    if (!user) {
      router.replace('/login')
      return
    }
    
    // Check sia per ruolo che per email admin
    if (user.role === 'admin' || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
      router.replace('/admin')
      return
    }
  }, [user, loading, router])
  
  // Handler logout con redirect
  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }
  
  // Stats
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    pendingReviews: 0,
    totalPoints: 0,
    currentLevel: 'rookie' as string,
    totalSessions: 0,
    upcomingSessions: 0
  })
  
  // Recent reviews
  const [recentReviews, setRecentReviews] = useState<any[]>([])
  
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
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
        
        setStats({
          totalReviews,
          averageRating: avgRating,
          pendingReviews: pending,
          totalPoints: points,
          currentLevel: level,
          totalSessions: 0, // TODO: implementare
          upcomingSessions: 0 // TODO: implementare
        })
      } catch (err) {
        console.error('Errore caricamento dati:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [user?.id])
  
  // Se non è un coach, redirect
  useEffect(() => {
    if (user && user.role !== 'coach' && user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])
  
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
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-medium">Esci</span>
      </button>
    </>
  )
  
  // Se sta ancora caricando o redirect in corso
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  if (user.role !== 'coach' && user.role !== 'admin') {
    return null
  }
  
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
      <main className="lg:ml-64 p-4 lg:p-8">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-sm text-gray-500">recensioni in attesa</p>
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
            </div>
            
            {/* Quick Actions */}
            <div className="grid sm:grid-cols-3 gap-4">
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
                href="/community/my-points"
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Trophy className="text-primary-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Punti & Livello</p>
                  <p className="text-sm text-gray-500">Vedi progressi</p>
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
    </div>
  )
}
