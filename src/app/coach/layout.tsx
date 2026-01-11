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
  AlertTriangle,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Clock,
  Target,
  FileText
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
  '/coach/stripe-onboarding',
  '/coach/subscription' // Anche subscription non deve avere sidebar
]

// Pagine accessibili anche con abbonamento scaduto
const PAGES_ALLOWED_WHEN_EXPIRED = [
  '/coach/subscription'
]

type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'free' | 'loading'

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
  
  // Stato abbonamento
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading')
  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(19)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)

  // Verifica se la pagina corrente deve mostrare la sidebar
  const shouldShowSidebar = !PAGES_WITHOUT_SIDEBAR.some(page => pathname?.startsWith(page))
  
  // Verifica se la pagina è accessibile con abbonamento scaduto
  const isAllowedWhenExpired = PAGES_ALLOWED_WHEN_EXPIRED.some(page => pathname?.startsWith(page))

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
        let subStatus: SubscriptionStatus = 'trial'
        let subPrice = 19
        let daysLeft = 0
        
        if (coachDoc.exists()) {
          const data = coachDoc.data()
          name = data.name || name
          subPrice = data.subscriptionPrice ?? 19
          
          // Calcola stato abbonamento
          const now = new Date()
          
          // Se il prezzo è 0, è gratuito
          if (data.subscriptionPrice === 0) {
            subStatus = 'free'
          } 
          // Se ha uno stato esplicito "expired"
          else if (data.subscriptionStatus === 'expired') {
            subStatus = 'expired'
          }
          // Se ha uno stato "active", verifica la data
          else if (data.subscriptionStatus === 'active') {
            if (data.subscriptionEndDate?.toDate?.() > now) {
              subStatus = 'active'
            } else {
              subStatus = 'expired'
            }
          }
          // Altrimenti controlla il periodo di prova
          else {
            // Carica impostazioni per durata trial
            let trialDays = 90
            try {
              const settingsDoc = await getDoc(doc(db, 'settings', 'community'))
              if (settingsDoc.exists()) {
                trialDays = settingsDoc.data().freeTrialDays ?? 90
              }
            } catch (e) {
              console.error('Errore caricamento settings:', e)
            }
            
            // Calcola fine trial
            const createdAt = data.createdAt?.toDate?.() || data.approvedAt?.toDate?.() || new Date()
            const trialEndDate = data.trialEndDate?.toDate?.() || new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000)
            
            if (trialEndDate > now) {
              subStatus = 'trial'
              daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            } else {
              subStatus = 'expired'
            }
          }
        }
        
        setSubscriptionStatus(subStatus)
        setSubscriptionPrice(subPrice)
        setTrialDaysLeft(daysLeft)

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

        // Conta sessioni attive (pending + confirmed future) da entrambe le collection
        let pendingSessions = 0
        try {
          // Conta pending da sessions
          const pendingQuery = query(
            collection(db, 'sessions'),
            where('coachId', '==', user.id),
            where('status', '==', 'pending')
          )
          const pendingSnap = await getDocs(pendingQuery)
          
          // Conta confirmed future da sessions
          const confirmedQuery = query(
            collection(db, 'sessions'),
            where('coachId', '==', user.id),
            where('status', '==', 'confirmed')
          )
          const confirmedSnap = await getDocs(confirmedQuery)
          
          // Filtra solo le sessioni future
          const now = new Date()
          const futureConfirmed = confirmedSnap.docs.filter(doc => {
            const data = doc.data()
            const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt)
            return scheduledAt > now
          })
          
          // Conta pending da externalSessions
          const extPendingQuery = query(
            collection(db, 'externalSessions'),
            where('coachId', '==', user.id),
            where('status', '==', 'pending')
          )
          const extPendingSnap = await getDocs(extPendingQuery)
          
          // Conta confirmed future da externalSessions
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

  // Se l'abbonamento è scaduto e non siamo su una pagina permessa, mostra blocco
  if (subscriptionStatus === 'expired' && !isAllowedWhenExpired) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <Logo size="lg" />
          </div>
          
          {/* Card abbonamento scaduto */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header rosso */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h1 className="text-2xl font-bold mb-2">Abbonamento Scaduto</h1>
              <p className="text-white/90">
                Il tuo accesso alla piattaforma è stato sospeso
              </p>
            </div>
            
            {/* Contenuto */}
            <div className="p-6 space-y-6">
              {/* Info */}
              <div className="text-center text-gray-600">
                <p className="mb-2">
                  Ciao <strong>{coachData.name}</strong>, il tuo periodo di prova o abbonamento è terminato.
                </p>
                <p>
                  Per continuare ad usare CoachaMi e gestire i tuoi clienti, rinnova il tuo abbonamento.
                </p>
              </div>
              
              {/* Cosa include */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-charcoal mb-3">L'abbonamento include:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    Ufficio Virtuale completo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    Dashboard e statistiche
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    Gestione clienti e sessioni
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    Accesso alla Community
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    Visibilità nella Vetrina Coach
                  </li>
                </ul>
              </div>
              
              {/* Prezzo */}
              <div className="text-center">
                <p className="text-gray-500 text-sm">A partire da</p>
                <p className="text-3xl font-bold text-charcoal">
                  €{subscriptionPrice}<span className="text-lg font-normal text-gray-500">/mese</span>
                </p>
              </div>
              
              {/* CTA */}
              <Link
                href="/coach/subscription"
                className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Rinnova Abbonamento
                <ArrowRight size={20} />
              </Link>
              
              {/* Link supporto */}
              <p className="text-center text-sm text-gray-500">
                Hai bisogno di aiuto?{' '}
                <a href="mailto:coach@coachami.it" className="text-primary-600 hover:underline">
                  Contatta il supporto
                </a>
              </p>
            </div>
          </div>
          
          {/* Link logout */}
          <div className="text-center mt-6">
            <button 
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Esci dall'account
            </button>
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: '/coach/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/coach/sessions', label: 'Sessioni', icon: Video, badge: coachData.pendingSessions },
    { href: '/coach/office', label: 'Ufficio Virtuale', icon: Building2 },
    { href: '/coach/invoices', label: 'Fatturazione', icon: FileText },
    { href: '/coach/reviews', label: 'Recensioni', icon: Star, badge: coachData.pendingReviews },
    { href: '/community/my-points', label: 'I miei punti', icon: Trophy },
    { href: '/coach/availability', label: 'Disponibilità', icon: Calendar },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/coach/come-funziona-il-match', label: 'Come funziona il Match', icon: Target },
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
      {/* Banner trial in scadenza */}
      {subscriptionStatus === 'trial' && trialDaysLeft <= 7 && trialDaysLeft > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 lg:pl-68">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-amber-800">
              <Clock size={18} />
              <span className="text-sm">
                <strong>Il tuo periodo di prova scade tra {trialDaysLeft} giorni.</strong> Attiva l'abbonamento per continuare.
              </span>
            </div>
            <Link
              href="/coach/subscription"
              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            >
              Attiva ora →
            </Link>
          </div>
        </div>
      )}

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
