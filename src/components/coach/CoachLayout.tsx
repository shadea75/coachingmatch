'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import CoachSidebar from '@/components/coach/CoachSidebar'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { AlertTriangle, CreditCard, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'

interface CoachLayoutProps {
  children: React.ReactNode
}

type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'free' | 'loading'

export default function CoachLayout({ children }: CoachLayoutProps) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [coachData, setCoachData] = useState({
    name: 'Coach',
    level: 'Rookie',
    pendingSessions: 0,
    pendingReviews: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  
  // Stato abbonamento
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading')
  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(0)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
      return
    }

    const loadCoachData = async () => {
      if (!user?.id) return

      try {
        // Carica dati coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        let name = user.name || 'Coach'
        let subStatus: SubscriptionStatus = 'trial'
        let subPrice = 0
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
          // Se ha uno stato esplicito salvato
          else if (data.subscriptionStatus === 'expired') {
            subStatus = 'expired'
          }
          else if (data.subscriptionStatus === 'active') {
            // Verifica se è ancora valido
            if (data.subscriptionEndDate?.toDate?.() > now) {
              subStatus = 'active'
            } else {
              subStatus = 'expired'
            }
          }
          // Controlla periodo di prova
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

        // Conta sessioni pending
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id),
          where('status', '==', 'pending')
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        const pendingSessions = sessionsSnap.size

        // Conta recensioni pending (non lette)
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('coachId', '==', user.id),
          where('isRead', '==', false)
        )
        const reviewsSnap = await getDocs(reviewsQuery)
        const pendingReviews = reviewsSnap.size

        setCoachData({
          name,
          level,
          pendingSessions,
          pendingReviews
        })
      } catch (err) {
        console.error('Errore caricamento dati coach:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadCoachData()
    }
  }, [user, loading, router])

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Se l'abbonamento è scaduto, mostra schermata di blocco
  if (subscriptionStatus === 'expired') {
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
            <Link 
              href="/login" 
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Torna al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex">
      <CoachSidebar
        coachName={coachData.name}
        coachLevel={coachData.level}
        pendingSessions={coachData.pendingSessions}
        pendingReviews={coachData.pendingReviews}
      />
      <main className="flex-1 lg:ml-0">
        {/* Banner trial in scadenza */}
        {subscriptionStatus === 'trial' && trialDaysLeft <= 7 && trialDaysLeft > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock size={18} />
                <span className="text-sm">
                  <strong>Il tuo periodo di prova scade tra {trialDaysLeft} giorni.</strong> Attiva l'abbonamento per continuare ad usare CoachaMi.
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
        
        {children}
      </main>
    </div>
  )
}
