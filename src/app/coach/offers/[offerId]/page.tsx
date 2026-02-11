'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Euro,
  User,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  CreditCard,
  MessageCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Installment {
  sessionNumber: number
  amount: number
  amountNet: number
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
  coacheeEmail: string
  title: string
  description: string
  totalSessions: number
  sessionDuration: number
  completedSessions: number
  priceTotal: number
  pricePerSession: number
  priceNet: number
  vatAmount: number
  platformFeeTotal: number
  coachPayoutTotal: number
  installments: Installment[]
  paidInstallments: number
  status: string
  createdAt: Date
  sentAt: Date
  validUntil: Date
  respondedAt?: Date
  coachNotes?: string
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export default function CoachOfferDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const offerId = params.offerId as string
  
  const [offer, setOffer] = useState<Offer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Carica offerta
  useEffect(() => {
    const loadOffer = async () => {
      if (!offerId) return
      
      setIsLoading(true)
      try {
        const offerDoc = await getDoc(doc(db, 'offers', offerId))
        
        if (!offerDoc.exists()) {
          setError('Offerta non trovata')
          return
        }
        
        const data = offerDoc.data()
        
        // Verifica che l'offerta appartenga al coach
        if (data.coachId !== user?.id && user?.role !== 'admin') {
          setError('Non hai accesso a questa offerta')
          return
        }
        
        setOffer({
          id: offerDoc.id,
          coachId: data.coachId,
          coachName: data.coachName || '',
          coachEmail: data.coachEmail || '',
          coacheeId: data.coacheeId,
          coacheeName: data.coacheeName || 'Coachee',
          coacheeEmail: data.coacheeEmail || '',
          title: data.title || 'Offerta',
          description: data.description || '',
          totalSessions: data.totalSessions || 1,
          sessionDuration: data.sessionDuration || 60,
          completedSessions: data.completedSessions || 0,
          priceTotal: data.priceTotal || 0,
          pricePerSession: data.pricePerSession || 0,
          priceNet: data.priceNet || 0,
          vatAmount: data.vatAmount || 0,
          platformFeeTotal: data.platformFeeTotal || 0,
          coachPayoutTotal: data.coachPayoutTotal || 0,
          installments: (data.installments || []).map((inst: any) => ({
            ...inst,
            paidAt: inst.paidAt?.toDate?.() || null
          })),
          paidInstallments: data.paidInstallments || 0,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          sentAt: data.sentAt?.toDate() || new Date(),
          validUntil: data.validUntil?.toDate() || new Date(),
          respondedAt: data.respondedAt?.toDate?.() || null,
          coachNotes: data.coachNotes || ''
        })
      } catch (err) {
        console.error('Errore caricamento offerta:', err)
        setError('Errore nel caricamento dell\'offerta')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user?.id) {
      loadOffer()
    }
  }, [offerId, user?.id, user?.role])
  
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
      <span className={`px-3 py-1 text-sm rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
  }
  
  // Installment status badge
  const getInstallmentBadge = (status: string) => {
    if (status === 'paid') {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Pagata</span>
    }
    return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">In attesa</span>
  }
  
  // Loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }
  
  // Errore
  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/coach/offers" className="text-primary-500 hover:underline">
            Torna alle offerte
          </Link>
        </div>
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
  
  if (!offer) return null
  
  // Calcola guadagno attuale
  const currentEarnings = offer.installments
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.coachPayout, 0)
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/coach/offers"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-charcoal">{offer.title}</h1>
              <p className="text-sm text-gray-500">Dettaglio offerta</p>
            </div>
            {getStatusBadge(offer.status)}
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Coachee info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <User size={20} className="text-primary-500" />
            Coachee
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-semibold text-xl">
                {offer.coacheeName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-charcoal">{offer.coacheeName}</p>
            </div>
          </div>
          
          {/* Azioni contatto */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
            <Link 
              href={`/coach/messages?coachId=${offer.coacheeId}&coachName=${encodeURIComponent(offer.coacheeName)}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <MessageCircle size={18} />
              Scrivi in chat
            </Link>
          </div>
        </motion.div>
        
        {/* Dettagli offerta */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <FileText size={20} className="text-primary-500" />
            Dettagli percorso
          </h2>
          
          {offer.description && (
            <p className="text-gray-600 mb-4">{offer.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Sessioni</p>
              <p className="text-xl font-bold text-charcoal">{offer.totalSessions}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Durata sessione</p>
              <p className="text-xl font-bold text-charcoal">{offer.sessionDuration} min</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Prezzo totale</p>
              <p className="text-xl font-bold text-charcoal">{formatCurrency(offer.priceTotal)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Rata per sessione</p>
              <p className="text-xl font-bold text-charcoal">{formatCurrency(offer.pricePerSession)}</p>
            </div>
          </div>
          
          {/* Date */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Creata il</span>
              <span className="text-charcoal">{format(offer.createdAt, 'dd MMMM yyyy, HH:mm', { locale: it })}</span>
            </div>
            {offer.status === 'pending' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Scade il</span>
                <span className="text-charcoal">{format(offer.validUntil, 'dd MMMM yyyy', { locale: it })}</span>
              </div>
            )}
            {offer.respondedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Risposta il</span>
                <span className="text-charcoal">{format(offer.respondedAt, 'dd MMMM yyyy, HH:mm', { locale: it })}</span>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Riepilogo economico */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <Euro size={20} className="text-primary-500" />
            Riepilogo economico
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Prezzo totale (IVA incl.)</span>
              <span className="text-charcoal">{formatCurrency(offer.priceTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Imponibile</span>
              <span className="text-charcoal">{formatCurrency(offer.priceNet)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">IVA (22%)</span>
              <span className="text-charcoal">{formatCurrency(offer.vatAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-red-600">
              <span>Commissione CoachaMi (30%)</span>
              <span>-{formatCurrency(offer.platformFeeTotal)}</span>
            </div>
            
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-charcoal">Il tuo guadagno totale</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(offer.coachPayoutTotal)}</span>
              </div>
            </div>
            
            {offer.status === 'active' && (
              <div className="bg-green-50 rounded-xl p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">Guadagno attuale</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(currentEarnings)}</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {offer.paidInstallments} di {offer.totalSessions} rate pagate
                </p>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Stato pagamenti */}
        {offer.installments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary-500" />
              Stato pagamenti
            </h2>
            
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Progresso</span>
                <span className="text-charcoal font-medium">
                  {offer.paidInstallments}/{offer.totalSessions} pagate
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(offer.paidInstallments / offer.totalSessions) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Lista rate */}
            <div className="space-y-3">
              {offer.installments.map((inst, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    inst.status === 'paid' ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      inst.status === 'paid' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {inst.status === 'paid' ? (
                        <CheckCircle size={16} />
                      ) : (
                        <span className="text-sm font-medium">{inst.sessionNumber}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">Sessione {inst.sessionNumber}</p>
                      {inst.paidAt && (
                        <p className="text-xs text-gray-500">
                          Pagata il {format(inst.paidAt, 'dd MMM yyyy', { locale: it })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-semibold ${inst.status === 'paid' ? 'text-green-600' : 'text-gray-500'}`}>
                      {formatCurrency(inst.coachPayout)}
                    </p>
                    {getInstallmentBadge(inst.status)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Note coach */}
        {offer.coachNotes && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal mb-4">Note</h2>
            <p className="text-gray-600">{offer.coachNotes}</p>
          </motion.div>
        )}
      </main>
    </div>
  )
}

