'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowRight, 
  Users, 
  Calendar,
  Star,
  CheckCircle2,
  Sparkles,
  Heart,
  Briefcase,
  Shield,
  PiggyBank,
  PartyPopper,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'

interface Coach {
  id: string
  name: string
  photo: string | null
  specialization: string
  bio: string
  rating: number
  reviewCount: number
}

export default function HomePage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loadingCoaches, setLoadingCoaches] = useState(true)

  // Carica coach approvati
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        const coachesQuery = query(
          collection(db, 'coachApplications'),
          where('status', '==', 'approved'),
          limit(8)
        )
        const snapshot = await getDocs(coachesQuery)
        const loadedCoaches: Coach[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || 'Coach',
            photo: data.photo || null,
            specialization: data.specializations?.focusTopics?.[0] || 'Life Coach',
            bio: data.bio || data.motivation || '',
            rating: data.rating || 5.0,
            reviewCount: data.reviewCount || 0
          }
        })
        setCoaches(loadedCoaches)
      } catch (err) {
        console.error('Errore caricamento coach:', err)
      } finally {
        setLoadingCoaches(false)
      }
    }
    loadCoaches()
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="#coaches" 
              className="text-gray-600 hover:text-charcoal transition-colors hidden sm:block"
            >
              I Nostri Coach
            </Link>
            <Link 
              href="/coach/register" 
              className="text-gray-600 hover:text-charcoal transition-colors hidden sm:block"
            >
              Diventa Coach
            </Link>
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
      </nav>
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
              <Sparkles size={16} />
              Il tuo percorso di crescita inizia qui
            </span>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold text-charcoal mb-6 leading-tight">
              Trova il coach{' '}
              <span className="gradient-text">giusto per te</span>,<br />
              senza perdere tempo
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Valuta le aree della tua vita, definisci cosa vuoi migliorare 
              e incontra coach selezionati appositamente per te.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/onboarding"
                className="btn btn-primary text-lg px-8 py-4 relative btn-pulse"
              >
                Inizia il percorso
                <ArrowRight size={20} />
              </Link>
              
              <Link 
                href="#coaches"
                className="btn btn-secondary text-lg px-8 py-4"
              >
                Scopri i coach
              </Link>
            </div>
          </motion.div>
          
          {/* Trust badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-500"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              <span>Prima call gratuita</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500" fill="currentColor" />
              <span>Coach certificati</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-blue-500" />
              <span>100% riservato</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* I Nostri Coach Section */}
      <section id="coaches" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
              I nostri Coach
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Seleziona tra i nostri coach certificati e inizia il tuo percorso di crescita trasformazionale
            </p>
          </div>
          
          {loadingCoaches ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : coaches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nessun coach disponibile al momento</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {coaches.map((coach, index) => (
                  <motion.div
                    key={coach.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Link href={`/coaches/${coach.id}`}>
                      <div className="group relative bg-cream rounded-2xl overflow-hidden card-hover">
                        {/* Foto Coach */}
                        <div className="aspect-[3/4] relative overflow-hidden">
                          {coach.photo ? (
                            <img 
                              src={coach.photo} 
                              alt={coach.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                              <span className="text-6xl font-bold text-primary-400">
                                {coach.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          
                          {/* Overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          
                          {/* Badge COACH */}
                          <div className="absolute top-4 left-4">
                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-primary-600">
                              COACH
                            </span>
                          </div>
                          
                          {/* Info bottom */}
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                            <h3 className="text-xl font-bold mb-1">{coach.name}</h3>
                            <p className="text-sm text-white/80">{coach.specialization}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
              
              {/* CTA per vedere tutti */}
              <div className="text-center mt-10">
                <Link 
                  href="/coaches"
                  className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                >
                  Vedi tutti i coach
                  <ArrowRight size={18} />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
      
      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
              Come funziona
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Un processo semplice e guidato per trovare il coach perfetto per le tue esigenze
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: CheckCircle2,
                color: '#6366F1',
                title: 'Valuta le aree della tua vita',
                description: 'Rispondi a semplici domande su 8 aree chiave: salute, finanze, carriera e altro.'
              },
              {
                icon: Heart,
                color: '#EC4899',
                title: 'Definisci i tuoi obiettivi',
                description: 'Scegli cosa vuoi migliorare. Il nostro algoritmo identifica le tue priorità.'
              },
              {
                icon: Users,
                color: '#10B981',
                title: 'Incontra i coach selezionati',
                description: 'Ricevi proposte personalizzate e prenota una call gratuita di orientamento.'
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-8 h-full card-hover">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${step.color}15` }}
                  >
                    <step.icon size={28} style={{ color: step.color }} />
                  </div>
                  
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-charcoal text-white flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-charcoal mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Areas preview */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
              8 aree della vita da esplorare
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Un approccio olistico per capire dove sei e dove vuoi arrivare
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Salute e Vitalità', color: '#10B981', icon: Heart },
              { label: 'Finanze', color: '#14B8A6', icon: PiggyBank },
              { label: 'Carriera/Lavoro', color: '#6366F1', icon: Briefcase },
              { label: 'Relazioni', color: '#F59E0B', icon: Users },
              { label: 'Amore', color: '#EC4899', icon: Heart },
              { label: 'Crescita Personale', color: '#8B5CF6', icon: Sparkles },
              { label: 'Spiritualità', color: '#F97316', icon: Star },
              { label: 'Divertimento', color: '#3B82F6', icon: PartyPopper },
            ].map((area, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-cream rounded-xl p-6 text-center card-hover"
              >
                <div 
                  className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${area.color}15` }}
                >
                  <area.icon size={24} style={{ color: area.color }} />
                </div>
                <span className="font-medium text-charcoal">{area.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-12 text-center text-white relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Pronto a iniziare il tuo percorso?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-xl mx-auto">
                Bastano 5 minuti per completare la valutazione e ricevere i tuoi match personalizzati.
              </p>
              
              <Link 
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Inizia ora — è gratuito
                <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Logo size="sm" />
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-charcoal transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-charcoal transition-colors">
                Termini di Servizio
              </Link>
              <Link href="/coach/register" className="hover:text-charcoal transition-colors">
                Diventa Coach
              </Link>
              <Link href="/contact" className="hover:text-charcoal transition-colors">
                Contatti
              </Link>
            </div>
            
            <p className="text-sm text-gray-400">
              © 2026 CoachaMi. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
