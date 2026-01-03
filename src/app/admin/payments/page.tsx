'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { CreditCard, TrendingUp, DollarSign, Calendar, Loader2, ExternalLink } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Transaction {
  id: string
  offerId: string
  coachId: string
  coacheeId: string
  type: 'payment' | 'refund' | 'payout'
  status: 'pending' | 'completed' | 'failed'
  amount: number
  netAmount: number
  platformFee: number
  coachPayout: number
  createdAt: Date
}

interface Subscription {
  id: string
  userId: string
  userEmail: string
  status: string
  amount: number
  startDate: Date
  type: 'community'
}

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'transactions' | 'subscriptions'>('transactions')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carica transazioni
      const transQuery = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
      const transSnap = await getDocs(transQuery)
      const loadedTrans = transSnap.docs.map(doc => ({
        id: doc.id,
        offerId: doc.data().offerId || '',
        coachId: doc.data().coachId || '',
        coacheeId: doc.data().coacheeId || '',
        type: doc.data().type || 'payment',
        status: doc.data().status || 'pending',
        amount: doc.data().amount || 0,
        netAmount: doc.data().netAmount || 0,
        platformFee: doc.data().platformFee || 0,
        coachPayout: doc.data().coachPayout || 0,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      setTransactions(loadedTrans)

      // Carica utenti con membership attiva (abbonamenti)
      const usersQuery = query(
        collection(db, 'users'),
        where('membershipStatus', '==', 'active')
      )
      const usersSnap = await getDocs(usersQuery)
      const loadedSubs = usersSnap.docs.map(doc => ({
        id: doc.id,
        userId: doc.id,
        userEmail: doc.data().email || '',
        status: 'active',
        amount: 29,
        startDate: doc.data().membershipStartDate?.toDate() || new Date(),
        type: 'community' as const
      }))
      setSubscriptions(loadedSubs)
    } catch (err) {
      console.error('Errore caricamento dati:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = transactions
    .filter(t => t.type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const platformEarnings = transactions
    .filter(t => t.type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.platformFee, 0)
  
  const coachPayouts = transactions
    .filter(t => t.type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.coachPayout, 0)

  const subscriptionRevenue = subscriptions.length * 29

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Pagamenti</h1>
          <p className="text-gray-500">Panoramica finanziaria della piattaforma</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Totale incassato</span>
            </div>
            <p className="text-3xl font-bold text-charcoal">€{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-gray-500">Guadagno piattaforma</span>
            </div>
            <p className="text-3xl font-bold text-charcoal">€{platformEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">30% commissione</p>
          </div>
          <div className="bg-white p-6 rounded-xl border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Pagato ai coach</span>
            </div>
            <p className="text-3xl font-bold text-charcoal">€{coachPayouts.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">70% del totale</p>
          </div>
          <div className="bg-white p-6 rounded-xl border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Abbonamenti attivi</span>
            </div>
            <p className="text-3xl font-bold text-charcoal">{subscriptions.length}</p>
            <p className="text-xs text-gray-400 mt-1">€{subscriptionRevenue}/mese</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'transactions' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Transazioni ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'subscriptions' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Abbonamenti Community ({subscriptions.length})
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
            </div>
          ) : activeTab === 'transactions' ? (
            transactions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna transazione</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Commissione</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Al Coach</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(trans => (
                    <tr key={trans.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">
                        {format(trans.createdAt, 'dd MMM yyyy HH:mm', { locale: it })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          trans.type === 'payment' ? 'bg-green-100 text-green-700' :
                          trans.type === 'refund' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {trans.type === 'payment' ? 'Pagamento' : 
                           trans.type === 'refund' ? 'Rimborso' : 'Payout'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">€{trans.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-primary-600">€{trans.platformFee.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-gray-600">€{trans.coachPayout.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          trans.status === 'completed' ? 'bg-green-100 text-green-700' :
                          trans.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {trans.status === 'completed' ? 'Completato' : 
                           trans.status === 'failed' ? 'Fallito' : 'In attesa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            subscriptions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun abbonamento attivo</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Utente</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data inizio</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{sub.userEmail}</td>
                      <td className="px-6 py-4 text-gray-500">Community</td>
                      <td className="px-6 py-4 text-center font-medium">€{sub.amount}/mese</td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {format(sub.startDate, 'dd MMM yyyy', { locale: it })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          Attivo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Link a Stripe */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-charcoal">Dashboard Stripe</h3>
              <p className="text-sm text-gray-500">Gestisci pagamenti, rimborsi e payout direttamente su Stripe</p>
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#635BFF] text-white hover:bg-[#5851db] flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Apri Stripe Dashboard
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
