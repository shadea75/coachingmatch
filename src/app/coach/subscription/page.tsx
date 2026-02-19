'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, CreditCard, Check, Shield, Loader2, 
  AlertTriangle, Clock, Sparkles
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'free'
type BillingCycle = 'monthly' | 'annual'

const plans = [
  {
    id: 'starter', name: 'Starter', icon: '🌱', title: 'Muovi i primi passi',
    description: 'Perfetto per chi vuole esplorare la piattaforma',
    monthlyPrice: 9, annualPrice: 7, annualTotal: 84,
    features: [
      'Profilo coach sulla piattaforma',
      'Matching con coachee (max 5/mese)',
      'Calendario e gestione disponibilità',
      'Pagamenti integrati (Stripe)',
      'Contrattualistica automatica',
      'Accesso Community Coach Corner',
    ],
  },
  {
    id: 'professional', name: 'Professional', icon: '🚀', title: 'Cresci con costanza',
    description: 'Per chi vuole acquisire clienti e gestire il business',
    monthlyPrice: 29, annualPrice: 24, annualTotal: 288, popular: true,
    featuresLabel: 'Tutto di Starter, più',
    features: [
      'Matching illimitato con coachee',
      'Ufficio Virtuale completo',
      'Gestione clienti esterni (CRM)',
      'Offerte e percorsi personalizzati',
      'Google Calendar sync',
      'Report guadagni mensili',
    ],
  },
  {
    id: 'business', name: 'Business', icon: '💼', title: 'Scala il tuo business',
    description: 'Per coach affermati con strumenti avanzati',
    monthlyPrice: 49, annualPrice: 41, annualTotal: 492,
    featuresLabel: 'Tutto di Professional, più',
    features: [
      'Badge "Coach Verificato" ✦',
      'Fatturazione elettronica (SDI)',
      'Vendita prodotti digitali',
      'Statistiche avanzate e analytics',
      'Supporto prioritario',
    ],
  },
  {
    id: 'elite', name: 'Elite', icon: '👑', title: 'Il massimo, sempre',
    description: 'Per i top coach che vogliono ogni vantaggio',
    monthlyPrice: 79, annualPrice: 66, annualTotal: 792, elite: true,
    featuresLabel: 'Tutto di Business, più',
    features: [
      'Commissione ridotta: 20% (invece di 30%)',
      'Boost visibilità da engagement Community',
      'Pagina profilo personalizzata premium',
      'Pubblicazione articoli sul blog',
      'Webinar e masterclass sulla piattaforma',
      'Account manager dedicato',
      'Early access nuove funzionalità',
    ],
  },
]

