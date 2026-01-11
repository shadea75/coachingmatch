'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Search,
  Filter,
  Star,
  MapPin,
  Video,
  Award,
  Loader2,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Heart
} from 'lucide-react'
import Logo from '@/components/Logo'
import { AreaIllustrations } from '@/components/AreaIllustrations'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { LIFE_AREAS, LifeAreaId } from '@/types'
import { 
  calculateMatches, 
  filterCoachesByArea,
  generateMatchMessage,
  CoachProfile,
  CoacheeProfile,
  MatchResult
} from '@/lib/coachMatching'

// Mappa aree correlate per fallback
const RELATED_AREAS: Record<LifeAreaId, LifeAreaId[]> = {
  salute: ['crescita', 'divertimento', 'spiritualita'],
  finanze: ['carriera', 'crescita', 'spiritualita'],
  carriera: ['finanze', 'crescita', 'relazioni'],
  relazioni: ['amore', 'crescita', 'divertimento'],
  amore: ['relazioni', 'crescita', 'spiritualita'],
  crescita: ['carriera', 'spiritualita', 'salute'],
  spiritualita: ['crescita', 'salute', 'amore'],
  divertimento: ['relazioni', 'salute', 'crescita']
}

const AREA_LABELS: Record<LifeAreaId, string> = {
  salute: 'Salute e Vitalità',
  finanze: 'Finanze',
  carriera: 'Carriera e Lavoro',
  relazioni: 'Relazioni e Amicizie',
  amore: 'Amore',
  crescita: 'Crescita Personale',
  spiritualita: 'Spiritualità',
  divertimento: 'Divertimento'
}

