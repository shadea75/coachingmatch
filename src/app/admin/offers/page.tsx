'use client'

import { useState, useEffect, useMemo } from 'react'
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
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Percent,
  Filter,
  Users,
  Award,
  AlertTriangle
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

interface CoachStats {
  coachId: string
  coachName: string
  totalOffers: number
  acceptedOffers: number
  rejectedOffers: number
  pendingOffers: number
  expiredOffers: number
  closingRate: number
  totalRevenue: number
  platformRevenue: number
  avgOfferValue: number
  totalSessions: number
  completedSessions: number
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

// Formatta percentuale
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'offers' | 'sessions' | 'analytics'>('offers')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCoach, setFilterCoach] = useState<string>('all')
  const [sessionFilterStatus, setSessionFilterStatus] = useState<string>('all')
  const [sessionFilterCoach, setSessionFilterCoach] = useState<string>('all')
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

  // Lista coach unici
  const uniqueCoaches = useMemo(() => {
    const coaches = new Map<string, string>()
    offers.forEach(o => {
      if (o.coachId && o.coachName) {
        coaches.set(o.coachId, o.coachName)
      }
    })
    sessions.forEach(s => {
      if (s.coachId && s.coachName) {
        coaches.set(s.coachId, s.coachName)
      }
    })
    return Array.from(coaches.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [offers, sessions])

  // Statistiche per coach
  const coachStats = useMemo((): CoachStats[] => {
    const statsMap = new Map<string, CoachStats>()
    
    offers.forEach(offer => {
      if (!offer.coachId) return
      
      let stats = statsMap.get(offer.coachId)
      if (!stats) {
        stats = {
          coachId: offer.coachId,
          coachName: offer.coachName,
          totalOffers: 0,
          acceptedOffers: 0,
          rejectedOffers: 0,
          pendingOffers: 0,
          expiredOffers: 0,
          closingRate: 0,
          totalRevenue: 0,
          platformRevenue: 0,
          avgOfferValue: 0,
          totalSessions: 0,
          completedSessions: 0
        }
        statsMap.set(offer.coachId, stats)
      }
      
      stats.totalOffers++
      
      // Conta per stato
      if (['accepted', 'active', 'paid', 'completed'].includes(offer.status)) {
        stats.acceptedOffers++
      } else if (offer.status === 'rejected') {
        stats.rejectedOffers++
      } else if (offer.status === 'pending') {
        stats.pendingOffers++
      } else if (offer.status === 'expired') {
        stats.expiredOffers++
      }
      
      // Revenue
      const paidAmount = offer.installments
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + i.amount, 0)
      stats.totalRevenue += paidAmount
      
      const platformFees = offer.installments
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + i.platformFee, 0)
      stats.platformRevenue += platformFees
    })
    
    // Aggiungi sessioni
    sessions.forEach(session => {
      if (!session.coachId) return
      let stats = statsMap.get(session.coachId)
      if (stats) {
        stats.totalSessions++
        if (session.status === 'completed') {
          stats.completedSessions++
        }
      }
    })
    
    // Calcola closing rate e valore medio
    statsMap.forEach(stats => {
      const decidedOffers = stats.acceptedOffers + stats.rejectedOffers + stats.expiredOffers
      stats.closingRate = decidedOffers > 0 ? (stats.acceptedOffers / decidedOffers) * 100 : 0
      stats.avgOfferValue = stats.acceptedOffers > 0 ? stats.totalRevenue / stats.acceptedOffers : 0
    })
    
    return Array.from(statsMap.values()).sort((a, b) => b.closingRate - a.closingRate)
  }, [offers, sessions])

  // Statistiche globali
  const globalStats = useMemo(() => {
    const totalOffers = offers.length
    const acceptedOffers = offers.filter(o => ['accepted', 'active', 'paid', 'completed'].includes(o.status)).length
    const rejectedOffers = offers.filter(o => o.status === 'rejected').length
    const expiredOffers = offers.filter(o => o.status === 'expired').length
    const pendingOffers = offers.filter(o => o.status === 'pending').length
    const decidedOffers = acceptedOffers + rejectedOffers + expiredOffers
    
    const closingRate = decidedOffers > 0 ? (acceptedOffers / decidedOffers) * 100 : 0
    const rejectionRate = decidedOffers > 0 ? (rejectedOffers / decidedOffers) * 100 : 0
    const expirationRate = decidedOffers > 0 ? (expiredOffers / decidedOffers) * 100 : 0
    
    const totalRevenue = offers.reduce((sum, o) => {
      return sum + o.installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
    }, 0)
    
    const platformRevenue = offers.reduce((sum, o) => {
      return sum + o.installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.platformFee, 0)
    }, 0)
    
    const coachRevenue = offers.reduce((sum, o) => {
      return sum + o.installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.coachPayout, 0)
    }, 0)
    
    const avgOfferValue = acceptedOffers > 0 ? totalRevenue / acceptedOffers : 0
    
    const totalSessions = sessions.length
    const activeSessions = sessions.filter(s => s.status === 'pending' || s.status === 'confirmed').length
    const completedSessions = sessions.filter(s => s.status === 'completed').length
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length
    const noShowSessions = sessions.filter(s => s.status === 'no_show').length
    const upcomingSessions = sessions.filter(s => s.status === 'confirmed' && new Date(s.scheduledAt) > new Date()).length
    
    const sessionCompletionRate = (completedSessions + cancelledSessions + noShowSessions) > 0 
      ? (completedSessions / (completedSessions + cancelledSessions + noShowSessions)) * 100 
      : 0
    
    const freeSessions = sessions.filter(s => s.type === 'free_consultation').length
    const paidSessions = sessions.filter(s => s.type !== 'free_consultation').length
    const freeToConversionRate = freeSessions > 0 
      ? (offers.filter(o => ['accepted', 'active', 'paid', 'completed'].includes(o.status)).length / freeSessions) * 100 
      : 0

    return {
      totalOffers,
      acceptedOffers,
      rejectedOffers,
      expiredOffers,
      pendingOffers,
      closingRate,
      rejectionRate,
      expirationRate,
      totalRevenue,
      platformRevenue,
      coachRevenue,
      avgOfferValue,
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      upcomingSessions,
      sessionCompletionRate,
      freeSessions,
      paidSessions,
      freeToConversionRate,
      activeCoaches: coachStats.filter(c => c.totalOffers > 0).length
    }
  }, [offers, sessions, coachStats])

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

  // Filtro offerte
  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      const statusMatch = filterStatus === 'all' || o.status === filterStatus
      const coachMatch = filterCoach === 'all' || o.coachId === filterCoach
      return statusMatch && coachMatch
    })
  }, [offers, filterStatus, filterCoach])

  // Filtro sessioni
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const statusMatch = sessionFilterStatus === 'all' || s.status === sessionFilterStatus
      const coachMatch = sessionFilterCoach === 'all' || s.coachId === sessionFilterCoach
      return statusMatch && coachMatch
    })
  }, [sessions, sessionFilterStatus, sessionFilterCoach])

  // Closing rate badge color
  const getClosingRateColor = (rate: number) => {
    if (rate >= 60) return 'text-green-600 bg-green-50'
    if (rate >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Offerte & Sessioni</h1>
          <p className="text-gray-500">Gestisci le offerte dei coach e le sessioni prenotate</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{globalStats.pendingOffers}</p>
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
                <p className="text-2xl font-bold text-charcoal">{globalStats.acceptedOffers}</p>
                <p className="text-xs text-gray-500">Accettate</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getClosingRateColor(globalStats.closingRate)}`}>
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{formatPercent(globalStats.closingRate)}</p>
                <p className="text-xs text-gray-500">% Chiusura</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Euro className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-charcoal">{formatCurrency(globalStats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">Incassato</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border bg-gradient-to-br from-primary-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-primary-600">{formatCurrency(globalStats.platformRevenue)}</p>
                <p className="text-xs text-gray-500">CoachaMi</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-charcoal">{formatCurrency(globalStats.coachRevenue)}</p>
                <p className="text-xs text-gray-500">Ai coach</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{globalStats.activeSessions}</p>
                <p className="text-xs text-gray-500">Sessioni attive</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{globalStats.activeCoaches}</p>
                <p className="text-xs text-gray-500">Coach attivi</p>
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
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Analytics
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
              {/* Filtri Offerte */}
              <div className="p-4 border-b bg-gray-50 space-y-3">
                {/* Filtro Status */}
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'active', 'completed', 'rejected', 'expired'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        filterStatus === status ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {status === 'all' ? 'Tutte' : 
                       status === 'pending' ? 'In attesa' : 
                       status === 'active' ? 'Attive' : 
                       status === 'completed' ? 'Completate' :
                       status === 'rejected' ? 'Rifiutate' : 'Scadute'}
                    </button>
                  ))}
                </div>
                
                {/* Filtro Coach */}
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <select
                    value={filterCoach}
                    onChange={(e) => setFilterCoach(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Tutti i coach</option>
                    {uniqueCoaches.map(coach => (
                      <option key={coach.id} value={coach.id}>{coach.name}</option>
                    ))}
                  </select>
                  
                  {filterCoach !== 'all' && (
                    <span className="text-sm text-gray-500">
                      {filteredOffers.length} offerte
                    </span>
                  )}
                </div>
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
          ) : activeTab === 'sessions' ? (
            /* Tab Sessioni */
            <>
              {/* Filtri Sessioni */}
              <div className="p-4 border-b border-gray-100 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'Tutte', count: sessions.length },
                    { value: 'pending', label: 'In attesa', count: sessions.filter(s => s.status === 'pending').length },
                    { value: 'confirmed', label: 'Confermate', count: sessions.filter(s => s.status === 'confirmed').length },
                    { value: 'completed', label: 'Completate', count: sessions.filter(s => s.status === 'completed').length },
                    { value: 'cancelled', label: 'Annullate', count: sessions.filter(s => s.status === 'cancelled').length },
                    { value: 'rescheduled', label: 'Rimandate', count: sessions.filter(s => s.status === 'rescheduled').length },
                  ].map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setSessionFilterStatus(filter.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        sessionFilterStatus === filter.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
                
                {/* Filtro Coach */}
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <select
                    value={sessionFilterCoach}
                    onChange={(e) => setSessionFilterCoach(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Tutti i coach</option>
                    {uniqueCoaches.map(coach => (
                      <option key={coach.id} value={coach.id}>{coach.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {filteredSessions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna sessione {sessionFilterStatus !== 'all' ? 'con questo stato' : ''}</p>
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
                  {filteredSessions.map(session => (
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
              )}
            </>
          ) : (
            /* Tab Analytics */
            <div className="p-6 space-y-6">
              {/* Overview Cards */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-700 font-medium">Closing Rate</span>
                    <Target className="text-green-600" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-green-700">{formatPercent(globalStats.closingRate)}</p>
                  <p className="text-sm text-green-600 mt-1">{globalStats.acceptedOffers} su {globalStats.acceptedOffers + globalStats.rejectedOffers + globalStats.expiredOffers} decise</p>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-700 font-medium">Rejection Rate</span>
                    <XCircle className="text-red-600" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-red-700">{formatPercent(globalStats.rejectionRate)}</p>
                  <p className="text-sm text-red-600 mt-1">{globalStats.rejectedOffers} rifiutate</p>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">Expiration Rate</span>
                    <AlertTriangle className="text-gray-600" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-gray-700">{formatPercent(globalStats.expirationRate)}</p>
                  <p className="text-sm text-gray-600 mt-1">{globalStats.expiredOffers} scadute</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-700 font-medium">Valore Medio</span>
                    <Euro className="text-blue-600" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{formatCurrency(globalStats.avgOfferValue)}</p>
                  <p className="text-sm text-blue-600 mt-1">per offerta accettata</p>
                </div>
              </div>
              
              {/* Session Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border">
                  <h3 className="font-semibold text-charcoal mb-3">Sessioni</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gratuite</span>
                      <span className="font-medium">{globalStats.freeSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">A pagamento</span>
                      <span className="font-medium">{globalStats.paidSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Completate</span>
                      <span className="font-medium text-green-600">{globalStats.completedSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cancellate</span>
                      <span className="font-medium text-red-600">{globalStats.cancelledSessions}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-5 border">
                  <h3 className="font-semibold text-charcoal mb-3">Conversion</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Free → Paid</span>
                      <span className="font-medium">{formatPercent(globalStats.freeToConversionRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Session Completion</span>
                      <span className="font-medium">{formatPercent(globalStats.sessionCompletionRate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-5 border">
                  <h3 className="font-semibold text-charcoal mb-3">Revenue</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Totale incassato</span>
                      <span className="font-medium">{formatCurrency(globalStats.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CoachaMi (30%)</span>
                      <span className="font-medium text-primary-600">{formatCurrency(globalStats.platformRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Coach (70%)</span>
                      <span className="font-medium text-green-600">{formatCurrency(globalStats.coachRevenue)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Coach Leaderboard */}
              <div className="bg-white rounded-xl border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-charcoal flex items-center gap-2">
                    <Award className="text-primary-500" size={20} />
                    Performance Coach
                  </h3>
                  <p className="text-sm text-gray-500">Classifica per % di chiusura offerte</p>
                </div>
                
                {coachStats.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun dato disponibile</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                          <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Offerte</th>
                          <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Accettate</th>
                          <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rifiutate</th>
                          <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">% Chiusura</th>
                          <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">CoachaMi</th>
                          <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sessioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {coachStats.map((coach, idx) => (
                          <tr key={coach.coachId} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              {idx < 3 ? (
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                  idx === 1 ? 'bg-gray-100 text-gray-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {idx + 1}
                                </span>
                              ) : (
                                <span className="text-gray-400">{idx + 1}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-medium text-charcoal">{coach.coachName}</td>
                            <td className="px-6 py-4 text-center text-gray-600">{coach.totalOffers}</td>
                            <td className="px-6 py-4 text-center text-green-600 font-medium">{coach.acceptedOffers}</td>
                            <td className="px-6 py-4 text-center text-red-600">{coach.rejectedOffers}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${getClosingRateColor(coach.closingRate)}`}>
                                {formatPercent(coach.closingRate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">{formatCurrency(coach.totalRevenue)}</td>
                            <td className="px-6 py-4 text-right text-primary-600 font-medium">{formatCurrency(coach.platformRevenue)}</td>
                            <td className="px-6 py-4 text-center text-gray-600">{coach.totalSessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