export default function CoachSubscriptionPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('trial')
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState(0)
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return }

    const loadData = async () => {
      if (!user?.id) return
      try {
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        if (coachDoc.exists()) {
          const data = coachDoc.data()
          const now = new Date()
          setCurrentPlan(data.subscriptionTier || null)
          
          if (data.subscriptionPrice === 0) {
            setSubscriptionStatus('free')
          } else if (data.subscriptionStatus === 'expired') {
            setSubscriptionStatus('expired')
          } else if (data.subscriptionStatus === 'active' && data.subscriptionEndDate?.toDate?.() > now) {
            setSubscriptionStatus('active')
            setSubscriptionEndDate(data.subscriptionEndDate.toDate())
          } else {
            let trialDays = 14
            try {
              const s = await getDoc(doc(db, 'settings', 'community'))
              if (s.exists()) trialDays = s.data().freeTrialDays ?? 14
            } catch (e) {}
            const createdAt = data.createdAt?.toDate?.() || data.approvedAt?.toDate?.() || new Date()
            const trialEnd = data.trialEndDate?.toDate?.() || new Date(createdAt.getTime() + trialDays * 86400000)
            if (trialEnd > now) {
              setSubscriptionStatus('trial')
              setTrialDaysLeft(Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
            } else {
              setSubscriptionStatus('expired')
            }
          }
        }
      } catch (err) { console.error('Errore:', err) }
      finally { setIsLoading(false) }
    }
    if (user) loadData()
  }, [user, loading, router])

  const handleSubscribe = async (planId: string) => {
    if (!user?.id) return
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    setIsProcessing(planId)
    
    try {
      const priceAmount = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: user.id,
          coachEmail: user.email,
          priceAmount,
          planId: plan.id,
          planName: plan.name,
          billingCycle,
        }),
      })
      const data = await response.json()
      if (data.url) { window.location.href = data.url }
      else { throw new Error(data.error || 'Errore') }
    } catch (err) {
      console.error('Errore:', err)
      alert('Errore durante la creazione del pagamento. Riprova.')
    } finally { setIsProcessing(null) }
  }

  if (loading || isLoading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center"><Loader2 className="animate-spin text-primary-500" size={40} /></div>
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="font-semibold text-charcoal">Scegli il tuo piano</span>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Banners */}
        {subscriptionStatus === 'expired' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-red-800">Il tuo periodo di prova è scaduto</p>
              <p className="text-sm text-red-600">Scegli un piano per continuare ad usare CoachaMi</p>
            </div>
          </motion.div>
        )}
        {subscriptionStatus === 'trial' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock className="text-blue-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-blue-800">Periodo di prova attivo — {trialDaysLeft} giorni rimasti</p>
              <p className="text-sm text-blue-600">Hai accesso completo. Scegli un piano prima della scadenza.</p>
            </div>
          </motion.div>
        )}
        {subscriptionStatus === 'active' && currentPlan && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Check className="text-green-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-green-800">Piano {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} attivo</p>
              <p className="text-sm text-green-600">Rinnovo: {subscriptionEndDate?.toLocaleDateString('it-IT')} · Puoi fare upgrade quando vuoi.</p>
            </div>
          </motion.div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-charcoal' : 'text-gray-400'}`}>Mensile</span>
          <button onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className={`w-14 h-[30px] rounded-full relative transition-colors ${billingCycle === 'annual' ? 'bg-primary-500' : 'bg-gray-300'}`}>
            <div className={`w-6 h-6 bg-white rounded-full absolute top-[3px] shadow-md transition-transform duration-300 ${billingCycle === 'annual' ? 'translate-x-[29px]' : 'translate-x-[3px]'}`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)' }} />
          </button>
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'annual' ? 'text-charcoal' : 'text-gray-400'}`}>Annuale</span>
          <span className={`text-xs font-bold text-white bg-emerald-500 px-3 py-1 rounded-full transition-all duration-300 ${billingCycle === 'annual' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            Risparmi 2 mesi!
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {plans.map((plan, index) => {
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
            const isCurrent = currentPlan === plan.id && subscriptionStatus === 'active'
            const isProcessingThis = isProcessing === plan.id
            
            return (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                className={`rounded-3xl p-7 relative border-[1.5px] transition-all duration-300
                  ${plan.popular ? 'border-primary-500 bg-gradient-to-b from-orange-50/60 to-white shadow-lg shadow-primary-500/10 md:scale-[1.03]'
                    : plan.elite ? 'border-transparent bg-charcoal text-white'
                    : isCurrent ? 'border-green-400 bg-green-50/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'}`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">⭐ Più scelto</div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">✓ Piano attuale</div>
                )}

                <div className="text-3xl mb-3">{plan.icon}</div>
                <div className={`text-xs font-bold uppercase tracking-[1.5px] mb-1 ${plan.elite ? 'text-white/50' : 'text-gray-400'}`}>{plan.name}</div>
                <h3 className="font-display text-xl font-semibold mb-1">{plan.title}</h3>
                <p className={`text-sm mb-5 ${plan.elite ? 'text-white/50' : 'text-gray-400'}`}>{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-sm font-semibold mt-2">€</span>
                  <span className="font-display text-4xl font-bold">{price}</span>
                  <span className={`text-sm ${plan.elite ? 'text-white/40' : 'text-gray-400'}`}>/mese</span>
                </div>
                <div className={`text-xs mb-5 h-4 ${plan.elite ? 'text-white/35' : 'text-gray-400'}`}>
                  {billingCycle === 'annual' ? `€${plan.annualTotal}/anno` : '\u00A0'}
                </div>

                {isCurrent ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-semibold bg-green-100 text-green-700 mb-6">Piano attivo ✓</div>
                ) : (
                  <button onClick={() => handleSubscribe(plan.id)} disabled={isProcessing !== null}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 mb-6 flex items-center justify-center gap-2
                      ${plan.popular ? 'bg-primary-500 text-white shadow-md hover:bg-primary-600'
                        : plan.elite ? 'bg-white text-charcoal hover:bg-amber-50'
                        : 'border-[1.5px] border-gray-200 text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-white'}
                      ${isProcessing !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isProcessingThis ? <><Loader2 className="animate-spin" size={16} /> Elaborazione...</>
                      : subscriptionStatus === 'active' ? 'Passa a questo piano' : 'Inizia ora'}
                  </button>
                )}

                <div className={`h-px mb-5 ${plan.elite ? 'bg-white/10' : 'bg-gray-100'}`} />
                {plan.featuresLabel && (
                  <div className={`text-xs font-semibold mb-3 ${plan.elite ? 'text-white/40' : 'text-gray-400'}`}>{plan.featuresLabel}</div>
                )}
                <div className="space-y-2.5">
                  {plan.features.map((feature, fi) => (
                    <div key={fi} className="flex items-start gap-2 text-sm leading-snug">
                      <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] mt-0.5
                        ${plan.elite ? 'bg-amber-500/15 text-amber-400'
                          : plan.popular ? 'bg-orange-50 text-primary-500'
                          : index === 0 ? 'bg-emerald-50 text-emerald-500'
                          : 'bg-blue-50 text-blue-500'}`}>
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Commission */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="mt-12 bg-white rounded-2xl p-8 border border-gray-200 text-center max-w-2xl mx-auto">
          <h3 className="font-display text-xl font-semibold mb-2">Come funzionano i guadagni</h3>
          <p className="text-sm text-gray-400 mb-6">Per ogni sessione tramite CoachaMi, tratteniamo solo una piccola commissione.</p>
          <div className="flex items-center justify-center gap-8">
            <div><div className="font-display text-4xl font-bold text-emerald-500">70%</div><div className="text-xs text-gray-400 mt-1">A te</div></div>
            <div className="text-xl text-gray-200">→</div>
            <div><div className="font-display text-4xl font-bold text-primary-300">30%</div><div className="text-xs text-gray-400 mt-1">Piattaforma</div></div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Con <strong className="text-amber-500">Elite</strong>: commissione al <strong className="text-emerald-500">20%</strong>.
            Clienti esterni nell&apos;Ufficio Virtuale: <strong>zero commissioni</strong>.
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-8 mt-8 mb-12 text-gray-400">
          <div className="flex items-center gap-2 text-xs"><Shield size={16} /><span>Pagamento sicuro</span></div>
          <div className="flex items-center gap-2 text-xs"><CreditCard size={16} /><span>Powered by Stripe</span></div>
          <div className="flex items-center gap-2 text-xs"><Clock size={16} /><span>14 giorni di prova</span></div>
        </div>
      </main>
    </div>
  )
}
