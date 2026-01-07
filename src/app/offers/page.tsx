'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
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
  CreditCard,
  AlertCircle,
  Star,
  CalendarPlus
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
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { format, formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Installment {
  sessionNumber: number
  amount: number
  status: 'pending' | 'paid'
  paidAt?: Date
}

interface Offer {
  id: string
  coachId: string
  coachName: string
  coachEmail: string
  title: string
  description?: string
  totalSessions: number
  sessionDuration: number
  completedSessions: number
  priceTotal: number
  pricePerSession: number
  paidInstallments: number
  installments: Installment[]
  status: string
  createdAt: Date
  validUntil: Date
  // Contratto
  requireContract?: boolean
  contractAccepted?: boolean
  source?: string // 'office' se creata dall'ufficio virtuale
}

interface Session {
  id: string
  offerId: string
  sessionNumber: number
  status: string
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export default function CoacheeOffersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [offers, setOffers] = useState<Offer[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Carica offerte e sessioni
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Carica offerte
        const offersQuery = query(
          collection(db, 'offers'),
          where('coacheeId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const offersSnapshot = await getDocs(offersQuery)
        const loadedOffers: Offer[] = offersSnapshot.docs.map(doc => ({
          id: doc.id,
          coachId: doc.data().coachId,
          coachName: doc.data().coachName || 'Coach',
          coachEmail: doc.data().coachEmail || '',
          title: doc.data().title || 'Offerta',
          description: doc.data().description,
          totalSessions: doc.data().totalSessions || 1,
          sessionDuration: doc.data().sessionDuration || 60,
          completedSessions: doc.data().completedSessions || 0,
          priceTotal: doc.data().priceTotal || 0,
          pricePerSession: doc.data().pricePerSession || 0,
          paidInstallments: doc.data().paidInstallments || 0,
          installments: doc.data().installments || [],
          status: doc.data().status || 'pending',
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          validUntil: doc.data().validUntil?.toDate() || new Date(),
          // Contratto
          requireContract: doc.data().requireContract || false,
          contractAccepted: doc.data().contractAccepted || false,
          source: doc.data().source
        }))
        setOffers(loadedOffers)
        
        // Carica sessioni collegate alle offerte
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coacheeId', '==', user.id),
          where('type', '==', 'paid_session')
        )
        const sessionsSnapshot = await getDocs(sessionsQuery)
        const loadedSessions: Session[] = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          offerId: doc.data().offerId || '',
          sessionNumber: doc.data().sessionNumber || 0,
          status: doc.data().status || ''
        }))
        setSessions(loadedSessions)
        
      } catch (err) {
        console.error('Errore caricamento:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [user?.id])
  
  // Funzione per trovare sessioni non prenotate per un'offerta
  const getUnbookedPaidSessions = (offer: Offer): number[] => {
    const paidSessionNumbers = offer.installments
      .filter(i => i.status === 'paid')
      .map(i => i.sessionNumber)
    
    const bookedSessionNumbers = sessions
      .filter(s => s.offerId === offer.id && ['pending', 'confirmed', 'completed'].includes(s.status))
      .map(s => s.sessionNumber)
    
    // Sessioni pagate ma non ancora prenotate
    return paidSessionNumbers.filter(n => !bookedSessionNumbers.includes(n))
  }
  
  // Offerte categorizzate
  const pendingOffers = offers.filter(o => o.status === 'pending')
  const activeOffers = offers.filter(o => ['accepted', 'active'].includes(o.status))
  const otherOffers = offers.filter(o => !['pending', 'accepted', 'active'].includes(o.status))
  
  // Rifiuta offerta
  const handleReject = async (offerId: string) => {
    if (!confirm('Sei sicuro di voler rifiutare questa offerta?')) return
    
    setProcessingId(offerId)
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'rejected',
        respondedAt: serverTimestamp()
      })
      setOffers(offers.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o))
    } catch (err) {
      console.error('Errore rifiuto:', err)
      alert('Errore durante il rifiuto')
    } finally {
      setProcessingId(null)
    }
  }
  
  // Accetta offerta (vai al contratto se richiesto, altrimenti al pagamento)
  const handleAccept = async (offer: Offer) => {
    setProcessingId(offer.id)
    try {
      // Se richiede contratto e non ancora accettato, vai alla pagina contratto
      if (offer.requireContract && !offer.contractAccepted) {
        router.push(`/offers/${offer.id}/contract`)
        return
      }
      
      // Altrimenti procedi con l'accettazione e pagamento
      await updateDoc(doc(db, 'offers', offer.id), {
        status: 'accepted',
        respondedAt: serverTimestamp()
      })
      router.push(`/pay/offer/${offer.id}`)
    } catch (err) {
      console.error('Errore accettazione:', err)
      alert('Errore durante l\'accettazione')
      setProcessingId(null)
    }
  }
  
  // Status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string, text: string, label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In attesa' },
      accepted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Accettata' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Attiva' },
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
  
  // Check se offerta scaduta
  const isExpired = (validUntil: Date) => new Date() > new Date(validUntil)
  
  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }
  
  // Non autorizzato
  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Effettua il login per vedere le tue offerte</p>
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
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <Logo size="sm" />
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-charcoal mb-6">Le mie offerte</h1>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <FileText className="mx-auto mb-4 text-gray-300" size={48} />
            <h2 className="text-lg font-semibold text-charcoal mb-2">Nessuna offerta</h2>
            <p className="text-gray-500 mb-6">
              Non hai ancora ricevuto offerte dai coach
            </p>
            <Link
              href="/matching"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
            >
              Trova un coach
              <ChevronRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Offerte in attesa */}
            {pendingOffers.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
                  <Clock className="text-yellow-500" size={20} />
                  In attesa di risposta ({pendingOffers.length})
                </h2>
                
                <div className="space-y-4">
                  {pendingOffers.map((offer, index) => {
                    const expired = isExpired(offer.validUntil)
                    return (
                      <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${
                          expired ? 'border-gray-200 opacity-60' : 'border-primary-200'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-semibold text-lg">
                                {offer.coachName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-charcoal">{offer.coachName}</p>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                <span>Coach Verificato</span>
                              </div>
                            </div>
                          </div>
                          
                          {expired ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">
                              Scaduta
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Scade {formatDistanceToNow(offer.validUntil, { addSuffix: true, locale: it })}
                            </span>
                          )}
                        </div>
                        
                        {/* Contenuto */}
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-charcoal mb-2">{offer.title}</h3>
                          {offer.description && (
                            <p className="text-gray-600 text-sm">{offer.description}</p>
                          )}
                        </div>
                        
                        {/* Dettagli */}
                        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-charcoal">{offer.totalSessions}</p>
                            <p className="text-xs text-gray-500">Sessioni</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-charcoal">{offer.sessionDuration}</p>
                            <p className="text-xs text-gray-500">Minuti/sessione</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary-500">{formatCurrency(offer.priceTotal)}</p>
                            <p className="text-xs text-gray-500">Totale</p>
                          </div>
                        </div>
                        
                        {/* Info pagamento */}
                        <div className="bg-blue-50 rounded-xl p-4 mb-6">
                          <div className="flex items-center gap-2 text-blue-700 text-sm">
                            <CreditCard size={16} />
                            <span className="font-medium">Pagamento a rate</span>
                          </div>
                          <p className="text-blue-600 text-sm mt-1">
                            Pagherai {formatCurrency(offer.pricePerSession)} prima di ogni sessione
                          </p>
                        </div>
                        
                        {/* Azioni */}
                        {!expired && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReject(offer.id)}
                              disabled={processingId === offer.id}
                              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                              <XCircle size={18} />
                              Rifiuta
                            </button>
                            <button
                              onClick={() => handleAccept(offer)}
                              disabled={processingId === offer.id}
                              className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                            >
                              {processingId === offer.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <>
                                  {offer.requireContract && !offer.contractAccepted ? (
                                    <>
                                      <FileText size={18} />
                                      Leggi e Firma Contratto
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle size={18} />
                                      Accetta e Paga
                                    </>
                                  )}
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            )}
            
            {/* Offerte attive */}
            {activeOffers.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={20} />
                  Percorsi attivi
                </h2>
                
                <div className="space-y-4">
                  {activeOffers.map((offer) => {
                    const unbookedSessions = getUnbookedPaidSessions(offer)
                    const hasUnbookedSessions = unbookedSessions.length > 0
                    const nextSessionToBook = unbookedSessions[0]
                    const canPayMore = offer.paidInstallments < offer.totalSessions
                    
                    return (
                    <div
                      key={offer.id}
                      className="bg-white rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-lg">
                              {offer.coachName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-charcoal">{offer.title}</h3>
                            <p className="text-sm text-gray-500">{offer.coachName}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-xl text-center">
                        <div>
                          <p className="text-lg font-bold text-green-600">{offer.paidInstallments}</p>
                          <p className="text-xs text-gray-500">Pagate</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-blue-600">
                            {offer.paidInstallments - unbookedSessions.length}
                          </p>
                          <p className="text-xs text-gray-500">Prenotate</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-purple-600">{offer.completedSessions}</p>
                          <p className="text-xs text-gray-500">Completate</p>
                        </div>
                      </div>
                      
                      {/* Alert sessioni da prenotare */}
                      {hasUnbookedSessions && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                          <div className="flex items-center gap-2 text-yellow-700">
                            <AlertCircle size={18} />
                            <span className="font-medium text-sm">
                              {unbookedSessions.length === 1 
                                ? 'Hai 1 sessione pagata da prenotare!'
                                : `Hai ${unbookedSessions.length} sessioni pagate da prenotare!`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progresso</span>
                          <span>{offer.completedSessions}/{offer.totalSessions} completate</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${(offer.completedSessions / offer.totalSessions) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Azioni */}
                      <div className="flex gap-3">
                        {hasUnbookedSessions && (
                          <Link
                            href={`/booking/paid/${offer.id}?session=${nextSessionToBook}`}
                            className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
                          >
                            <CalendarPlus size={18} />
                            Prenota sessione {nextSessionToBook}
                          </Link>
                        )}
                        
                        {canPayMore && !hasUnbookedSessions && (
                          <Link
                            href={`/pay/offer/${offer.id}`}
                            className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
                          >
                            <CreditCard size={18} />
                            Paga sessione {offer.paidInstallments + 1}
                          </Link>
                        )}
                        
                        {canPayMore && hasUnbookedSessions && (
                          <Link
                            href={`/pay/offer/${offer.id}`}
                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <CreditCard size={18} />
                            Paga altra rata
                          </Link>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </section>
            )}
            
            {/* Altre offerte */}
            {otherOffers.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-charcoal mb-4">Storico</h2>
                
                <div className="space-y-3">
                  {otherOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-charcoal">{offer.title}</h3>
                          {getStatusBadge(offer.status)}
                        </div>
                        <p className="text-sm text-gray-500">{offer.coachName}</p>
                      </div>
                      <p className="text-sm text-gray-400">
                        {format(offer.createdAt, 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
