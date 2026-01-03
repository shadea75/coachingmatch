'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { ShoppingBag, Clock, CheckCircle, XCircle, Loader2, Calendar, CreditCard } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Offer {
  id: string
  coachId: string
  coachName: string
  coacheeId: string
  coacheeName: string
  title: string
  type: 'single' | 'package'
  priceTotal: number
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'completed'
  sessionsIncluded: number
  sessionsCompleted: number
  createdAt: Date
  paidAt?: Date
}

interface Session {
  id: string
  coachId: string
  coachName: string
  coacheeId: string
  coacheeName: string
  scheduledAt: Date
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  type: string
  duration: number
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'offers' | 'sessions'>('offers')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carica offerte
      const offersQuery = query(collection(db, 'offers'), orderBy('createdAt', 'desc'))
      const offersSnap = await getDocs(offersQuery)
      const loadedOffers = offersSnap.docs.map(doc => ({
        id: doc.id,
        coachId: doc.data().coachId || '',
        coachName: doc.data().coachName || 'Coach',
        coacheeId: doc.data().coacheeId || '',
        coacheeName: doc.data().coacheeName || 'Coachee',
        title: doc.data().title || 'Offerta',
        type: doc.data().type || 'single',
        priceTotal: doc.data().priceTotal || 0,
        status: doc.data().status || 'pending',
        sessionsIncluded: doc.data().sessionsIncluded || 1,
        sessionsCompleted: doc.data().sessionsCompleted || 0,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        paidAt: doc.data().paidAt?.toDate()
      }))
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

  const handleApproveOffer = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), { status: 'approved' })
      setOffers(offers.map(o => o.id === offerId ? { ...o, status: 'approved' } : o))
    } catch (err) {
      console.error('Errore approvazione:', err)
    }
  }

  const handleRejectOffer = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), { status: 'rejected' })
      setOffers(offers.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o))
    } catch (err) {
      console.error('Errore rifiuto:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
      confirmed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    }
    const labels: Record<string, string> = {
      pending: 'In attesa',
      approved: 'Approvata',
      rejected: 'Rifiutata',
      paid: 'Pagata',
      completed: 'Completata',
      confirmed: 'Confermata',
      cancelled: 'Annullata'
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

  const stats = {
    pending: offers.filter(o => o.status === 'pending').length,
    approved: offers.filter(o => o.status === 'approved').length,
    paid: offers.filter(o => o.status === 'paid').length,
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stats.approved}</p>
                <p className="text-xs text-gray-500">Approvate</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stats.paid}</p>
                <p className="text-xs text-gray-500">Pagate</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stats.totalSessions}</p>
                <p className="text-xs text-gray-500">Sessioni totali</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" />
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
              <div className="p-4 border-b bg-gray-50 flex gap-2">
                {['all', 'pending', 'approved', 'paid', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filterStatus === status ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status === 'all' ? 'Tutte' : status === 'pending' ? 'In attesa' : 
                     status === 'approved' ? 'Approvate' : status === 'paid' ? 'Pagate' : 'Completate'}
                  </button>
                ))}
              </div>
              
              {filteredOffers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna offerta</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Offerta</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coachee</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prezzo</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sessioni</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOffers.map(offer => (
                      <tr key={offer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-charcoal">{offer.title}</p>
                          <p className="text-xs text-gray-400">
                            {format(offer.createdAt, 'dd MMM yyyy', { locale: it })}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{offer.coachName}</td>
                        <td className="px-6 py-4 text-gray-700">{offer.coacheeName}</td>
                        <td className="px-6 py-4 text-center font-medium">€{offer.priceTotal}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={offer.sessionsCompleted === offer.sessionsIncluded ? 'text-green-600' : ''}>
                            {offer.sessionsCompleted}/{offer.sessionsIncluded}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(offer.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {offer.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveOffer(offer.id)}
                                  className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                                  title="Approva"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={() => handleRejectOffer(offer.id)}
                                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                                  title="Rifiuta"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
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
