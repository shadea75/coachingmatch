'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Euro,
  Calendar,
  ChevronRight,
  Loader2,
  FileText,
  User,
  ArrowLeft,
  Filter,
  MoreHorizontal,
  Trash2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  deleteDoc
} from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Offer {
  id: string
  coacheeId: string
  coacheeName: string
  coacheeEmail: string
  title: string
  totalSessions: number
  completedSessions: number
  priceTotal: number
  pricePerSession: number
  coachPayoutTotal: number
  paidInstallments: number
  status: string
  createdAt: Date
  validUntil: Date
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

// Calcola il guadagno coach corretto (70% del prezzo totale)
function calculateCoachPayout(priceTotal: number): number {
  return priceTotal * 0.70
}

export default function CoachOffersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Carica offerte del coach
  useEffect(() => {
    const loadOffers = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        const offersQuery = query(
          collection(db, 'offers'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(offersQuery)
        const loadedOffers: Offer[] = snapshot.docs.map(doc => ({
          id: doc.id,
          coacheeId: doc.data().coacheeId,
          coacheeName: doc.data().coacheeName || 'Coachee',
          coacheeEmail: doc.data().coacheeEmail || '',
          title: doc.data().title || 'Offerta',
          totalSessions: doc.data().totalSessions || 1,
          completedSessions: doc.data().completedSessions || 0,
          priceTotal: doc.data().priceTotal || 0,
          pricePerSession: doc.data().pricePerSession || 0,
          coachPayoutTotal: doc.data().coachPayoutTotal || 0,
          paidInstallments: doc.data().paidInstallments || 0,
          status: doc.data().status || 'pending',
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          validUntil: doc.data().validUntil?.toDate() || new Date()
        }))
        setOffers(loadedOffers)
      } catch (err) {
        console.error('Errore caricamento offerte:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadOffers()
  }, [user?.id])
  
  // Filtra offerte
  const filteredOffers = offers.filter(offer => {
    if (filter === 'all') return true
    if (filter === 'pending') return offer.status === 'pending'
    if (filter === 'active') return ['accepted', 'active'].includes(offer.status)
    if (filter === 'completed') return offer.status === 'completed'
    return true
  })
  
  // Statistiche - CALCOLO CORRETTO: 70% del priceTotal
  const stats = {
    total: offers.length,
    pending: offers.filter(o => o.status === 'pending').length,
    active: offers.filter(o => ['accepted', 'active', 'fully_paid'].includes(o.status)).length,
    totalRevenue: offers
      .filter(o => ['active', 'completed', 'fully_paid'].includes(o.status))
      .reduce((sum, o) => sum + calculateCoachPayout(o.priceTotal), 0)
  }
  
  // Elimina offerta (solo se pending)
  const handleDelete = async (offerId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa offerta?')) return
    
    setDeletingId(offerId)
    try {
      await deleteDoc(doc(db, 'offers', offerId))
      setOffers(offers.filter(o => o.id !== offerId))
    } catch (err) {
      console.error('Errore eliminazione:', err)
      alert('Errore durante l\'eliminazione')
    } finally {
      setDeletingId(null)
    }
  }
  
  // Status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string, text: string, label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In attesa' },
      accepted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Accettata' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Attiva' },
      fully_paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pagata' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Completata' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rifiutata' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Scaduta' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Annullata' }
    }
    const c = config[status] || config.pending
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
  }
  
  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }
  
  // Non autorizzato
  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Accesso riservato ai coach</p>
          <Link href="/login" className="text-primary-500 hover:underline">
            Accedi
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coach/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Le mie Offerte</h1>
                <p className="text-sm text-gray-500">{stats.total} offerte totali</p>
              </div>
            </div>
            
            <Link
              href="/coach/offers/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nuova Offerta</span>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
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
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
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
          
          <div className="bg-white rounded-xl p-4 shadow-sm md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Euro className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">Guadagno totale (70%)</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filtri */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'Tutte' },
            { key: 'pending', label: 'In attesa' },
            { key: 'active', label: 'Attive' },
            { key: 'completed', label: 'Completate' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-charcoal text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        {/* Lista offerte */}
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              {filter === 'all' ? 'Nessuna offerta' : 'Nessuna offerta in questa categoria'}
            </h3>
            <p className="text-gray-500 mb-4">
              Crea la tua prima offerta per iniziare a lavorare con i coachee
            </p>
            <Link
              href="/coach/offers/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              Crea Offerta
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar coachee */}
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-semibold text-lg">
                        {offer.coacheeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-charcoal">{offer.title}</h3>
                        {getStatusBadge(offer.status)}
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        {offer.coacheeName}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Calendar size={14} />
                          {offer.totalSessions} sessioni
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <Euro size={14} />
                          {formatCurrency(offer.priceTotal)}
                        </span>
                        {offer.status === 'active' && (
                          <span className="text-green-600">
                            {offer.paidInstallments}/{offer.totalSessions} pagate
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-2">
                        Creata il {format(offer.createdAt, 'dd MMM yyyy', { locale: it })}
                        {offer.status === 'pending' && (
                          <> • Scade il {format(offer.validUntil, 'dd MMM yyyy', { locale: it })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Azioni */}
                  <div className="flex items-center gap-2">
                    {offer.status === 'pending' && (
                      <button
                        onClick={() => handleDelete(offer.id)}
                        disabled={deletingId === offer.id}
                        className="p-2 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        title="Elimina"
                      >
                        {deletingId === offer.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    )}
                    
                    <Link
                      href={`/coach/offers/${offer.id}`}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
