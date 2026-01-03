'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Calendar, 
  CreditCard,
  Euro,
  ChevronDown,
  ChevronUp,
  User,
  TrendingUp
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Installment {
  sessionNumber: number
  amount: number
  coachPayout: number
  platformFee: number
  vatAmount: number
  status: string
  paidAt?: any
}

interface Offer {
  id: string
  coachId: string
  coachName: string
  coachEmail: string
  coacheeId: string
  coacheeName: string
  coacheeEmail: string
  title: string
  priceTotal: number
  priceNet: number
  vatAmount: number
  platformFeeTotal: number
  coachPayoutTotal: number
  pricePerSession: number
  status: string
  totalSessions: number
  completedSessions: number
  paidInstallments: number
  installments: Installment[]
  createdAt: Date
  validUntil: Date
}

interface Session {
  id: string
  coachId: string
  coachName: string
  coacheeId: string
  coacheeName: string
  scheduledAt: Date
  status: string
  type: string
  duration: number
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'offers' | 'sessions'>('offers')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carica offerte
      const offersQuery = query(collection(db, 'offers'), orderBy('createdAt', 'desc'))
      const offersSnap = await getDocs(offersQuery)
      const loadedOffers = offersSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          coachId: data.coachId || '',
          coachName: data.coachName || 'Coach',
          coachEmail: data.coachEmail || '',
          coacheeId: data.coacheeId || '',
          coacheeName: data.coacheeName || 'Coachee',
          coacheeEmail: data.coacheeEmail || '',
          title: data.title || 'Offerta',
          priceTotal: data.priceTotal || 0,
          priceNet: data.priceNet || 0,
          vatAmount: data.vatAmount || 0,
          platformFeeTotal: data.platformFeeTotal || 0,
          coachPayoutTotal: data.coachPayoutTotal || 0,
          pricePerSession: data.pricePerSession || 0,
          status: data.status || 'pending',
          totalSessions: data.totalSessions || 1,
          completedSessions: data.completedSessions || 0,
          paidInstallments: data.paidInstallments || 0,
          installments: (data.installments || []).map((inst: any) => ({
            ...inst,
            paidAt: inst.paidAt?.toDate?.() || null
          })),
          createdAt: data.createdAt?.toDate() || new Date(),
          validUntil: data.validUntil?.toDate() || new Date()
        }
      })
      setOffers(loadedOffers)

      // Carica sessioni
      const sessionsQuery = query(collection(db, 'sessions'), orderBy('scheduledAt', 'desc'))
      const sessionsSnap = await getDocs(sessionsQuery)
      const loadedSessions = sessionsSnap.docs.map(doc => ({
        id: doc.id,
        coachId: doc.data().coachId || '',
        coachName: doc.data().coachName || 'Coach',
        coacheeId: doc.data().coacheeId || '',
        coacheeName: doc.data().coacheeName || 'Coachee',
        scheduledAt: doc.data().scheduledAt?.toDate() || new Date(),
        status: doc.data().status || 'pending',
        type: doc.data().type || 'session',
        duration: doc.data().duration || 30
      }))
      setSessions(loadedSessions)
    } catch (err) {
      console.error('Errore caricamento dati:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
      confirmed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700',
      expired: 'bg-gray-100 text-gray-700'
    }
    const labels: Record<string, string> = {
      pending: 'In attesa',
      accepted: 'Accettata',
      active: 'Attiva',
      approved: 'Approvata',
      rejected: 'Rifiutata',
      paid: 'Pagata',
      completed: 'Completata',
      confirmed: 'Confermata',
      cancelled: 'Annullata',
      expired: 'Scaduta'
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const filteredOffers = filterStatus === 'all' 
    ? offers 
    : offers.filter(o => o.status === filterStatus)

  // Calcola statistiche avanzate
  const stats = {
    pending: offers.filter(o => o.status === 'pending').length,
    active: offers.filter(o => o.status === 'active').length,
    totalRevenue: offers.reduce((sum, o) => {
      const paidAmount = o.installments
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + i.amount, 0)
      return sum + paidAmount
    }, 0),
    platformRevenue: offers.reduce((sum, o) => {
      const platformFees = o.installments
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + i.platformFee, 0)
      return sum + platformFees
    }, 0),
    coachRevenue: offers.reduce((sum, o) => {
      const coachPayouts = o.installments
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + i.coachPayout, 0)
      return sum + coachPayouts
    }, 0),
    totalSessions: sessions.length,
    upcomingSessions: sessions.filter(s => s.status === 'confirmed' && new Date(s.scheduledAt) > new Date()).length
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Offerte & Sessioni</h1>
          <p className="text-gray-500">Gestisci le offerte dei coach e le sessioni prenotate</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stats.pending}</p>
                <p className="text-xs text-gray-500">In attesa</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stats.active}</p>
                <p className="text-xs text-gray-500">Attive</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Euro className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-charcoal">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">Totale incassato</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border bg-gradient-to-br from-primary-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-primary-600">{formatCurrency(stats.platformRevenue)}</p>
                <p className="text-xs text-gray-500">Guadagno CoachaMi</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-charcoal">{formatCurrency(stats.coachRevenue)}</p>
                <p className="text-xs text-gray-500">Pagato ai coach</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stats.totalSessions}</p>
                <p className="text-xs text-gray-500">Sessioni totali</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stats.upcomingSessions}</p>
                <p className="text-xs text-gray-500">In programma</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'offers' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag size={16} className="inline mr-2" />
            Offerte ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'sessions' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Sessioni ({sessions.length})
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
            </div>
          ) : activeTab === 'offers' ? (
            <>
              {/* Filter */}
              <div className="p-4 border-b bg-gray-50 flex gap-2 flex-wrap">
                {['all', 'pending', 'active', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filterStatus === status ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status === 'all' ? 'Tutte' : status === 'pending' ? 'In attesa' : 
                     status === 'active' ? 'Attive' : 'Completate'}
                  </button>
                ))}
              </div>
              
              {filteredOffers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna offerta</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredOffers.map(offer => (
                    <div key={offer.id}>
                      {/* Riga principale */}
                      <div 
                        className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
                        onClick={() => setExpandedOffer(expandedOffer === offer.id ? null : offer.id)}
                      >
                        <div className="flex-shrink-0">
                          {expandedOffer === offer.id ? (
                            <ChevronUp size={20} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-charcoal">{offer.title}</p>
                            {getStatusBadge(offer.status)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {offer.coachName} → {offer.coacheeName}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-charcoal">{formatCurrency(offer.priceTotal)}</p>
                          <p className="text-xs text-gray-500">
                            {offer.paidInstallments}/{offer.totalSessions} rate pagate
                          </p>
                        </div>
                        
                        <div className="text-right min-w-[100px]">
                          <p className="text-sm text-primary-600 font-medium">
                            +{formatCurrency(offer.installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.platformFee, 0))}
                          </p>
                          <p className="text-xs text-gray-400">CoachaMi</p>
                        </div>
                      </div>
                      
                      {/* Dettaglio espanso */}
                      {expandedOffer === offer.id && (
                        <div className="px-4 pb-4 bg-gray-50">
                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            {/* Info coach */}
                            <div className="bg-white rounded-lg p-4">
                              <p className="text-xs text-gray-500 mb-2">COACH</p>
                              <p className="font-medium text-charcoal">{offer.coachName}</p>
                              <p className="text-sm text-gray-500">{offer.coachEmail}</p>
                            </div>
                            
                            {/* Info coachee */}
                            <div className="bg-white rounded-lg p-4">
                              <p className="text-xs text-gray-500 mb-2">COACHEE</p>
                              <p className="font-medium text-charcoal">{offer.coacheeName}</p>
                              <p className="text-sm text-gray-500">{offer.coacheeEmail}</p>
                            </div>
                            
                            {/* Riepilogo economico */}
                            <div className="bg-white rounded-lg p-4">
                              <p className="text-xs text-gray-500 mb-2">RIEPILOGO ECONOMICO</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Totale (IVA incl.)</span>
                                  <span className="font-medium">{formatCurrency(offer.priceTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">IVA (22%)</span>
                                  <span>{formatCurrency(offer.vatAmount)}</span>
                                </div>
                                <div className="flex justify-between text-primary-600">
                                  <span>CoachaMi (30%)</span>
                                  <span className="font-medium">{formatCurrency(offer.platformFeeTotal)}</span>
                                </div>
                                <div className="flex justify-between text-green-600 pt-1 border-t">
                                  <span>Coach</span>
                                  <span className="font-medium">{formatCurrency(offer.coachPayoutTotal)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Stato rate */}
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-3">STATO PAGAMENTI ({offer.paidInstallments}/{offer.totalSessions})</p>
                            
                            {/* Progress bar */}
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${(offer.paidInstallments / offer.totalSessions) * 100}%` }}
                              />
                            </div>
                            
                            {/* Lista rate */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {offer.installments.map((inst, idx) => (
                                <div 
                                  key={idx}
                                  className={`p-3 rounded-lg text-center ${
                                    inst.status === 'paid' 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  <p className="text-xs text-gray-500 mb-1">Rata {inst.sessionNumber}</p>
                                  <p className={`font-semibold ${inst.status === 'paid' ? 'text-green-600' : 'text-gray-400'}`}>
                                    {formatCurrency(inst.amount)}
                                  </p>
                                  {inst.status === 'paid' ? (
                                    <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                                      <CheckCircle size={12} />
                                      Pagata
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                                      <Clock size={12} />
                                      In attesa
                                    </p>
                                  )}
                                  {inst.paidAt && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {format(inst.paidAt, 'dd/MM/yy', { locale: it })}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {/* Dettaglio singola rata */}
                            {offer.installments.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Importo per rata</p>
                                  <p className="font-medium">{formatCurrency(offer.pricePerSession)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">CoachaMi per rata</p>
                                  <p className="font-medium text-primary-600">
                                    {formatCurrency(offer.platformFeeTotal / offer.totalSessions)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Coach per rata</p>
                                  <p className="font-medium text-green-600">
                                    {formatCurrency(offer.coachPayoutTotal / offer.totalSessions)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Date */}
                          <div className="mt-4 flex gap-4 text-xs text-gray-400">
                            <span>Creata: {format(offer.createdAt, 'dd MMM yyyy HH:mm', { locale: it })}</span>
                            {offer.status === 'pending' && (
                              <span>Scade: {format(offer.validUntil, 'dd MMM yyyy', { locale: it })}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Tab Sessioni */
            sessions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna sessione</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data/Ora</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coachee</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Durata</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.map(session => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-charcoal">
                          {format(session.scheduledAt, 'dd MMM yyyy', { locale: it })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(session.scheduledAt, 'HH:mm', { locale: it })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{session.coachName}</td>
                      <td className="px-6 py-4 text-gray-700">{session.coacheeName}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                        {session.type === 'free_consultation' ? 'Gratuita' : 'Sessione'}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-700">{session.duration} min</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(session.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
