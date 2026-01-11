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
  X,
  ArrowLeft,
  Target
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [isCoach, setIsCoach] = useState(false)
  const [coachData, setCoachData] = useState({
    name: 'Coach',
    level: 'Rookie',
    pendingSessions: 0,
    pendingReviews: 0
  })
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user?.id) {
        setIsDataLoading(false)
        return
      }

      try {
        // Verifica se è un coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        if (coachDoc.exists() && coachDoc.data().status === 'approved') {
          setIsCoach(true)
          
          const name = coachDoc.data().name || user.name || 'Coach'

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

          // Conta sessioni attive (da sessions + externalSessions)
          let pendingSessions = 0
          try {
            const pendingQuery = query(
              collection(db, 'sessions'),
              where('coachId', '==', user.id),
              where('status', '==', 'pending')
            )
            const pendingSnap = await getDocs(pendingQuery)
            
            const confirmedQuery = query(
              collection(db, 'sessions'),
              where('coachId', '==', user.id),
              where('status', '==', 'confirmed')
            )
            const confirmedSnap = await getDocs(confirmedQuery)
            
            const now = new Date()
            const futureConfirmed = confirmedSnap.docs.filter(doc => {
              const data = doc.data()
              const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt)
              return scheduledAt > now
            })
            
            // Conta anche sessioni esterne
            const extPendingQuery = query(
              collection(db, 'externalSessions'),
              where('coachId', '==', user.id),
              where('status', '==', 'pending')
            )
            const extPendingSnap = await getDocs(extPendingQuery)
            
            const extConfirmedQuery = query(
              collection(db, 'externalSessions'),
              where('coachId', '==', user.id),
              where('status', '==', 'confirmed')
            )
            const extConfirmedSnap = await getDocs(extConfirmedQuery)
            
            const extFutureConfirmed = extConfirmedSnap.docs.filter(doc => {
              const data = doc.data()
              const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt)
              return scheduledAt > now
            })
            
            pendingSessions = pendingSnap.size + futureConfirmed.length + extPendingSnap.size + extFutureConfirmed.length
          } catch (e) {
            console.error('Errore conteggio sessioni:', e)
          }

          setCoachData({
            name,
            level,
            pendingSessions,
            pendingReviews: 0
          })
        }
      } catch (err) {
        console.error('Errore verifica ruolo:', err)
      } finally {
        setIsDataLoading(false)
      }
    }

    if (!loading) {
      checkUserRole()
    }
  }, [user, loading])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  // Loading state
  if (loading || isDataLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Se non è coach, mostra solo il contenuto con un header semplice
  if (!isCoach) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <Logo size="sm" />
            </div>
          </div>
        </header>
        {children}
      </div>
    )
  }

  // Se è coach, mostra la sidebar
  const navItems = [
    { href: '/coach/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/coach/sessions', label: 'Sessioni', icon: Video, badge: coachData.pendingSessions },
    { href: '/coach/office', label: 'Ufficio Virtuale', icon: Building2 },
    { href: '/coach/reviews', label: 'Recensioni', icon: Star },
    { href: '/community/my-points', label: 'I miei punti', icon: Trophy },
    { href: '/coach/availability', label: 'Disponibilità', icon: Calendar },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/coach/come-funziona-il-match', label: 'Come funziona il Match', icon: Target },
    { href: '/coach/settings', label: 'Impostazioni', icon: Settings },
  ]

  const isActive = (href: string) => {
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
        <div className="lg:hidden h-16" />
        {children}
      </main>
    </div>
  )
}
