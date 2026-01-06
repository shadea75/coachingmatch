'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import CoachSidebar from '@/components/coach/CoachSidebar'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

interface CoachLayoutProps {
  children: React.ReactNode
}

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

  return (
    <div className="min-h-screen bg-cream flex">
      <CoachSidebar
        coachName={coachData.name}
        coachLevel={coachData.level}
        pendingSessions={coachData.pendingSessions}
        pendingReviews={coachData.pendingReviews}
      />
      <main className="flex-1 lg:ml-0">
        {children}
      </main>
    </div>
  )
}