// Componente interno che usa useSearchParams
function CoachesContent() {
  const searchParams = useSearchParams()
  const [coaches, setCoaches] = useState<CoachProfile[]>([])
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'reviews' | 'price'>('match')
  const [coacheeProfile, setCoacheeProfile] = useState<CoacheeProfile | null>(null)
  const [showRelated, setShowRelated] = useState(false)

  // Leggi parametri dall'URL
  useEffect(() => {
    const areaFromUrl = searchParams.get('area')
    const scoresFromUrl = searchParams.get('scores')
    const archetypeFromUrl = searchParams.get('archetype')
    
    if (areaFromUrl) {
      setSelectedArea(areaFromUrl)
    }
    
    // Costruisci profilo coachee dai parametri URL (dal test)
    if (scoresFromUrl || archetypeFromUrl || areaFromUrl) {
      const profile: CoacheeProfile = {
        priorityArea: areaFromUrl as LifeAreaId || undefined,
        archetypeId: archetypeFromUrl || undefined
      }
      
      if (scoresFromUrl) {
        try {
          profile.scores = JSON.parse(decodeURIComponent(scoresFromUrl))
        } catch (e) {
          console.error('Error parsing scores:', e)
        }
      }
      
      setCoacheeProfile(profile)
    }
  }, [searchParams])

  // Carica coach
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        const coachesQuery = query(
          collection(db, 'coachApplications'),
          where('status', '==', 'approved')
        )
        const snapshot = await getDocs(coachesQuery)
        const loadedCoaches: CoachProfile[] = snapshot.docs.map(doc => {
          const data = doc.data()
          
          const lifeAreasArray = data.lifeAreas as LifeAreaId[] || []
          const lifeAreaSingle = data.lifeArea as LifeAreaId | undefined
          const allAreas = lifeAreasArray.length > 0 ? lifeAreasArray : (lifeAreaSingle ? [lifeAreaSingle] : [])
          
          return {
            id: doc.id,
            name: data.name || 'Coach',
            photo: data.photo || null,
            lifeArea: allAreas[0],
            lifeAreas: allAreas,
            bio: data.bio || '',
            motivation: data.motivation || '',
            specializations: data.specializations || {},
            problemsAddressed: data.problemsAddressed || [],
            style: data.style || [],
            location: data.location || '',
            languages: data.languages || ['Italiano'],
            rating: data.rating || 5.0,
            reviewCount: data.reviewCount || 0,
            yearsOfExperience: data.yearsOfExperience || 0,
            averagePrice: data.averagePrice || 0,
            sessionMode: data.sessionMode || ['online'],
            freeCallAvailable: data.freeCallAvailable ?? true,
            certifications: data.certifications || data.experience?.certifications || []
          }
        })
        setCoaches(loadedCoaches)
      } catch (err) {
        console.error('Errore caricamento coach:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCoaches()
  }, [])

  // Calcola match quando cambiano coach o profilo coachee
  useEffect(() => {
    if (coaches.length > 0) {
      try {
        const profile = coacheeProfile || { priorityArea: selectedArea !== 'all' ? selectedArea as LifeAreaId : undefined }
        const results = calculateMatches(coaches, profile)
        setMatchResults(results)
      } catch (err) {
        console.error('Errore calcolo match:', err)
        // Fallback: mostra coach senza punteggio match
        setMatchResults(coaches.map(coach => ({
          coach,
          score: 50,
          finalScore: 50,
          matchReasons: [],
          compatibility: 'moderate' as const
        })))
      }
    }
  }, [coaches, coacheeProfile, selectedArea])

  // Filtra e ordina coach
  const getFilteredAndSortedCoaches = () => {
    // Se non ci sono matchResults ma ci sono coaches, usa i coaches direttamente
    let filtered: MatchResult[] = matchResults.length > 0 
      ? matchResults 
      : coaches.map(coach => ({
          coach,
          score: 50,
          finalScore: 50,
          matchReasons: [],
          compatibility: 'moderate' as const
        }))

    // Filtro per ricerca testuale
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.coach.name.toLowerCase().includes(query) ||
        r.coach.specializations?.focusTopics?.some(t => t.toLowerCase().includes(query)) ||
        r.coach.bio?.toLowerCase().includes(query)
      )
    }

    // Filtro per area
    if (selectedArea !== 'all') {
      const areaId = selectedArea as LifeAreaId
      const directMatches = filtered.filter(r => 
        r.coach.lifeArea === areaId || r.coach.lifeAreas?.includes(areaId)
      )
      
      // Se pochi risultati diretti, mostra anche correlati
      if (directMatches.length < 3) {
        const relatedAreas = RELATED_AREAS[areaId] || []
        const relatedMatches = filtered.filter(r => 
          !directMatches.includes(r) &&
          (relatedAreas.includes(r.coach.lifeArea as LifeAreaId) ||
           r.coach.lifeAreas?.some(a => relatedAreas.includes(a)))
        )
        
        setShowRelated(relatedMatches.length > 0)
        filtered = [...directMatches, ...relatedMatches]
      } else {
        setShowRelated(false)
        filtered = directMatches
      }
    } else {
      setShowRelated(false)
    }

    // Ordinamento
    switch (sortBy) {
      case 'match':
        // Già ordinato per match score
        break
      case 'rating':
        filtered = [...filtered].sort((a, b) => (b.coach.rating || 0) - (a.coach.rating || 0))
        break
      case 'reviews':
        filtered = [...filtered].sort((a, b) => (b.coach.reviewCount || 0) - (a.coach.reviewCount || 0))
        break
      case 'price':
        filtered = [...filtered].sort((a, b) => (a.coach.averagePrice || 0) - (b.coach.averagePrice || 0))
        break
    }

    return filtered
  }

  const filteredCoaches = getFilteredAndSortedCoaches()
  const hasCoacheeProfile = coacheeProfile && (coacheeProfile.priorityArea || coacheeProfile.archetypeId)

  // Componente Match Badge
  const MatchBadge = ({ result }: { result: MatchResult }) => {
    const compatibility = result?.compatibility || 'moderate'
    const score = result?.score || 50
    
    const colors: Record<string, string> = {
      perfect: 'bg-green-100 text-green-700 border-green-200',
      high: 'bg-blue-100 text-blue-700 border-blue-200',
      good: 'bg-amber-100 text-amber-700 border-amber-200',
      moderate: 'bg-gray-100 text-gray-600 border-gray-200'
    }
    
    const labels: Record<string, string> = {
      perfect: 'Match Perfetto',
      high: 'Ottimo Match',
      good: 'Buon Match',
      moderate: 'Match'
    }
    
    return (
      <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[compatibility] || colors.moderate} flex items-center gap-1`}>
        {compatibility === 'perfect' && <Sparkles size={12} />}
        {compatibility === 'high' && <CheckCircle2 size={12} />}
        {labels[compatibility] || 'Match'} {score}%
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-gray-600 hover:text-charcoal transition-colors"
            >
              Accedi
            </Link>
            <Link 
              href="/onboarding"
              className="btn btn-primary"
            >
              Inizia ora
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-500 to-primary-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            {hasCoacheeProfile ? 'Coach consigliati per te' : 'I nostri Coach'}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            {hasCoacheeProfile 
              ? 'Basati sul tuo profilo e le tue esigenze'
              : 'Seleziona tra i nostri coach certificati e inizia il tuo percorso di crescita'
            }
          </p>
          
          {hasCoacheeProfile && coacheeProfile?.priorityArea && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <span className="text-sm">Area prioritaria:</span>
              <span className="font-semibold">{AREA_LABELS[coacheeProfile.priorityArea]}</span>
            </div>
          )}
        </div>
      </section>

      {/* Filtri */}
      <section className="bg-white border-b border-gray-100 py-4 px-4 sticky top-[73px] z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca per nome, specializzazione..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filter per Area */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="all">Tutte le aree</option>
              {LIFE_AREAS.map(area => (
                <option key={area.id} value={area.id}>{area.label}</option>
              ))}
            </select>
          </div>
          
          {/* Sort */}
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-gray-400" />
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="match">Più compatibili</option>
              <option value="rating">Più votati</option>
              <option value="reviews">Più recensiti</option>
              <option value="price">Prezzo più basso</option>
            </select>
          </div>
        </div>
      </section>

      {/* Coach Grid */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary-500" size={40} />
            </div>
          ) : filteredCoaches.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nessun coach trovato</p>
              {(searchQuery || selectedArea !== 'all') && (
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedArea('all'); }}
                  className="mt-4 text-primary-500 hover:underline"
                >
                  Resetta filtri
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-500">{filteredCoaches.length} coach trovati</p>
                {showRelated && selectedArea !== 'all' && (
                  <p className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                    Include coach di aree correlate
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCoaches.map((result, index) => {
                  const coach = result.coach
                  const areaLabels = coach.lifeAreas
                    ?.map(areaId => LIFE_AREAS.find(a => a.id === areaId)?.label)
                    .filter(Boolean) || []
                  
                  return (
                    <motion.div
                      key={coach.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/coaches/${coach.id}`}>
                        <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                          {/* Foto Profilo */}
                          <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                            {coach.photo ? (
                              <img 
                                src={coach.photo} 
                                alt={coach.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                                <span className="text-5xl font-bold text-primary-400">
                                  {coach.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            
                            {/* Match Badge in alto a sinistra */}
                            <div className="absolute top-3 left-3">
                              <MatchBadge result={result} />
                            </div>
                            
                            {/* Free Call Badge */}
                            {coach.freeCallAvailable && (
                              <div className="absolute top-3 right-3">
                                <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-semibold shadow-sm">
                                  Call Gratuita
                                </span>
                              </div>
                            )}
                            
                            {/* Badge Illustrazioni Aree in basso a destra */}
                            {coach.lifeAreas && coach.lifeAreas.length > 0 && (
                              <div className="absolute bottom-3 right-3 flex gap-1">
                                {coach.lifeAreas.slice(0, 3).map((areaId) => {
                                  const AreaIllustration = AreaIllustrations[areaId]
                                  return AreaIllustration ? (
                                    <div key={areaId} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-md flex items-center justify-center">
                                      <AreaIllustration size={28} />
                                    </div>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="p-4 bg-white border-t border-gray-100">
                            <h3 className="text-lg font-bold text-charcoal mb-1">{coach.name}</h3>
                            <p className="text-sm text-primary-600 font-medium mb-2">
                              {areaLabels[0] || coach.specializations?.focusTopics?.[0] || 'Life Coach'}
                            </p>
                            
                            {/* Match Reasons */}
                            {result.matchReasons && result.matchReasons.length > 0 && result.matchReasons[0]?.label && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <CheckCircle2 size={12} className="text-green-500" />
                                  {result.matchReasons[0].label}
                                </p>
                              </div>
                            )}
                            
                            {/* Rating */}
                            {(coach.reviewCount || 0) > 0 && (
                              <div className="flex items-center gap-1 mb-3">
                                <Star size={14} className="text-amber-400 fill-amber-400" />
                                <span className="text-sm text-gray-700">{(coach.rating || 5).toFixed(1)}</span>
                                <span className="text-xs text-gray-400">({coach.reviewCount} recensioni)</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                {coach.averagePrice ? (
                                  <>€{coach.averagePrice}/sess</>
                                ) : (
                                  <><Video size={14} /> Online</>
                                )}
                              </span>
                              <span className="text-primary-500 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                Scopri
                                <ArrowRight size={14} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA per test */}
      {!hasCoacheeProfile && (
        <section className="py-12 px-4 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-primary-50 to-amber-50 rounded-3xl p-8">
              <Sparkles className="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-charcoal mb-3">
                Trova il coach perfetto per te
              </h2>
              <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                Fai il nostro test gratuito di 3 minuti e scopri quali coach sono più compatibili 
                con il tuo profilo e i tuoi obiettivi
              </p>
              <Link 
                href="/test-gratuito"
                className="btn btn-primary text-lg px-8 py-4"
              >
                Fai il test gratuito
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Logo size="sm" />
          <p className="text-sm text-gray-400">
            © 2026 CoachaMi. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  )
}

// Export con Suspense wrapper
export default function CoachesListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    }>
      <CoachesContent />
    </Suspense>
  )
}
