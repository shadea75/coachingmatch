'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Check,
  Star,
  Shield,
  Users,
  Calendar,
  BarChart3,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'free'

export default function CoachSubscriptionPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('trial')
  const [subscriptionPrice, setSubscriptionPrice] = useState(19)
  const [trialDaysLeft, setTrialDaysLeft] = useState(0)
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
      return
    }

    const loadSubscriptionData = async () => {
      if (!user?.id) return

      try {
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        
        if (coachDoc.exists()) {
          const data = coachDoc.data()
          setCoachName(data.name || user.name || 'Coach')
          setSubscriptionPrice(data.subscriptionPrice ?? 19)
          
          const now = new Date()
          
          // Determina stato abbonamento
          if (data.subscriptionPrice === 0) {
            setSubscriptionStatus('free')
          } else if (data.subscriptionStatus === 'expired') {
            setSubscriptionStatus('expired')
          } else if (data.subscriptionStatus === 'active' && data.subscriptionEndDate?.toDate?.() > now) {
            setSubscriptionStatus('active')
            setSubscriptionEndDate(data.subscriptionEndDate.toDate())
          } else {
            // Calcola trial
            let trialDays = 90
            try {
              const settingsDoc = await getDoc(doc(db, 'settings', 'community'))
              if (settingsDoc.exists()) {
                trialDays = settingsDoc.data().freeTrialDays ?? 90
              }
            } catch (e) {}
            
            const createdAt = data.createdAt?.toDate?.() || data.approvedAt?.toDate?.() || new Date()
            const trialEndDate = data.trialEndDate?.toDate?.() || new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000)
            
            if (trialEndDate > now) {
              setSubscriptionStatus('trial')
              setTrialDaysLeft(Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
            } else {
              setSubscriptionStatus('expired')
            }
          }
        }
      } catch (err) {
        console.error('Errore caricamento dati:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadSubscriptionData()
    }
  }, [user, loading, router])

  const handleSubscribe = async () => {
    if (!user?.id) return
    
    setIsProcessing(true)
    
    try {
      // Chiama l'API per creare una sessione Stripe Checkout
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: user.id,
          coachEmail: user.email,
          priceAmount: subscriptionPrice,
        }),
      })
      
      const data = await response.json()
      
      if (data.url) {
        // Redirect a Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Errore creazione checkout')
      }
    } catch (err) {
      console.error('Errore:', err)
      alert('Errore durante la creazione del pagamento. Riprova.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    )
  }

  const features = [
    { icon: BarChart3, label: 'Dashboard completa', description: 'Statistiche e panoramica della tua attività' },
    { icon: Users, label: 'Gestione Clienti', description: 'Organizza coachee e sessioni in un unico posto' },
    { icon: Calendar, label: 'Calendario Integrato', description: 'Sincronizza con Google Calendar' },
    { icon: MessageSquare, label: 'Community', description: 'Accesso alla community e networking' },
    { icon: Star, label: 'Visibilità Vetrina', description: 'Profilo visibile ai potenziali clienti' },
    { icon: Shield, label: 'Pagamenti Sicuri', description: 'Incassi automatici tramite Stripe' },
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="font-semibold text-charcoal">Abbonamento</span>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Banner */}
        {subscriptionStatus === 'expired' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-red-800">Il tuo abbonamento è scaduto</p>
              <p className="text-sm text-red-600">Attiva l'abbonamento per continuare ad usare CoachaMi</p>
            </div>
          </motion.div>
        )}

        {subscriptionStatus === 'trial' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <Clock className="text-blue-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-blue-800">Periodo di prova attivo</p>
              <p className="text-sm text-blue-600">Ti restano {trialDaysLeft} giorni di prova gratuita</p>
            </div>
          </motion.div>
        )}

        {subscriptionStatus === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <Check className="text-green-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-green-800">Abbonamento attivo</p>
              <p className="text-sm text-green-600">
                Prossimo rinnovo: {subscriptionEndDate?.toLocaleDateString('it-IT')}
              </p>
            </div>
          </motion.div>
        )}

        {subscriptionStatus === 'free' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <Sparkles className="text-purple-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-purple-800">Account Gratuito</p>
              <p className="text-sm text-purple-600">Hai accesso completo alla piattaforma senza costi</p>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Piano */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            {/* Header piano */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-6 text-white">
              <h2 className="text-xl font-bold mb-1">Piano Coach</h2>
              <p className="text-white/80 text-sm">Tutto ciò che ti serve per gestire la tua attività</p>
              
              <div className="mt-6">
                <span className="text-4xl font-bold">€{subscriptionPrice}</span>
                <span className="text-white/80">/mese</span>
              </div>
            </div>

            {/* Features */}
            <div className="p-6">
              <ul className="space-y-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-charcoal">{feature.label}</p>
                        <p className="text-sm text-gray-500">{feature.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* CTA */}
              {subscriptionStatus !== 'active' && subscriptionStatus !== 'free' && (
                <button
                  onClick={handleSubscribe}
                  disabled={isProcessing}
                  className="w-full mt-6 btn btn-primary py-4 text-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Elaborazione...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      {subscriptionStatus === 'expired' ? 'Riattiva Abbonamento' : 'Attiva Abbonamento'}
                    </>
                  )}
                </button>
              )}

              {subscriptionStatus === 'active' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
                  <p className="text-sm text-gray-600">
                    Il tuo abbonamento è attivo e si rinnoverà automaticamente.
                  </p>
                  <button className="mt-2 text-sm text-red-500 hover:text-red-600 underline">
                    Annulla abbonamento
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* FAQ / Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-4">Domande Frequenti</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-charcoal text-sm">Posso annullare in qualsiasi momento?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Sì, puoi annullare il tuo abbonamento quando vuoi. L'accesso rimarrà attivo fino alla fine del periodo pagato.
                  </p>
                </div>
                
                <div>
                  <p className="font-medium text-charcoal text-sm">Quali metodi di pagamento accettate?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Accettiamo tutte le principali carte di credito e debito tramite Stripe.
                  </p>
                </div>
                
                <div>
                  <p className="font-medium text-charcoal text-sm">Cosa succede se scade l'abbonamento?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    L'accesso all'area coach verrà sospeso, ma i tuoi dati rimarranno salvati. Potrai riattivare in qualsiasi momento.
                  </p>
                </div>
                
                <div>
                  <p className="font-medium text-charcoal text-sm">C'è un contratto minimo?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    No, l'abbonamento è mensile senza vincoli. Paghi mese per mese.
                  </p>
                </div>
              </div>
            </div>

            {/* Supporto */}
            <div className="bg-primary-50 rounded-2xl p-6">
              <h3 className="font-semibold text-charcoal mb-2">Hai bisogno di aiuto?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Il nostro team è qui per aiutarti con qualsiasi domanda sull'abbonamento.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href="mailto:coach@coachami.it"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-lg text-primary-600 font-medium text-sm hover:bg-primary-100 transition-colors border border-primary-200"
                >
                  Contatta il supporto
                  <ArrowRight size={14} />
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('coach@coachami.it')
                    alert('Email copiata: coach@coachami.it')
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Copia email
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                📧 coach@coachami.it
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 text-gray-400">
              <div className="flex items-center gap-2 text-xs">
                <Shield size={16} />
                <span>Pagamento sicuro</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CreditCard size={16} />
                <span>Powered by Stripe</span>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
