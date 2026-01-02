'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Coach, CoachaMi, LIFE_AREAS } from '@/types'
import CoachCard from '@/components/CoachCard'

// Mock coaches data (in production, fetch from Firestore)
const MOCK_COACHES: Coach[] = [
  {
    id: '1',
    userId: 'u1',
    name: 'Laura Bianchi',
    email: 'laura@coach.it',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    bio: 'Executive coach con 12 anni di esperienza nel supportare professionisti e manager nel raggiungimento dei loro obiettivi di carriera. Specializzata in leadership e gestione del cambiamento.',
    certifications: [{ name: 'ICF PCC', institution: 'ICF', year: 2018, type: 'icf', level: 'PCC', verified: true }],
    yearsOfExperience: 12,
    coachingSchool: 'ICF Italia',
    languages: ['Italiano', 'Inglese'],
    sessionMode: ['online', 'presence'],
    location: 'Milano',
    averagePrice: 150,
    typicalSessionCount: '8-12 sessioni',
    freeCallAvailable: true,
    specializations: {
      lifeAreas: ['carriera', 'crescita', 'finanze'],
      focusTopics: ['Leadership', 'Crescita professionale', 'Work-life balance'],
      targetClients: ['Manager', 'Professionisti', 'Imprenditori'],
      coachingMethod: 'Coaching ontologico e PNL per risultati concreti'
    },
    availability: {
      monday: [{ start: '09:00', end: '18:00' }],
      tuesday: [{ start: '09:00', end: '18:00' }],
      wednesday: [{ start: '09:00', end: '18:00' }],
      thursday: [{ start: '09:00', end: '18:00' }],
      friday: [{ start: '09:00', end: '14:00' }],
      saturday: [],
      sunday: []
    },
    status: 'approved',
    applicationDate: new Date('2023-01-15'),
    platformFeePercentage: 30,
    totalClients: 87,
    totalSessions: 520,
    totalRevenue: 52000,
    rating: 4.9,
    reviewCount: 64,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    userId: 'u2',
    name: 'Marco Rossi',
    email: 'marco@coach.it',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    bio: 'Life coach specializzato in benessere emotivo e gestione dello stress. Aiuto le persone a ritrovare equilibrio e serenità nella vita quotidiana attraverso tecniche di mindfulness.',
    certifications: [{ name: 'ICF ACC', institution: 'ICF', year: 2020, type: 'icf', level: 'ACC', verified: true }],
    yearsOfExperience: 8,
    coachingSchool: 'Scuola Italiana di Coaching',
    languages: ['Italiano'],
    sessionMode: ['online'],
    averagePrice: 100,
    typicalSessionCount: '6-8 sessioni',
    freeCallAvailable: true,
    specializations: {
      lifeAreas: ['salute', 'relazioni', 'spiritualita'],
      focusTopics: ['Stress', 'Ansia', 'Burnout', 'Relazioni'],
      targetClients: ['Individui', 'Coppie'],
      coachingMethod: 'Mindfulness e coaching sistemico per ritrovare equilibrio'
    },
    availability: {
      monday: [{ start: '10:00', end: '19:00' }],
      tuesday: [{ start: '10:00', end: '19:00' }],
      wednesday: [{ start: '10:00', end: '19:00' }],
      thursday: [{ start: '10:00', end: '19:00' }],
      friday: [{ start: '10:00', end: '17:00' }],
      saturday: [{ start: '10:00', end: '13:00' }],
      sunday: []
    },
    status: 'approved',
    applicationDate: new Date('2023-03-20'),
    platformFeePercentage: 30,
    totalClients: 52,
    totalSessions: 312,
    totalRevenue: 28000,
    rating: 4.8,
    reviewCount: 41,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    userId: 'u3',
    name: 'Giulia Verdi',
    email: 'giulia@coach.it',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Business coach e formatrice con esperienza nel mondo startup. Supporto imprenditori e freelance nel definire e raggiungere obiettivi ambiziosi con un approccio pratico e orientato ai risultati.',
    certifications: [{ name: 'ICF PCC', institution: 'ICF', year: 2019, type: 'icf', level: 'PCC', verified: true }],
    yearsOfExperience: 10,
    coachingSchool: 'CoachU',
    languages: ['Italiano', 'Inglese', 'Spagnolo'],
    sessionMode: ['online', 'presence'],
    location: 'Roma',
    averagePrice: 130,
    typicalSessionCount: '8-12 sessioni',
    freeCallAvailable: true,
    specializations: {
      lifeAreas: ['carriera', 'finanze', 'crescita'],
      focusTopics: ['Business development', 'Produttività', 'Decision making'],
      targetClients: ['Imprenditori', 'Freelance', 'Startup founder'],
      coachingMethod: 'Business coaching e goal setting orientato ai risultati'
    },
    availability: {
      monday: [{ start: '08:00', end: '17:00' }],
      tuesday: [{ start: '08:00', end: '17:00' }],
      wednesday: [{ start: '08:00', end: '17:00' }],
      thursday: [{ start: '08:00', end: '17:00' }],
      friday: [{ start: '08:00', end: '15:00' }],
      saturday: [],
      sunday: []
    },
    status: 'approved',
    applicationDate: new Date('2023-02-10'),
    platformFeePercentage: 30,
    totalClients: 73,
    totalSessions: 438,
    totalRevenue: 45000,
    rating: 4.7,
    reviewCount: 58,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    userId: 'u4',
    name: 'Alessandro Neri',
    email: 'alessandro@coach.it',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Relationship coach specializzato in comunicazione e dinamiche relazionali. Aiuto individui e coppie a costruire relazioni più autentiche e soddisfacenti.',
    certifications: [{ name: 'Certified Relationship Coach', institution: 'RCI', year: 2017, type: 'other', verified: true }],
    yearsOfExperience: 9,
    coachingSchool: 'Relationship Coaching Institute',
    languages: ['Italiano'],
    sessionMode: ['online', 'presence'],
    location: 'Firenze',
    averagePrice: 120,
    typicalSessionCount: '6-8 sessioni',
    freeCallAvailable: true,
    specializations: {
      lifeAreas: ['amore', 'relazioni', 'crescita'],
      focusTopics: ['Comunicazione', 'Conflitti relazionali', 'Autostima'],
      targetClients: ['Individui', 'Coppie'],
      coachingMethod: 'Comunicazione non violenta e coaching relazionale'
    },
    availability: {
      monday: [{ start: '14:00', end: '20:00' }],
      tuesday: [{ start: '14:00', end: '20:00' }],
      wednesday: [{ start: '14:00', end: '20:00' }],
      thursday: [{ start: '14:00', end: '20:00' }],
      friday: [{ start: '14:00', end: '20:00' }],
      saturday: [{ start: '10:00', end: '14:00' }],
      sunday: []
    },
    status: 'approved',
    applicationDate: new Date('2023-04-05'),
    platformFeePercentage: 30,
    totalClients: 61,
    totalSessions: 366,
    totalRevenue: 35000,
    rating: 4.9,
    reviewCount: 47,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// Simple matching algorithm
function calculateMatches(
  userScores: Record<string, number>,
  userObjectives: Record<string, string[]>,
  coaches: Coach[]
): CoachaMi[] {
  // Find priority areas (lowest scores)
  const priorityAreas = Object.entries(userScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([area]) => area)
  
  // Score each coach
  const scoredCoaches = coaches.map(coach => {
    let score = 0
    const reasons: string[] = []
    
    // Area match
    const areaMatch = coach.specializations.lifeAreas.filter(
      area => priorityAreas.includes(area)
    ).length
    score += areaMatch * 30
    
    if (areaMatch > 0) {
      const matchedAreas = coach.specializations.lifeAreas
        .filter(area => priorityAreas.includes(area))
        .map(area => LIFE_AREAS.find(a => a.id === area)?.label || area)
      reasons.push(`Specializzato in ${matchedAreas.slice(0, 2).join(' e ')}`)
    }
    
    // Objectives match (using focusTopics instead of problemsAddressed)
    const allUserObjectives = Object.values(userObjectives).flat()
    const objectiveMatch = coach.specializations.focusTopics.some(
      topic => allUserObjectives.some(obj => 
        obj.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(obj.toLowerCase().split(' ')[0])
      )
    )
    if (objectiveMatch) {
      score += 20
      reasons.push('Esperienza con obiettivi simili ai tuoi')
    }
    
    // Rating bonus
    score += coach.rating * 5
    
    // Add coaching method as reason
    if (coach.specializations.coachingMethod) {
      reasons.push('Approccio versatile e professionale')
    }
    
    return {
      coach,
      score: Math.min(Math.round(score), 98),
      matchReasons: reasons
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
  
  useEffect(() => {
    // Simulate matching calculation
    const timer = setTimeout(() => {
      if (user?.areaScores && user?.selectedObjectives) {
        const calculatedMatches = calculateMatches(
          user.areaScores,
          user.selectedObjectives,
          MOCK_COACHES
        )
        setMatches(calculatedMatches)
      } else {
        // Use default matches if no user data
        setMatches(
          MOCK_COACHES.slice(0, 3).map(coach => ({
            coach,
            score: Math.floor(Math.random() * 20) + 75,
            matchReasons: [
              'Coach con ottime recensioni',
              'Approccio versatile e professionale'
            ]
          }))
        )
      }
      setLoading(false)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [user])
  
  const handleBookCall = (coachId: string) => {
    router.push(`/booking/${coachId}`)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
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
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            <span className="font-semibold text-charcoal">CoachaMi</span>
          </div>
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
