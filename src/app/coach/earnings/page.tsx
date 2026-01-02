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
  Calendar,
  Loader2,
  CreditCard,
  ArrowUpRight,
  Filter,
  Download,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { formatCurrency, PLATFORM_CONFIG } from '@/types/payments'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc 
} from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function CoachEarningsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payouts'>('overview')
  const [stripeConfigured, setStripeConfigured] = useState(false)
  
  // Statistiche
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayout: 0,
    totalPaid: 0,
    currentMonthEarnings: 0,
    currentMonthSessions: 0
  })
  
  // Transazioni
  const [transactions, setTransactions] = useState<any[]>([])
  
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Verifica Stripe configurato
        const stripeDoc = await getDoc(doc(db, 'coachStripeAccounts', user.id))
        setStripeConfigured(stripeDoc.exists() && stripeDoc.data()?.onboardingComplete)
        
        // Carica statistiche guadagni
        const earningsDoc = await getDoc(doc(db, 'coachEarnings', user.id))
        if (earningsDoc.exists()) {
          const data = earningsDoc.data()
          setStats({
            totalEarnings: data.totalEarnings || 0,
            pendingPayout: data.pendingPayout || 0,
            totalPaid: data.totalPaid || 0,
            currentMonthEarnings: data.currentMonthEarnings || 0,
            currentMonthSessions: data.currentMonthSessions || 0
          })
        }
        
        // Carica transazioni
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const transactionsSnap = await getDocs(transactionsQuery)
        const transactionsData = transactionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }))
        setTransactions(transactionsData)
        
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
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coach/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
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
            {/* Alert Stripe non configurato */}
            {!stripeConfigured && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">Configura i pagamenti</p>
                  <p className="text-sm text-amber-700 mb-3">
                    Per ricevere i tuoi guadagni, devi prima configurare il tuo account di pagamento.
                  </p>
                  <Link
                    href="/coach/stripe-onboarding"
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 hover:underline"
                  >
                    Configura ora <ExternalLink size={14} />
                  </Link>
                </div>
              </motion.div>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <Euro className="text-green-500" size={24} />
                  <span className="text-xs text-gray-400">Totale</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">
                  {formatCurrency(stats.totalEarnings)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Guadagni totali</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock className="text-amber-500" size={24} />
                  <span className="text-xs text-gray-400">In arrivo</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">
                  {formatCurrency(stats.pendingPayout)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Da ricevere</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="text-primary-500" size={24} />
                  <span className="text-xs text-gray-400">Ricevuto</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">
                  {formatCurrency(stats.totalPaid)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Già trasferito</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="text-blue-500" size={24} />
                  <span className="text-xs text-gray-400">Questo mese</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">
                  {formatCurrency(stats.currentMonthEarnings)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.currentMonthSessions} sessioni
                </p>
              </motion.div>
            </div>
            
            {/* Info commissione */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
              <Euro className="text-blue-500 flex-shrink-0" size={20} />
              <p className="text-sm text-blue-700">
                Ricevi il <strong>{PLATFORM_CONFIG.COACH_PERCENTAGE}%</strong> di ogni pagamento. 
                I fondi vengono trasferiti automaticamente sul tuo conto dopo{' '}
                <strong>{PLATFORM_CONFIG.COACH_PAYOUT_DELAY_DAYS} giorni</strong>.
              </p>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              {[
                { id: 'overview', label: 'Panoramica' },
                { id: 'transactions', label: 'Transazioni' },
                { id: 'payouts', label: 'Pagamenti ricevuti' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Content */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Quick actions */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Link
                    href="/coach/offers/new"
                    className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Euro className="text-green-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-charcoal">Crea offerta</p>
                      <p className="text-sm text-gray-500">Invia proposta a un coachee</p>
                    </div>
                    <ArrowUpRight className="text-gray-400" size={20} />
                  </Link>
                  
                  {!stripeConfigured && (
                    <Link
                      href="/coach/stripe-onboarding"
                      className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <CreditCard className="text-amber-500" size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-charcoal">Configura pagamenti</p>
                        <p className="text-sm text-gray-500">Collega il tuo conto</p>
                      </div>
                      <ArrowUpRight className="text-gray-400" size={20} />
                    </Link>
                  )}
                </div>
                
                {/* Ultime transazioni */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-charcoal">Ultime transazioni</h3>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-sm text-primary-500 hover:underline"
                    >
                      Vedi tutte
                    </button>
                  </div>
                  
                  {transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map(tx => (
                        <div 
                          key={tx.id}
                          className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === 'payment' ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                              {tx.type === 'payment' ? (
                                <ArrowUpRight className="text-green-500" size={18} />
                              ) : (
                                <CheckCircle className="text-blue-500" size={18} />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-charcoal text-sm">
                                {tx.type === 'payment' ? 'Pagamento ricevuto' : 'Trasferimento'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(tx.createdAt, "d MMM yyyy", { locale: it })}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-green-600">
                            +{formatCurrency(tx.coachPayout)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Nessuna transazione ancora
                    </p>
                  )}
                </div>
              </motion.div>
            )}
            
            {activeTab === 'transactions' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-sm"
              >
                {transactions.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {transactions.map(tx => (
                      <div 
                        key={tx.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'payment' ? 'bg-green-100' : 
                            tx.type === 'refund' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {tx.type === 'payment' && <ArrowUpRight className="text-green-500" size={18} />}
                            {tx.type === 'payout' && <CheckCircle className="text-blue-500" size={18} />}
                            {tx.type === 'refund' && <ArrowUpRight className="text-red-500 rotate-180" size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-charcoal">
                              {tx.type === 'payment' && 'Pagamento ricevuto'}
                              {tx.type === 'payout' && 'Trasferimento sul conto'}
                              {tx.type === 'refund' && 'Rimborso'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(tx.createdAt, "d MMMM yyyy, HH:mm", { locale: it })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            tx.type === 'refund' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {tx.type === 'refund' ? '-' : '+'}{formatCurrency(tx.coachPayout)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Totale: {formatCurrency(tx.amount)}
                          </p>
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
            
            {activeTab === 'payouts' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="text-center py-8">
                  <CreditCard className="text-gray-200 mx-auto mb-4" size={48} />
                  <p className="text-gray-500 mb-2">
                    I pagamenti vengono trasferiti automaticamente
                  </p>
                  <p className="text-sm text-gray-400">
                    Riceverai i fondi {PLATFORM_CONFIG.COACH_PAYOUT_DELAY_DAYS} giorni dopo ogni pagamento
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
