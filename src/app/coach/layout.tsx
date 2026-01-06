'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Video,
  Building2,
  Star,
  Trophy,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

// Pagine che NON devono avere la sidebar
const PAGES_WITHOUT_SIDEBAR = [
  '/coach/apply',
  '/coach/register',
  '/coach/application-success',
  '/coach/stripe-onboarding'
]

export default function CoachLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [coachData, setCoachData] = useState({
    name: 'Coach',
    level: 'Rookie',
    pendingSessions: 0,
    pendingReviews: 0
  })
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Verifica se la pagina corrente deve mostrare la sidebar
  const shouldShowSidebar = !PAGES_WITHOUT_SIDEBAR.some(page => pathname?.startsWith(page))

  useEffect(() => {
    if (!loading && !user && shouldShowSidebar) {
      router.replace('/login')
      return
    }

    const loadCoachData = async () => {
      if (!user?.id || !shouldShowSidebar) {
        setIsDataLoading(false)
        return
      }

      try {
        // Carica dati coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        let name = user.name || 'Coach'
        if (coachDoc.exists()) {
          name = coachDoc.data().name || name
        }

        // Carica punti per il livello
        const pointsDoc = await getDoc(doc(db, 'coachPoints', user.id))
        let level = 'Rookie'
        if (pointsDoc.exists()) {
          const points = pointsDoc.data().totalPoints || 0
          if (points >= 5000) level = 'Elite'
          else if (points >= 2000) level = 'Master'
          else if (points >= 500) level = 'Expert'
          else if (points >= 100) level = 'Pro'
        }

        // Conta sessioni pending
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id),
          where('status', '==', 'pending')
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        const pendingSessions = sessionsSnap.size

        // Conta recensioni pending
        let pendingReviews = 0
        try {
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('coachId', '==', user.id),
            where('isRead', '==', false)
          )
          const reviewsSnap = await getDocs(reviewsQuery)
          pendingReviews = reviewsSnap.size
        } catch (e) {
          // Ignora se il campo isRead non esiste
        }

        setCoachData({
          name,
          level,
          pendingSessions,
          pendingReviews
        })
      } catch (err) {
        console.error('Errore caricamento dati coach:', err)
      } finally {
        setIsDataLoading(false)
      }
    }

    if (user) {
      loadCoachData()
    } else {
      setIsDataLoading(false)
    }
  }, [user, loading, router, shouldShowSidebar])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  // Se non deve mostrare sidebar, renderizza solo children
  if (!shouldShowSidebar) {
    return <>{children}</>
  }

  // Loading state
  if (loading || isDataLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const navItems = [
    { href: '/coach/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/coach/sessions', label: 'Sessioni', icon: Video, badge: coachData.pendingSessions },
    { href: '/coach/office', label: 'Ufficio Virtuale', icon: Building2 },
    { href: '/coach/reviews', label: 'Recensioni', icon: Star, badge: coachData.pendingReviews },
    { href: '/community/my-points', label: 'I miei punti', icon: Trophy },
    { href: '/coach/availability', label: 'Disponibilità', icon: Calendar },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/coach/settings', label: 'Impostazioni', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/coach/dashboard') {
      return pathname === href
    }
    // Per community, verifica esattamente
    if (href === '/community') {
      return pathname === '/community'
    }
    if (href === '/community/my-points') {
      return pathname?.startsWith('/community/my-points')
    }
    return pathname?.startsWith(href)
  }

  const NavContent = () => (
    <>
      {/* Logo e info coach */}
      <div className="p-4 border-b border-gray-100">
        <Link href="/coach/dashboard">
          <Logo size="sm" />
        </Link>
        <div className="mt-4">
          <p className="text-xs text-gray-400">Coach</p>
          <p className="font-semibold text-charcoal truncate">{coachData.name}</p>
          <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
            🌱 {coachData.level}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Esci</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-gray-200 z-40">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/coach/dashboard">
            <Logo size="sm" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-xl"
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:pl-64">
        {/* Mobile spacer */}
        <div className="lg:hidden h-16" />
        {children}
      </main>
    </div>
  )
}
