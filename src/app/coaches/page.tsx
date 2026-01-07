'use client'

import { useState, useEffect } from 'react'
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
  ArrowRight
} from 'lucide-react'
import Logo from '@/components/Logo'
import { AreaIllustrations } from '@/components/AreaIllustrations'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { LIFE_AREAS, LifeAreaId } from '@/types'

interface Coach {
  id: string
  name: string
  photo: string | null
  lifeArea?: LifeAreaId
  lifeAreas: LifeAreaId[]
  specialization: string
  focusTopics: string[]
  bio: string
  rating: number
  reviewCount: number
  location: string
}

export default function CoachesListPage() {
  const searchParams = useSearchParams()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState<string>('all')

  // Leggi parametro area dall'URL al caricamento
  useEffect(() => {
    const areaFromUrl = searchParams.get('area')
    if (areaFromUrl) {
      setSelectedArea(areaFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    const loadCoaches = async () => {
      try {
        const coachesQuery = query(
          collection(db, 'coachApplications'),
          where('status', '==', 'approved')
        )
        const snapshot = await getDocs(coachesQuery)
        const loadedCoaches: Coach[] = snapshot.docs.map(doc => {
          const data = doc.data()
          
          // Supporta sia lifeAreas (nuovo) che lifeArea (vecchio)
          const lifeAreasArray = data.lifeAreas as LifeAreaId[] || []
          const lifeAreaSingle = data.lifeArea as LifeAreaId | undefined
          const allAreas = lifeAreasArray.length > 0 ? lifeAreasArray : (lifeAreaSingle ? [lifeAreaSingle] : [])
          
          // Genera le label delle aree
          const areaLabels = allAreas
            .map(areaId => LIFE_AREAS.find(a => a.id === areaId)?.label)
            .filter(Boolean)
          
          return {
            id: doc.id,
            name: data.name || 'Coach',
            photo: data.photo || null,
            lifeArea: allAreas[0],
            lifeAreas: allAreas,
            specialization: areaLabels[0] || data.specializations?.focusTopics?.[0] || 'Life Coach',
            focusTopics: data.specializations?.focusTopics || [],
            bio: data.bio || data.motivation || '',
            rating: data.rating || 5.0,
            reviewCount: data.reviewCount || 0,
            location: data.location || 'Italia'
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

  // Filtra coach
  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = 
      coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.focusTopics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesArea = 
      selectedArea === 'all' || 
      coach.lifeAreas.includes(selectedArea as LifeAreaId)
    
    return matchesSearch && matchesArea
  })

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
      <section className="bg-gradient-to-br from-primary-500 to-primary-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            I nostri Coach
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Seleziona tra i nostri coach certificati con il metodo CoachaMi 
            e inizia il tuo percorso di crescita trasformazionale
          </p>
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
              placeholder="Cerca per nome o specializzazione..."
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
        </div>
      </section>

      {/* Coach Grid */}
      <section className="py-12 px-4">
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
              <p className="text-gray-500 mb-6">{filteredCoaches.length} coach trovati</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCoaches.map((coach, index) => {
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
                          
                          {/* Badge Coach in alto a sinistra */}
                          <div className="absolute top-4 left-4">
                            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-primary-600 flex items-center gap-1 shadow-sm">
                              <Award size={12} />
                              COACH
                            </span>
                          </div>
                          
                          {/* Badge Illustrazioni Aree in basso a destra */}
                          {coach.lifeAreas.length > 0 && (
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
                          <p className="text-sm text-primary-600 font-medium mb-2">{coach.specialization}</p>
                          
                          {coach.reviewCount > 0 && (
                            <div className="flex items-center gap-1 mb-3">
                              <Star size={14} className="text-amber-400 fill-amber-400" />
                              <span className="text-sm text-gray-700">{coach.rating.toFixed(1)}</span>
                              <span className="text-xs text-gray-400">({coach.reviewCount} recensioni)</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Video size={14} />
                              Online
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

      {/* CTA */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-display font-bold text-charcoal mb-4">
            Non sai quale coach scegliere?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Completa il nostro questionario e ti suggeriremo i coach più adatti alle tue esigenze
          </p>
          <Link 
            href="/onboarding"
            className="btn btn-primary text-lg px-8 py-4"
          >
            Trova il coach giusto per te
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100">
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
