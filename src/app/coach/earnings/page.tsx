'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Euro, 
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
  CreditCard,
  ArrowUpRight,
  AlertCircle,
  ExternalLink,
  Building2,
  Info
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import TierGate from '@/components/TierGate'
import { formatCurrency, PLATFORM_CONFIG } from '@/types/payments'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function CoachEarningsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'incasso'>('overview')
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState<'stripe' | 'bank_transfer' | null>(null)

  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayout: 0,
    totalPaid: 0,
    currentMonthEarnings: 0,
    currentMonthSessions: 0
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [pendingBankPayouts, setPendingBankPayouts] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        // Stripe configurato?
        const stripeDoc = await getDoc(doc(db, 'coachStripeAccounts', user.id))
        const stripeOk = stripeDoc.exists() && stripeDoc.data()?.onboardingComplete
        setStripeConfigured(stripeOk)

        // payoutMethod
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        const method = coachDoc.exists() ? (coachDoc.data()?.payoutMethod || null) : null
        setPayoutMethod(method)

        // Stats
        const earningsDoc = await getDoc(doc(db, 'coachEarnings', user.id))
        if (earningsDoc.exists()) {
          const d = earningsDoc.data()
          setStats({
            totalEarnings: d.totalEarnings || 0,
            pendingPayout: d.pendingPayout || 0,
            totalPaid: d.totalPaid || 0,
            currentMonthEarnings: d.currentMonthEarnings || 0,
            currentMonthSessions: d.currentMonthSessions || 0
          })
        }

        // Transazioni
        const txSnap = await getDocs(query(
          collection(db, 'transactions'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc')
        ))
        setTransactions(txSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date()
        })))

        // Pagamenti bonifico (solo bank_transfer)
        if (method === 'bank_transfer') {
          try {
            const payoutsSnap = await getDocs(query(
              collection(db, 'coachPayouts'),
              where('coachId', '==', user.id),
              orderBy('paidAt', 'desc')
            ))
            setPendingBankPayouts(payoutsSnap.docs.map(d => ({
              id: d.id,
              ...d.data(),
              paidAt: d.data().paidAt?.toDate?.() || new Date(),
              completedAt: d.data().completedAt?.toDate?.() || null,
            })))
          } catch (e) {
            setPendingBankPayouts([])
          }
        }
      } catch (err) {
        console.error('Errore caricamento dati:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  if (!user || user.role !== 'coach') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">Accesso riservato ai coach</p>
      </div>
    )
  }

  const pendingCount = pendingBankPayouts.filter(p => p.status === 'pending').length
  const pendingTotal = pendingBankPayouts
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + (p.coachPayout || 0), 0)

  const infoText = payoutMethod === 'stripe' && stripeConfigured
    ? `I fondi vengono trasferiti automaticamente dopo ${PLATFORM_CONFIG.COACH_PAYOUT_DELAY_DAYS} giorni.`
    : payoutMethod === 'bank_transfer'
      ? 'CoachaMi ti bonifica ogni lunedì. Emetti fattura/ricevuta per ogni importo ricevuto.'
      : 'Configura il metodo di pagamento per ricevere i tuoi guadagni.'

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/coach/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">I miei guadagni</h1>
                <p className="text-sm text-gray-500">Gestisci i tuoi pagamenti</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Banner: nessun metodo configurato */}
            {!payoutMethod && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">Configura come ricevere i pagamenti</p>
                  <p className="text-sm text-amber-700 mb-2">
                    Scegli tra Stripe (automatico) o bonifico bancario per ricevere il {PLATFORM_CONFIG.COACH_PERCENTAGE}% di ogni sessione.
                  </p>
                  <Link href="/coach/stripe-onboarding"
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 hover:underline">
                    Configura ora <ExternalLink size={14} />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Banner: Stripe attivo */}
            {payoutMethod === 'stripe' && stripeConfigured && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                <p className="text-sm text-green-700">
                  <strong>Stripe attivo</strong> — il {PLATFORM_CONFIG.COACH_PERCENTAGE}% di ogni pagamento viene trasferito automaticamente sul tuo conto.
                </p>
              </motion.div>
            )}

            {/* Banner: Stripe scelto ma non completato */}
            {payoutMethod === 'stripe' && !stripeConfigured && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">Completa la configurazione Stripe</p>
                  <p className="text-sm text-amber-700 mb-2">Hai scelto Stripe ma l'onboarding non è ancora completato.</p>
                  <Link href="/coach/stripe-onboarding"
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 hover:underline">
                    Completa <ExternalLink size={14} />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Banner: bonifico con importi in attesa */}
            {payoutMethod === 'bank_transfer' && pendingTotal > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Building2 className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">
                    Hai {formatCurrency(pendingTotal)} da ricevere tramite bonifico
                  </p>
                  <p className="text-sm text-blue-700">
                    CoachaMi ti bonificherà il {PLATFORM_CONFIG.COACH_PERCENTAGE}% di ogni sessione pagata ogni lunedì.
                  </p>
                  <button onClick={() => setActiveTab('incasso')}
                    className="mt-1 text-sm font-medium text-blue-800 hover:underline">
                    Vedi dettaglio →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: <Euro className="text-green-500" size={24} />, label: 'Guadagni totali', value: stats.totalEarnings, sub: 'Totale' },
                { icon: <Clock className="text-amber-500" size={24} />, label: 'Da ricevere', value: stats.pendingPayout, sub: 'In arrivo' },
                { icon: <CheckCircle className="text-primary-500" size={24} />, label: 'Già ricevuto', value: stats.totalPaid, sub: 'Ricevuto' },
                { icon: <TrendingUp className="text-blue-500" size={24} />, label: `${stats.currentMonthSessions} sessioni`, value: stats.currentMonthEarnings, sub: 'Questo mese' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    {s.icon}
                    <span className="text-xs text-gray-400">{s.sub}</span>
                  </div>
                  <p className="text-2xl font-bold text-charcoal">{formatCurrency(s.value)}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Info commissione */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
              <Info className="text-blue-500 flex-shrink-0" size={18} />
              <p className="text-sm text-blue-700">
                Ricevi il <strong>{PLATFORM_CONFIG.COACH_PERCENTAGE}%</strong> di ogni pagamento. {infoText}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>Panoramica</button>
              <button onClick={() => setActiveTab('transactions')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'transactions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>Transazioni</button>
              {payoutMethod === 'bank_transfer' && (
                <button onClick={() => setActiveTab('incasso')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'incasso' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  Da incassare{pendingCount > 0 ? ` (${pendingCount})` : ''}
                </button>
              )}
            </div>

            {/* Tab: Panoramica */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Link href="/coach/offers/new"
                    className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Euro className="text-green-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-charcoal">Crea offerta</p>
                      <p className="text-sm text-gray-500">Invia proposta a un coachee</p>
                    </div>
                    <ArrowUpRight className="text-gray-400" size={20} />
                  </Link>
                  {!payoutMethod && (
                    <Link href="/coach/stripe-onboarding"
                      className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <CreditCard className="text-amber-500" size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-charcoal">Configura pagamenti</p>
                        <p className="text-sm text-gray-500">Scegli Stripe o bonifico</p>
                      </div>
                      <ArrowUpRight className="text-gray-400" size={20} />
                    </Link>
                  )}
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-charcoal">Ultime transazioni</h3>
                    <button onClick={() => setActiveTab('transactions')}
                      className="text-sm text-primary-500 hover:underline">Vedi tutte</button>
                  </div>
                  {transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'payment' ? 'bg-green-100' : 'bg-blue-100'}`}>
                              {tx.type === 'payment'
                                ? <ArrowUpRight className="text-green-500" size={18} />
                                : <CheckCircle className="text-blue-500" size={18} />}
                            </div>
                            <div>
                              <p className="font-medium text-charcoal text-sm">
                                {tx.type === 'payment' ? 'Pagamento sessione' : 'Trasferimento'}
                              </p>
                              <p className="text-xs text-gray-500">{format(tx.createdAt, 'd MMM yyyy', { locale: it })}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-green-600">+{formatCurrency(tx.coachPayout)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nessuna transazione ancora</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Tab: Transazioni */}
            {activeTab === 'transactions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm">
                {transactions.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {transactions.map(tx => (
                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'payment' ? 'bg-green-100' : tx.type === 'refund' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {tx.type === 'payment' && <ArrowUpRight className="text-green-500" size={18} />}
                            {tx.type === 'payout' && <CheckCircle className="text-blue-500" size={18} />}
                            {tx.type === 'refund' && <ArrowUpRight className="text-red-500 rotate-180" size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-charcoal">
                              {tx.type === 'payment' && 'Pagamento sessione'}
                              {tx.type === 'payout' && 'Trasferimento sul conto'}
                              {tx.type === 'refund' && 'Rimborso'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {tx.offerTitle && <span className="mr-2">{tx.offerTitle}</span>}
                              {format(tx.createdAt, 'd MMMM yyyy, HH:mm', { locale: it })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${tx.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                            {tx.type === 'refund' ? '-' : '+'}{formatCurrency(tx.coachPayout)}
                          </p>
                          <p className="text-xs text-gray-400">su {formatCurrency(tx.amountPaid)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Euro className="text-gray-200 mx-auto mb-4" size={48} />
                    <p className="text-gray-500">Nessuna transazione</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab: Da incassare — solo bank_transfer */}
            {activeTab === 'incasso' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Da ricevere',
                      value: pendingBankPayouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.coachPayout, 0),
                      color: 'text-red-600', bg: 'bg-red-50 border-red-100'
                    },
                    {
                      label: 'In elaborazione',
                      value: pendingBankPayouts.filter(p => p.status === 'processing').reduce((s, p) => s + p.coachPayout, 0),
                      color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100'
                    },
                    {
                      label: 'Ricevuti',
                      value: pendingBankPayouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.coachPayout, 0),
                      color: 'text-green-600', bg: 'bg-green-50 border-green-100'
                    },
                  ].map((s, i) => (
                    <div key={i} className={`rounded-xl p-4 text-center border ${s.bg}`}>
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
                    </div>
                  ))}
                </div>

                {pendingBankPayouts.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                    <CheckCircle className="text-green-300 mx-auto mb-3" size={40} />
                    <p className="text-gray-500">Nessun pagamento in attesa</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm divide-y">
                    {pendingBankPayouts.map(p => (
                      <div key={p.id} className="p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-charcoal truncate">{p.offerTitle}</p>
                          <p className="text-sm text-gray-500">
                            Sessione {p.sessionNumber}/{p.totalSessions} • {format(p.paidAt, 'd MMM yyyy', { locale: it })}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Pagato dal coachee: {formatCurrency(p.amountPaid)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-green-700">{formatCurrency(p.coachPayout)}</p>
                          <p className="text-xs text-gray-400">70% a te</p>
                        </div>
                        <div className="flex-shrink-0">
                          {p.status === 'pending' && (
                            <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium whitespace-nowrap">In arrivo</span>
                          )}
                          {p.status === 'processing' && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium whitespace-nowrap">In elaborazione</span>
                          )}
                          {p.status === 'completed' && (
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium whitespace-nowrap">
                              ✓ Ricevuto{p.completedAt ? ` ${format(p.completedAt, 'd MMM', { locale: it })}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <Info className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-gray-500">
                    CoachaMi elabora i bonifici ogni lunedì. Ricorda di emettere fattura o ricevuta
                    intestata a <strong>Debora Carofiglio</strong> (P.IVA IT02411430685) per ogni importo ricevuto.
                  </p>
                </div>
              </motion.div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
