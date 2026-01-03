'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Coach, CoachaMi, LIFE_AREAS } from '@/types'
import CoachCard from '@/components/CoachCard'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

// Matching algorithm
function calculateMatches(
  userScores: Record<string, number>,
  userObjectives: Record<string, string[]>,
  coaches: Coach[]
): CoachaMi[] {
  // Find priority areas (lowest scores = areas to improve)
  const priorityAreas = Object.entries(userScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([area]) => area)
  
  // Score each coach
  const scoredCoaches = coaches.map(coach => {
    let score = 0
    const reasons: string[] = []
    
    // Area match - check specializations
    const coachAreas = coach.specializations?.lifeAreas || []
    const areaMatch = coachAreas.filter(
      area => priorityAreas.includes(area)
    ).length
    score += areaMatch * 30
    
    if (areaMatch > 0) {
      const matchedAreas = coachAreas
        .filter(area => priorityAreas.includes(area))
        .map(area => LIFE_AREAS.find(a => a.id === area)?.label || area)
      reasons.push(`Specializzato in ${matchedAreas.slice(0, 2).join(' e ')}`)
    }
    
    // Objectives match
    const allUserObjectives = Object.values(userObjectives || {}).flat()
    const focusTopics = coach.specializations?.focusTopics || []
    const objectiveMatch = focusTopics.some(
      topic => allUserObjectives.some(obj => 
        obj?.toLowerCase().includes(topic?.toLowerCase()) ||
        topic?.toLowerCase().includes(obj?.toLowerCase().split(' ')[0])
      )
    )
    if (objectiveMatch) {
      score += 20
      reasons.push('Esperienza con obiettivi simili ai tuoi')
    }
    
    // Rating bonus
    score += (coach.rating || 4.5) * 5
    
    // Experience bonus
    if (coach.yearsOfExperience && coach.yearsOfExperience >= 5) {
      score += 10
    }
    
    // Add default reason if none
    if (reasons.length === 0) {
      reasons.push('Coach con esperienza verificata')
    }
    reasons.push('Approccio versatile e professionale')
    
    return {
      coach,
      score: Math.min(Math.round(score), 98),
      matchReasons: reasons.slice(0, 2)
    }
  })
  
  // Return top 3
  return scoredCoaches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export default function MatchingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [matches, setMatches] = useState<CoachaMi[]>([])
  const [loading, setLoading] = useState(true)
  const [coaches, setCoaches] = useState<Coach[]>([])
  
  // Load approved coaches from Firebase
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        // Query approved coach applications
        const coachesQuery = query(
          collection(db, 'coachApplications'),
          where('status', '==', 'approved')
        )
        const snapshot = await getDocs(coachesQuery)
        
        const loadedCoaches: Coach[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            userId: data.userId || doc.id,
            name: data.name || 'Coach',
            email: data.email || '',
            photo: data.photo || null,
            bio: data.bio || data.motivation || '',
            lifeArea: data.lifeArea || null, // Aggiunto
            certifications: data.certifications || [],
            yearsOfExperience: data.yearsOfExperience || 0,
            coachingSchool: data.coachingSchool || '',
            languages: data.languages || ['Italiano'],
            sessionMode: data.sessionMode || ['online'],
            location: data.location || '',
            averagePrice: data.averagePrice || 100,
            typicalSessionCount: data.typicalSessionCount || '6-8 sessioni',
            freeCallAvailable: data.freeCallAvailable !== false,
            specializations: {
              lifeAreas: data.specializations?.lifeAreas || data.lifeAreas || (data.lifeArea ? [data.lifeArea] : []),
              focusTopics: data.specializations?.focusTopics || data.focusTopics || data.problemsAddressed || [],
              targetClients: data.specializations?.targetClients || data.targetClients || data.clientTypes || [],
              coachingMethod: data.specializations?.coachingMethod || data.coachingMethod || ''
            },
            availability: data.availability || {},
            status: 'approved',
            applicationDate: data.createdAt?.toDate?.() || new Date(),
            platformFeePercentage: 30,
            totalClients: data.totalClients || 0,
            totalSessions: data.totalSessions || 0,
            totalRevenue: data.totalRevenue || 0,
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date()
          } as Coach
        })
        
        setCoaches(loadedCoaches)
      } catch (err) {
        console.error('Errore caricamento coach:', err)
      }
    }
    
    loadCoaches()
  }, [])
  
  // Calculate matches when coaches are loaded
  useEffect(() => {
    if (coaches.length === 0) return
    
    const timer = setTimeout(() => {
      if (user?.areaScores && user?.selectedObjectives) {
        const calculatedMatches = calculateMatches(
          user.areaScores,
          user.selectedObjectives,
          coaches
        )
        setMatches(calculatedMatches)
      } else {
        // Use default matches if no user data
        setMatches(
          coaches.slice(0, 3).map(coach => ({
            coach,
            score: Math.floor(Math.random() * 20) + 55,
            matchReasons: [
              'Coach con esperienza verificata',
              'Approccio versatile e professionale'
            ]
          }))
        )
      }
      setLoading(false)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [user, coaches])
  
  const handleBookCall = (coachId: string) => {
    router.push(`/booking/${coachId}`)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="mb-8">
          <Logo size="lg" />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-primary-500 animate-pulse" />
            </div>
            <Loader2 className="w-24 h-24 text-primary-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-charcoal mb-2">
            Stiamo cercando i coach perfetti per te...
          </h2>
          <p className="text-gray-500">
            Analizziamo il tuo profilo e le tue esigenze
          </p>
        </motion.div>
      </div>
    )
  }
  
  // Nessun coach disponibile
  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gray-100 py-4 px-4">
          <div className="max-w-6xl mx-auto">
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>
        </header>
        <main className="py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-charcoal mb-2">
              Nessun coach disponibile al momento
            </h2>
            <p className="text-gray-500 mb-6">
              Stiamo lavorando per aggiungere nuovi coach alla piattaforma. 
              Torna presto!
            </p>
            <Link 
              href="/dashboard"
              className="btn bg-primary-500 text-white hover:bg-primary-600"
            >
              Torna alla dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>
      </header>
      
      {/* Main */}
      <main className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-3">
              Abbiamo selezionato{' '}
              <span className="gradient-text">3 coach</span>{' '}
              per te
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Basandoci sulle tue aree di miglioramento e obiettivi, 
              ecco i coach che riteniamo più adatti al tuo percorso
            </p>
          </motion.div>
          
          {/* Coach cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {matches.map((match, index) => (
              <CoachCard
                key={match.coach.id}
                coach={match.coach}
                matchScore={match.score}
                matchReasons={match.matchReasons}
                onBook={() => handleBookCall(match.coach.id)}
                delay={index * 0.15}
              />
            ))}
          </div>
          
          {/* Help text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-gray-500 mb-4">
              Non trovi quello che cerchi?
            </p>
            <button className="text-primary-500 font-medium hover:underline">
              Esplora tutti i coach →
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
