'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Star,
  Calendar,
  Clock,
  Video,
  CheckCircle,
  MapPin,
  Award,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Mail,
  Sparkles,
  Heart,
  Briefcase,
  Target
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'

interface CoachProfile {
  id: string
  name: string
  email: string
  photo: string | null
  bio: string
  motivation: string
  specializations: {
    focusTopics: string[]
    targetAudience: string[]
    sessionFormats: string[]
  }
  experience: {
    yearsCoaching: number
    totalSessions: number
    certifications: string[]
  }
  education: string[]
  languages: string[]
  location: string
  rating: number
  reviewCount: number
  hourlyRate: number
  availability: Record<number, string[]>
}

interface ExpandedSection {
  story: boolean
  scope: boolean
  curriculum: boolean
  challenges: boolean
}

export default function CoachPublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const coachId = params.coachId as string
  
  const [coach, setCoach] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<ExpandedSection>({
    story: false,
    scope: false,
    curriculum: false,
    challenges: false
  })

  useEffect(() => {
    const loadCoach = async () => {
      if (!coachId) return
      
      setLoading(true)
      try {
        // Prova prima coachApplications
        const coachDoc = await getDoc(doc(db, 'coachApplications', coachId))
        
        if (coachDoc.exists()) {
          const data = coachDoc.data()
          setCoach({
            id: coachDoc.id,
            name: data.name || 'Coach',
            email: data.email || '',
            photo: data.photo || null,
            bio: data.bio || '',
            motivation: data.motivation || '',
            specializations: {
              focusTopics: data.specializations?.focusTopics || [],
              targetAudience: data.specializations?.targetAudience || [],
              sessionFormats: data.specializations?.sessionFormats || ['video']
            },
            experience: {
              yearsCoaching: data.experience?.yearsCoaching || 0,
              totalSessions: data.experience?.totalSessions || 0,
              certifications: data.experience?.certifications || data.certifications || []
            },
            education: data.education || [],
            languages: data.languages || ['Italiano'],
            location: data.location || 'Italia',
            rating: data.rating || 5.0,
            reviewCount: data.reviewCount || 0,
            hourlyRate: data.hourlyRate || 80,
            availability: data.availability || {}
          })
        } else {
          setError('Coach non trovato')
        }
      } catch (err) {
        console.error('Errore caricamento coach:', err)
        setError('Errore nel caricamento del profilo')
      } finally {
        setLoading(false)
      }
    }
    
    loadCoach()
  }, [coachId])

  const toggleSection = (section: keyof ExpandedSection) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    )
  }

  if (error || !coach) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Coach non trovato'}</p>
          <Link href="/" className="text-primary-500 hover:underline">
            Torna alla home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <Logo size="sm" />
          </div>
          
          <Link
            href={user ? `/booking/${coach.id}` : '/login'}
            className="btn btn-primary"
          >
            <Calendar size={18} />
            Prenota Call Gratuita
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonna sinistra - Foto e Info principali */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm sticky top-24"
            >
              {/* Foto */}
              <div className="aspect-square relative">
                {coach.photo ? (
                  <img 
                    src={coach.photo} 
                    alt={coach.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <span className="text-8xl font-bold text-primary-400">
                      {coach.name.charAt(0)}
                    </span>
                  </div>
                )}
                
                {/* Badge */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-primary-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                    <Award size={14} />
                    Coach Certificato
                  </span>
                </div>
              </div>
              
              {/* Info base */}
              <div className="p-6">
                <h1 className="text-2xl font-bold text-charcoal mb-1">{coach.name}</h1>
                <p className="text-primary-600 font-medium mb-4">
                  {coach.specializations.focusTopics[0] || 'Life Coach'}
                </p>
                
                {/* Rating */}
                {coach.reviewCount > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={16} 
                          className={i < Math.floor(coach.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">
                      {coach.rating.toFixed(1)} ({coach.reviewCount} recensioni)
                    </span>
                  </div>
                )}
                
                {/* Quick info */}
                <div className="space-y-3 text-sm">
                  {coach.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} className="text-gray-400" />
                      {coach.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Video size={16} className="text-gray-400" />
                    Sessioni online
                  </div>
                  {coach.experience.yearsCoaching > 0 && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock size={16} className="text-gray-400" />
                      {coach.experience.yearsCoaching}+ anni di esperienza
                    </div>
                  )}
                </div>
                
                {/* CTA Mobile */}
                <div className="mt-6 space-y-3">
                  <Link
                    href={user ? `/booking/${coach.id}` : '/login'}
                    className="w-full btn btn-primary justify-center"
                  >
                    <Sparkles size={18} />
                    Prenota Call Gratuita
                  </Link>
                  <p className="text-xs text-center text-gray-400">
                    Prima call di 30 minuti gratuita
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Colonna destra - Dettagli */}
          <div className="lg:col-span-2 space-y-6">
            {/* In cosa posso aiutarti */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-primary-600 mb-4 flex items-center gap-2">
                <Target size={22} />
                In cosa posso aiutarti
              </h2>
              
              <div className="space-y-3">
                {coach.specializations.focusTopics.map((topic, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 text-gray-700"
                  >
                    <CheckCircle size={18} className="text-primary-500 flex-shrink-0" />
                    {topic}
                  </div>
                ))}
                
                {coach.specializations.focusTopics.length === 0 && (
                  <p className="text-gray-500">Supporto personalizzato per la tua crescita personale e professionale</p>
                )}
              </div>
              
              {/* Target audience */}
              {coach.specializations.targetAudience.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-3">Lavoro principalmente con:</p>
                  <div className="flex flex-wrap gap-2">
                    {coach.specializations.targetAudience.map((audience, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                      >
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
            
            {/* Sezioni espandibili */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              {/* La mia storia */}
              {coach.bio && (
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection('story')}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-charcoal">La mia storia, la mia missione</h3>
                    {expanded.story ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expanded.story && (
                    <div className="px-6 pb-6">
                      <p className="text-gray-600 whitespace-pre-line">{coach.bio}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Il mio scopo */}
              {coach.motivation && (
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection('scope')}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-charcoal">Il mio scopo</h3>
                    {expanded.scope ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expanded.scope && (
                    <div className="px-6 pb-6">
                      <p className="text-gray-600 whitespace-pre-line">{coach.motivation}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Curriculum */}
              {((coach.experience.certifications && coach.experience.certifications.length > 0) || (coach.education && coach.education.length > 0)) && (
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection('curriculum')}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-charcoal">Curriculum (studi e certificazioni)</h3>
                    {expanded.curriculum ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expanded.curriculum && (
                    <div className="px-6 pb-6 space-y-4">
                      {coach.experience.certifications && Array.isArray(coach.experience.certifications) && coach.experience.certifications.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-2">Certificazioni:</p>
                          <ul className="space-y-2">
                            {coach.experience.certifications.map((cert, index) => (
                              <li key={index} className="flex items-center gap-2 text-gray-700">
                                <Award size={16} className="text-primary-500" />
                                {cert}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {coach.education && Array.isArray(coach.education) && coach.education.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-2">Formazione:</p>
                          <ul className="space-y-2">
                            {coach.education.map((edu, index) => (
                              <li key={index} className="flex items-center gap-2 text-gray-700">
                                <CheckCircle size={16} className="text-green-500" />
                                {edu}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
            
            {/* CTA finale */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-8 text-white text-center"
            >
              <h3 className="text-2xl font-bold mb-3">Inizia il tuo percorso con {coach.name.split(' ')[0]}</h3>
              <p className="text-white/80 mb-6">
                Prenota una call gratuita di 30 minuti per conoscerci e capire se possiamo lavorare insieme
              </p>
              <Link
                href={user ? `/booking/${coach.id}` : '/login'}
                className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Calendar size={20} />
                Richiedi informazioni
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
