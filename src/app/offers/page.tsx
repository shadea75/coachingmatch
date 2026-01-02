'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Clock, 
  Package,
  Euro,
  Check,
  X,
  AlertCircle,
  Calendar,
  User,
  CreditCard,
  Loader2,
  ChevronRight,
  Timer
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  Offer, 
  OfferStatus,
  formatCurrency,
  PLATFORM_CONFIG
} from '@/types/payments'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import { it } from 'date-fns/locale'

export default function MyOffersPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'expired'>('all')
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  
  // Carica offerte
  useEffect(() => {
    const loadOffers = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        const offersQuery = query(
          collection(db, 'offers'),
          where('coacheeId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        
        const snapshot = await getDocs(offersQuery)
        const offersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          validUntil: doc.data().validUntil?.toDate?.() || new Date(),
          sentAt: doc.data().sentAt?.toDate?.() || new Date()
        })) as Offer[]
        
        // Aggiorna offerte scadute
        const now = new Date()
        const updatedOffers = offersData.map(offer => {
          if (offer.status === 'pending' && isPast(offer.validUntil)) {
            return { ...offer, status: 'expired' as OfferStatus }
          }
          return offer
        })
        
        setOffers(updatedOffers)
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
    if (filter === 'pending') return offer.status === 'pending'
    if (filter === 'accepted') return offer.status === 'accepted' || offer.status === 'paid'
    if (filter === 'expired') return offer.status === 'expired' || offer.status === 'rejected'
    return true
  })
  
  // Accetta offerta
  const handleAccept = async (offer: Offer) => {
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'offers', offer.id), {
        status: 'accepted',
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Aggiorna stato locale
      setOffers(offers.map(o => 
        o.id === offer.id ? { ...o, status: 'accepted' } : o
      ))
      
      // Redirect a pagamento
      router.push(`/checkout/${offer.id}`)
    } catch (err) {
      console.error('Errore accettazione:', err)
      alert('Errore durante l\'accettazione')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Rifiuta offerta
  const handleReject = async () => {
    if (!selectedOffer) return
    
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'offers', selectedOffer.id), {
        status: 'rejected',
        rejectionReason: rejectReason.trim() || undefined,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      setOffers(offers.map(o => 
        o.id === selectedOffer.id ? { ...o, status: 'rejected' } : o
      ))
      
      setShowRejectModal(false)
      setSelectedOffer(null)
      setRejectReason('')
    } catch (err) {
      console.error('Errore rifiuto:', err)
      alert('Errore durante il rifiuto')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Status badge
  const getStatusBadge = (status: OfferStatus) => {
    const config = {
      pending: { label: 'In attesa', color: 'bg-amber-100 text-amber-700', icon: Clock },
      accepted: { label: 'Accettata', color: 'bg-blue-100 text-blue-700', icon: Check },
      paid: { label: 'Pagata', color: 'bg-green-100 text-green-700', icon: CreditCard },
      rejected: { label: 'Rifiutata', color: 'bg-red-100 text-red-700', icon: X },
      expired: { label: 'Scaduta', color: 'bg-gray-100 text-gray-700', icon: Timer },
      cancelled: { label: 'Annullata', color: 'bg-gray-100 text-gray-700', icon: X },
      draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-700', icon: Clock }
    }
    
    const { label, color, icon: Icon } = config[status] || config.draft
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon size={12} />
        {label}
      </span>
    )
  }
  
  // Tempo rimanente
  const getTimeRemaining = (validUntil: Date) => {
    if (isPast(validUntil)) return 'Scaduta'
    return `Scade ${formatDistanceToNow(validUntil, { addSuffix: true, locale: it })}`
  }
  
  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Le mie offerte</h1>
                <p className="text-sm text-gray-500">Offerte ricevute dai coach</p>
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
            {/* Filtri */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'Tutte', count: offers.length },
                { id: 'pending', label: 'In attesa', count: offers.filter(o => o.status === 'pending').length },
                { id: 'accepted', label: 'Accettate', count: offers.filter(o => o.status === 'accepted' || o.status === 'paid').length },
                { id: 'expired', label: 'Archiviate', count: offers.filter(o => o.status === 'expired' || o.status === 'rejected').length }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === f.id
                      ? 'bg-charcoal text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            
            {/* Lista offerte */}
            {filteredOffers.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredOffers.map((offer, index) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`bg-white rounded-xl p-5 shadow-sm ${
                        offer.status === 'pending' ? 'border-l-4 border-amber-400' : ''
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="text-primary-600" size={24} />
                          </div>
                          <div>
                            <p className="font-semibold text-charcoal">{offer.coachName}</p>
                            <p className="text-sm text-gray-500">
                              {format(offer.createdAt, "d MMMM yyyy", { locale: it })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(offer.status)}
                      </div>
                      
                      {/* Dettagli */}
                      <div className="mb-4">
                        <h3 className="font-semibold text-charcoal mb-1">{offer.title}</h3>
                        {offer.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">{offer.description}</p>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex flex-wrap gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          {offer.type === 'package' ? (
                            <>
                              <Package size={16} />
                              {offer.sessionsIncluded} sessioni
                            </>
                          ) : (
                            <>
                              <Clock size={16} />
                              Sessione singola
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Timer size={16} />
                          {offer.sessionDuration} min/sessione
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-primary-600">
                          <Euro size={16} />
                          {formatCurrency(offer.priceTotal)}
                        </div>
                      </div>
                      
                      {/* Tempo rimanente */}
                      {offer.status === 'pending' && (
                        <div className={`text-sm mb-4 ${
                          isPast(offer.validUntil) ? 'text-red-500' : 'text-amber-600'
                        }`}>
                          ⏰ {getTimeRemaining(offer.validUntil)}
                        </div>
                      )}
                      
                      {/* Azioni */}
                      {offer.status === 'pending' && !isPast(offer.validUntil) && (
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setSelectedOffer(offer)
                              setShowRejectModal(true)
                            }}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Rifiuta
                          </button>
                          <button
                            onClick={() => handleAccept(offer)}
                            disabled={isProcessing}
                            className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <>
                                <Check size={18} />
                                Accetta e Paga
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      
                      {offer.status === 'accepted' && (
                        <div className="pt-4 border-t border-gray-100">
                          <Link
                            href={`/checkout/${offer.id}`}
                            className="w-full px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <CreditCard size={18} />
                            Procedi al pagamento
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      )}
                      
                      {offer.status === 'paid' && (
                        <div className="pt-4 border-t border-gray-100">
                          <Link
                            href={`/sessions`}
                            className="w-full px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Calendar size={18} />
                            Prenota sessione
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center">
                <Package size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {filter === 'pending' 
                    ? 'Nessuna offerta in attesa' 
                    : 'Nessuna offerta ricevuta'}
                </p>
                <Link 
                  href="/matching"
                  className="text-primary-500 hover:underline"
                >
                  Trova un coach →
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Modal rifiuto */}
      <AnimatePresence>
        {showRejectModal && selectedOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-charcoal mb-2">
                Rifiuta offerta
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Sei sicuro di voler rifiutare l'offerta di {selectedOffer.coachName}?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (opzionale)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Spiega brevemente perché rifiuti..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedOffer(null)
                    setRejectReason('')
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <X size={18} />
                      Rifiuta
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
