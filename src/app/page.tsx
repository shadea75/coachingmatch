'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowRight, 
  Users, 
  Star,
  CheckCircle2,
  Sparkles,
  Heart,
  MessageCircle,
  Shield,
  Menu,
  X,
  Target,
  Zap,
  Award
} from 'lucide-react'
import Logo from '@/components/Logo'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="#come-funziona" 
              className="text-gray-600 hover:text-charcoal transition-colors"
            >
              Come Funziona
            </Link>
            <Link 
              href="/coach/apply" 
              className="text-gray-600 hover:text-charcoal transition-colors"
            >
              Diventa Coach
            </Link>
            <Link 
              href="/pricing" 
              className="text-gray-600 hover:text-charcoal transition-colors"
            >
              Piani Coach
            </Link>
            <Link 
              href="/login" 
              className="text-gray-600 hover:text-charcoal transition-colors"
            >
              Accedi
            </Link>
            <Link 
              href="/test-gratuito"
              className="btn btn-primary"
            >
              Inizia ora
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link 
              href="/test-gratuito"
              className="btn btn-primary text-sm px-4 py-2"
            >
              Inizia
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-lg"
          >
            <div className="px-4 py-4 space-y-3">
              <Link 
                href="#come-funziona" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-gray-600 hover:text-charcoal transition-colors"
              >
                Come Funziona
              </Link>
              <Link 
                href="/coach/apply" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-gray-600 hover:text-charcoal transition-colors"
              >
                Diventa Coach
              </Link>
              <Link 
                href="/pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-gray-600 hover:text-charcoal transition-colors"
              >
                Piani Coach
              </Link>
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-gray-600 hover:text-charcoal transition-colors"
              >
                Accedi
              </Link>
            </div>
          </motion.div>
        )}
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
              Test gratuito + Report personalizzato
            </span>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold text-charcoal mb-6 leading-tight">
              Scopri chi sei e trova<br />
              il coach{' '}
              <span className="gradient-text">giusto per te</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Fai il test gratuito della Ruota della Vita: ricevi un report personalizzato 
              sulle 8 aree della tua vita e scopri i coach più compatibili con i tuoi obiettivi.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/test-gratuito"
                className="btn btn-primary text-lg px-8 py-4 relative btn-pulse"
              >
                Fai il test gratuito
                <ArrowRight size={20} />
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
              <span>Report gratuito via email</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500" fill="currentColor" />
              <span>Coach certificati</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-blue-500" />
              <span>Chat diretta con il coach</span>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* How it works */}
      <section id="come-funziona" className="py-20 px-4 bg-white">
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
                icon: Target,
                color: '#6366F1',
                title: 'Completa il test',
                description: 'Rispondi a semplici domande su 8 aree chiave della tua vita: salute, finanze, carriera e altro.'
              },
              {
                icon: Zap,
                color: '#EC4899',
                title: 'Scopri il tuo profilo',
                description: 'Il nostro algoritmo analizza le tue risposte e identifica le tue priorità e il tuo archetipo.'
              },
              {
                icon: Users,
                color: '#10B981',
                title: 'Ricevi i match',
                description: 'Visualizza i coach più compatibili con te e contattali via chat per iniziare.'
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
                <div className="bg-cream rounded-2xl p-8 h-full card-hover">
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

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
              Perché CoachaMi?
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Non un semplice elenco di coach, ma un sistema intelligente di matching
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Target,
                title: 'Matching personalizzato',
                description: 'Il nostro algoritmo considera le tue esigenze, il tuo stile e i tuoi obiettivi per suggerirti i coach più compatibili.'
              },
              {
                icon: Award,
                title: 'Coach selezionati',
                description: 'Ogni coach sulla piattaforma è stato verificato e possiede certificazioni e esperienza comprovata.'
              },
              {
                icon: MessageCircle,
                title: 'Chat diretta con il coach',
                description: 'Scrivi direttamente al coach per conoscerlo. Chatta in tempo reale prima di iniziare un percorso.'
              },
              {
                icon: Shield,
                title: 'Pagamenti sicuri',
                description: 'Gestisci tutto dalla piattaforma: prenotazioni, pagamenti e comunicazioni in modo sicuro.'
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 flex gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <benefit.icon size={24} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-charcoal mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">
                    {benefit.description}
                  </p>
                </div>
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
                Bastano 5 minuti per completare il test e scoprire i coach più adatti a te.
              </p>
              
              <Link 
                href="/test-gratuito"
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
              <Link href="/coach/apply" className="hover:text-charcoal transition-colors">
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
