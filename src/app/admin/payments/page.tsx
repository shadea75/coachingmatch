'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Loader2, 
  ExternalLink,
  Filter,
  Download,
  FileText,
  Upload,
  Euro,
  User,
  CheckCircle,
  Clock,
  Eye,
  X
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Installment {
  sessionNumber: number
  amount: number
  coachPayout: number
  platformFee: number
  vatAmount: number
  status: string
  paidAt?: Date
}

interface Offer {
  id: string
  coachId: string
  coachName: string
  coachEmail: string
  coacheeId: string
  coacheeName: string
  title: string
  priceTotal: number
  platformFeeTotal: number
  coachPayoutTotal: number
  installments: Installment[]
  paidInstallments: number
  totalSessions: number
  status: string
  createdAt: Date
}

interface CoachInvoice {
  id: string
  coachId: string
  coachName: string
  coachEmail: string
  month: string
  year: number
  totalAmount: number
  invoiceUrl?: string
  invoiceNumber?: string
  status: 'pending' | 'uploaded' | 'paid'
  uploadedAt?: Date
  paidAt?: Date
  createdAt: Date
}

interface Subscription {
  id: string
  userId: string
  userEmail: string
  userName: string
  status: string
  amount: number
  startDate: Date
  type: 'community'
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export default function AdminPaymentsPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [invoices, setInvoices] = useState<CoachInvoice[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'coaches' | 'invoices' | 'subscriptions'>('overview')
  
  // Filtri
  const [selectedCoach, setSelectedCoach] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  
  // Modal fattura
  const [showInvoiceModal, setShowInvoiceModal] = useState<{coachId: string, coachName: string, coachEmail: string, month: string, year: number, amount: number} | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carica offerte con pagamenti
      const offersQuery = query(collection(db, 'offers'), orderBy('createdAt', 'desc'))
      const offersSnap = await getDocs(offersQuery)
      const loadedOffers: Offer[] = offersSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          coachId: data.coachId || '',
          coachName: data.coachName || 'Coach',
          coachEmail: data.coachEmail || '',
          coacheeId: data.coacheeId || '',
          coacheeName: data.coacheeName || 'Coachee',
          title: data.title || 'Offerta',
          priceTotal: data.priceTotal || 0,
          platformFeeTotal: data.platformFeeTotal || 0,
          coachPayoutTotal: data.coachPayoutTotal || 0,
          installments: (data.installments || []).map((inst: any) => ({
            ...inst,
            paidAt: inst.paidAt?.toDate?.() || null
          })),
          paidInstallments: data.paidInstallments || 0,
          totalSessions: data.totalSessions || 1,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date()
        }
      })
      setOffers(loadedOffers)

      // Carica fatture coach
      const invoicesQuery = query(collection(db, 'coachInvoices'), orderBy('createdAt', 'desc'))
      const invoicesSnap = await getDocs(invoicesQuery)
      const loadedInvoices: CoachInvoice[] = invoicesSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          coachId: data.coachId || '',
          coachName: data.coachName || '',
          coachEmail: data.coachEmail || '',
          month: data.month || '',
          year: data.year || new Date().getFullYear(),
          totalAmount: data.totalAmount || 0,
          invoiceUrl: data.invoiceUrl || '',
          invoiceNumber: data.invoiceNumber || '',
          status: data.status || 'pending',
          uploadedAt: data.uploadedAt?.toDate?.() || null,
          paidAt: data.paidAt?.toDate?.() || null,
          createdAt: data.createdAt?.toDate() || new Date()
        }
      })
      setInvoices(loadedInvoices)

      // Carica utenti con membership attiva
      const usersQuery = query(
        collection(db, 'users'),
        where('membershipStatus', '==', 'active')
      )
      const usersSnap = await getDocs(usersQuery)
      const loadedSubs: Subscription[] = usersSnap.docs.map(doc => ({
        id: doc.id,
        userId: doc.id,
        userEmail: doc.data().email || '',
        userName: doc.data().name || '',
        status: 'active',
        amount: 29,
        startDate: doc.data().membershipStartDate?.toDate() || doc.data().createdAt?.toDate() || new Date(),
        type: 'community'
      }))
      setSubscriptions(loadedSubs)
    } catch (err) {
      console.error('Errore caricamento dati:', err)
    } finally {
      setLoading(false)
    }
  }

  // Lista coach unici
  const uniqueCoaches = Array.from(new Map(
    offers.map(o => [o.coachId, { id: o.coachId, name: o.coachName, email: o.coachEmail }])
  ).values())

  // Lista mesi con pagamenti
  const getMonthsWithPayments = () => {
    const months = new Set<string>()
    offers.forEach(offer => {
      offer.installments.forEach(inst => {
        if (inst.status === 'paid' && inst.paidAt) {
          const date = new Date(inst.paidAt)
          months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
        }
      })
    })
    return Array.from(months).sort().reverse()
  }

  // Filtra pagamenti per coach e mese
  const getFilteredPayments = () => {
    let filtered = offers

    if (selectedCoach !== 'all') {
      filtered = filtered.filter(o => o.coachId === selectedCoach)
    }

    return filtered.flatMap(offer => 
      offer.installments
        .filter(inst => inst.status === 'paid' && inst.paidAt)
        .filter(inst => {
          if (selectedMonth === 'all') return true
          const date = new Date(inst.paidAt!)
          const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return monthStr === selectedMonth
        })
        .map(inst => ({
          ...inst,
          offerId: offer.id,
          offerTitle: offer.title,
          coachId: offer.coachId,
          coachName: offer.coachName,
          coachEmail: offer.coachEmail,
          coacheeName: offer.coacheeName
        }))
    ).sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
  }

  // Calcola totali per coach
  const getCoachTotals = () => {
    const totals: Record<string, {
      coachId: string
      coachName: string
      coachEmail: string
      totalEarnings: number
      totalPlatformFee: number
      paidSessions: number
      pendingSessions: number
      monthlyBreakdown: Record<string, number>
    }> = {}

    offers.forEach(offer => {
      if (!totals[offer.coachId]) {
        totals[offer.coachId] = {
          coachId: offer.coachId,
          coachName: offer.coachName,
          coachEmail: offer.coachEmail,
          totalEarnings: 0,
          totalPlatformFee: 0,
          paidSessions: 0,
          pendingSessions: 0,
          monthlyBreakdown: {}
        }
      }

      offer.installments.forEach(inst => {
        if (inst.status === 'paid') {
          totals[offer.coachId].totalEarnings += inst.coachPayout
          totals[offer.coachId].totalPlatformFee += inst.platformFee
          totals[offer.coachId].paidSessions += 1

          if (inst.paidAt) {
            const date = new Date(inst.paidAt)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            totals[offer.coachId].monthlyBreakdown[monthKey] = 
              (totals[offer.coachId].monthlyBreakdown[monthKey] || 0) + inst.coachPayout
          }
        } else {
          totals[offer.coachId].pendingSessions += 1
        }
      })
    })

    return Object.values(totals).sort((a, b) => b.totalEarnings - a.totalEarnings)
  }

  // Stats globali
  const filteredPayments = getFilteredPayments()
  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
  const platformEarnings = filteredPayments.reduce((sum, p) => sum + p.platformFee, 0)
  const coachPayouts = filteredPayments.reduce((sum, p) => sum + p.coachPayout, 0)
  const subscriptionRevenue = subscriptions.length * 29

  // Crea richiesta fattura per coach
  const createInvoiceRequest = async (coachId: string, coachName: string, coachEmail: string, month: string, year: number, amount: number) => {
    try {
      await addDoc(collection(db, 'coachInvoices'), {
        coachId,
        coachName,
        coachEmail,
        month,
        year,
        totalAmount: amount,
        status: 'pending',
        createdAt: serverTimestamp()
      })
      
      // Ricarica dati
      loadData()
      setShowInvoiceModal(null)
      alert(`Richiesta fattura inviata a ${coachName}`)
    } catch (err) {
      console.error('Errore creazione richiesta:', err)
      alert('Errore nella creazione della richiesta')
    }
  }

  // Segna fattura come pagata
  const markInvoiceAsPaid = async (invoiceId: string) => {
    try {
      await updateDoc(doc(db, 'coachInvoices', invoiceId), {
        status: 'paid',
        paidAt: serverTimestamp()
      })
      setInvoices(invoices.map(inv => 
        inv.id === invoiceId ? { ...inv, status: 'paid', paidAt: new Date() } : inv
      ))
    } catch (err) {
      console.error('Errore aggiornamento fattura:', err)
    }
  }

  const coachTotals = getCoachTotals()

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Pagamenti</h1>
          <p className="text-gray-500">Panoramica finanziaria e gestione fatture coach</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Euro className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Totale incassato</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border bg-gradient-to-br from-primary-50 to-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-gray-500">Guadagno CoachaMi</span>
            </div>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(platformEarnings)}</p>
            <p className="text-xs text-gray-400 mt-1">30% commissione</p>
          </div>
          <div className="bg-white p-5 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Da pagare ai coach</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">{formatCurrency(coachPayouts)}</p>
            <p className="text-xs text-gray-400 mt-1">70% del netto</p>
          </div>
          <div className="bg-white p-5 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Abbonamenti</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">{subscriptions.length}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(subscriptionRevenue)}/mese</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Euro size={16} className="inline mr-2" />
            Panoramica
          </button>
          <button
            onClick={() => setActiveTab('coaches')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'coaches' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Per Coach ({uniqueCoaches.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'invoices' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            Fatture Coach ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'subscriptions' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Abbonamenti ({subscriptions.length})
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
            </div>
          ) : activeTab === 'overview' ? (
            <>
              {/* Filtri */}
              <div className="p-4 border-b bg-gray-50 flex gap-4 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Filtra:</span>
                </div>
                
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tutti i coach</option>
                  {uniqueCoaches.map(coach => (
                    <option key={coach.id} value={coach.id}>{coach.name}</option>
                  ))}
                </select>
                
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tutti i mesi</option>
                  {getMonthsWithPayments().map(month => {
                    const [year, m] = month.split('-')
                    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
                    return (
                      <option key={month} value={month}>
                        {monthNames[parseInt(m) - 1]} {year}
                      </option>
                    )
                  })}
                </select>

                {(selectedCoach !== 'all' || selectedMonth !== 'all') && (
                  <button
                    onClick={() => { setSelectedCoach('all'); setSelectedMonth('all'); }}
                    className="text-sm text-primary-500 hover:underline"
                  >
                    Resetta filtri
                  </button>
                )}
              </div>

              {/* Riepilogo filtrato */}
              {(selectedCoach !== 'all' || selectedMonth !== 'all') && (
                <div className="p-4 bg-primary-50 border-b">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        {selectedCoach !== 'all' && uniqueCoaches.find(c => c.id === selectedCoach)?.name}
                        {selectedCoach !== 'all' && selectedMonth !== 'all' && ' - '}
                        {selectedMonth !== 'all' && (() => {
                          const [year, m] = selectedMonth.split('-')
                          const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
                          return `${monthNames[parseInt(m) - 1]} ${year}`
                        })()}
                      </p>
                      <p className="text-2xl font-bold text-charcoal">{formatCurrency(coachPayouts)}</p>
                      <p className="text-sm text-gray-500">{filteredPayments.length} pagamenti</p>
                    </div>
                    
                    {selectedCoach !== 'all' && selectedMonth !== 'all' && coachPayouts > 0 && (
                      <button
                        onClick={() => {
                          const coach = uniqueCoaches.find(c => c.id === selectedCoach)
                          if (coach) {
                            const [year, month] = selectedMonth.split('-')
                            const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
                            setShowInvoiceModal({
                              coachId: coach.id,
                              coachName: coach.name,
                              coachEmail: coach.email,
                              month: monthNames[parseInt(month) - 1],
                              year: parseInt(year),
                              amount: coachPayouts
                            })
                          }
                        }}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
                      >
                        <FileText size={16} />
                        Richiedi Fattura
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Lista pagamenti */}
              {filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun pagamento trovato</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Offerta</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coachee</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">CoachaMi</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((payment, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">
                          {payment.paidAt && format(new Date(payment.paidAt), 'dd MMM yyyy', { locale: it })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-charcoal">{payment.offerTitle}</p>
                          <p className="text-xs text-gray-400">Sessione {payment.sessionNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{payment.coachName}</td>
                        <td className="px-6 py-4 text-gray-700">{payment.coacheeName}</td>
                        <td className="px-6 py-4 text-right font-medium">{formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4 text-right text-primary-600 font-medium">{formatCurrency(payment.platformFee)}</td>
                        <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(payment.coachPayout)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-right font-semibold text-gray-700">Totale:</td>
                      <td className="px-6 py-3 text-right font-bold text-charcoal">{formatCurrency(totalRevenue)}</td>
                      <td className="px-6 py-3 text-right font-bold text-primary-600">{formatCurrency(platformEarnings)}</td>
                      <td className="px-6 py-3 text-right font-bold text-green-600">{formatCurrency(coachPayouts)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          ) : activeTab === 'coaches' ? (
            /* Tab Coach */
            coachTotals.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun coach con pagamenti</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {coachTotals.map(coach => (
                  <div key={coach.coachId} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-charcoal text-lg">{coach.coachName}</h3>
                        <p className="text-sm text-gray-500">{coach.coachEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(coach.totalEarnings)}</p>
                        <p className="text-sm text-gray-500">Guadagno totale</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Sessioni pagate</p>
                        <p className="text-xl font-bold text-charcoal">{coach.paidSessions}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Sessioni in attesa</p>
                        <p className="text-xl font-bold text-charcoal">{coach.pendingSessions}</p>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Commissione CoachaMi</p>
                        <p className="text-xl font-bold text-primary-600">{formatCurrency(coach.totalPlatformFee)}</p>
                      </div>
                    </div>
                    
                    {/* Breakdown mensile */}
                    {Object.keys(coach.monthlyBreakdown).length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Guadagni per mese:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(coach.monthlyBreakdown)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([month, amount]) => {
                              const [year, m] = month.split('-')
                              const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
                              return (
                                <div key={month} className="px-3 py-2 bg-green-50 rounded-lg">
                                  <p className="text-xs text-gray-500">{monthNames[parseInt(m) - 1]} {year}</p>
                                  <p className="font-semibold text-green-600">{formatCurrency(amount)}</p>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'invoices' ? (
            /* Tab Fatture */
            invoices.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna fattura</p>
                <p className="text-sm mt-2">Usa i filtri nella tab "Panoramica" per richiedere fatture ai coach</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Periodo</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">N. Fattura</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-charcoal">{invoice.coachName}</p>
                        <p className="text-xs text-gray-400">{invoice.coachEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {invoice.month} {invoice.year}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-charcoal">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {invoice.invoiceNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {invoice.status === 'paid' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1 justify-center">
                            <CheckCircle size={12} />
                            Pagata
                          </span>
                        ) : invoice.status === 'uploaded' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 justify-center">
                            <FileText size={12} />
                            Caricata
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1 justify-center">
                            <Clock size={12} />
                            In attesa
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.invoiceUrl && (
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                              title="Visualizza fattura"
                            >
                              <Eye size={16} />
                            </a>
                          )}
                          {invoice.status === 'uploaded' && (
                            <button
                              onClick={() => markInvoiceAsPaid(invoice.id)}
                              className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                              title="Segna come pagata"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* Tab Abbonamenti */
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
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data inizio</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-charcoal">{sub.userName || 'Utente'}</td>
                      <td className="px-6 py-4 text-gray-500">{sub.userEmail}</td>
                      <td className="px-6 py-4 text-center text-gray-500">Community</td>
                      <td className="px-6 py-4 text-center font-medium">{formatCurrency(sub.amount)}/mese</td>
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
              className="px-4 py-2 bg-[#635BFF] text-white rounded-lg hover:bg-[#5851db] flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Apri Stripe Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Modal richiesta fattura */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">Richiedi Fattura</h3>
              <button 
                onClick={() => setShowInvoiceModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500">Coach</p>
              <p className="font-medium text-charcoal">{showInvoiceModal.coachName}</p>
              <p className="text-sm text-gray-400">{showInvoiceModal.coachEmail}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Periodo</p>
                <p className="font-medium text-charcoal">{showInvoiceModal.month} {showInvoiceModal.year}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Importo</p>
                <p className="font-bold text-green-600">{formatCurrency(showInvoiceModal.amount)}</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Verrà inviata una richiesta al coach per caricare la fattura per questo periodo.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowInvoiceModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={() => createInvoiceRequest(
                  showInvoiceModal.coachId,
                  showInvoiceModal.coachName,
                  showInvoiceModal.coachEmail,
                  showInvoiceModal.month,
                  showInvoiceModal.year,
                  showInvoiceModal.amount
                )}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                Richiedi Fattura
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
