'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  User,
  Euro,
  Calendar,
  Clock,
  CheckCircle,
  CreditCard,
  Loader2,
  AlertCircle,
  Lock,
  FileText
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

interface ExternalOffer {
  id: string
  coachId: string
  coachName: string
  coachEmail: string
  clientId: string
  clientName: string
  clientEmail: string
  title: string
  description?: string
  totalSessions: number
  sessionDuration: number
  pricePerSession: number
  priceTotal: number
  paidInstallments: number
  completedSessions: number
  status: string
  installments: Array<{ sessionNumber: number; amount: number; status: string }>
}

export default function ExternalOfferPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const offerId = params.offerId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [offer, setOffer] = useState<ExternalOffer | null>(null)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const loadOffer = async () => {
      if (!offerId) return
      
      setIsLoading(true)
      try {
        const offerDoc = await getDoc(doc(db, 'externalOffers', offerId))
        
        if (!offerDoc.exists()) {
          setError('Offerta non trovata')
          return
        }
        
        const data = offerDoc.data()
        setOffer({
          id: offerDoc.id,
          coachId: data.coachId,
          coachName: data.coachName,
          coachEmail: data.coachEmail,
          clientId: data.clientId,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          title: data.title,
          description: data.description,
          totalSessions: data.totalSessions,
          sessionDuration: data.sessionDuration,
          pricePerSession: data.pricePerSession,
          priceTotal: data.priceTotal,
          paidInstallments: data.paidInstallments || 0,
          completedSessions: data.completedSessions || 0,
          status: data.status,
          installments: data.installments || []
        })
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento dell\'offerta')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadOffer()
  }, [offerId])

  const nextInstallment = offer?.installments.find(i => i.status !== 'paid')
  const nextInstallmentNumber = nextInstallment?.sessionNumber || 1
  const allPaid = offer ? offer.paidInstallments >= offer.totalSessions : false

  const handlePayment = async () => {
    if (!offer || !nextInstallment) return
    
    setIsProcessing(true)
    setError('')
    
    try {
      const response = await fetch('/api/checkout/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          installmentNumber: nextInstallmentNumber
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel pagamento')
      }
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante il pagamento')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold text-charcoal mb-2">Offerta non trovata</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!offer) return null

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-center">
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Coach Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="text-primary-600" size={28} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Offerta di</p>
                <h2 className="text-lg font-semibold text-charcoal">{offer.coachName}</h2>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h1 className="text-xl font-bold text-charcoal mb-2">{offer.title}</h1>
              {offer.description && (
                <p className="text-gray-600 text-sm">{offer.description}</p>
              )}
            </div>
          </div>

          {/* Dettagli Offerta */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <FileText className="text-primary-500" size={20} />
              Dettagli del percorso
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-400" size={18} />
                  <span className="text-gray-600">Sessioni totali</span>
                </div>
                <span className="font-semibold text-charcoal">{offer.totalSessions}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="text-gray-400" size={18} />
                  <span className="text-gray-600">Durata sessione</span>
                </div>
                <span className="font-semibold text-charcoal">{offer.sessionDuration} min</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Euro className="text-gray-400" size={18} />
                  <span className="text-gray-600">Prezzo per sessione</span>
                </div>
                <span className="font-semibold text-charcoal">{formatCurrency(offer.pricePerSession)}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl border border-primary-100">
                <span className="font-medium text-charcoal">Totale percorso</span>
                <span className="text-xl font-bold text-primary-600">{formatCurrency(offer.priceTotal)}</span>
              </div>
            </div>
          </div>

          {/* Progresso Pagamenti */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <CreditCard className="text-green-500" size={20} />
              Stato pagamenti
            </h3>
            
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Pagato</span>
                <span className="font-medium">{offer.paidInstallments}/{offer.totalSessions} sessioni</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(offer.paidInstallments / offer.totalSessions) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Lista rate */}
            <div className="space-y-2">
              {offer.installments.map((inst, i) => (
                <div 
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    inst.status === 'paid' 
                      ? 'bg-green-50' 
                      : inst.sessionNumber === nextInstallmentNumber
                        ? 'bg-primary-50 border-2 border-primary-200'
                        : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {inst.status === 'paid' ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : inst.sessionNumber === nextInstallmentNumber ? (
                      <div className="w-5 h-5 rounded-full border-2 border-primary-500" />
                    ) : (
                      <Clock className="text-gray-400" size={20} />
                    )}
                    <span className={inst.status === 'paid' ? 'text-green-700' : 'text-gray-700'}>
                      Sessione {inst.sessionNumber}
                    </span>
                  </div>
                  <span className={`font-medium ${inst.status === 'paid' ? 'text-green-600' : 'text-charcoal'}`}>
                    {formatCurrency(inst.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pulsante Pagamento */}
          {!allPaid && nextInstallment && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-4">
                Paga Sessione {nextInstallmentNumber}
              </h3>
              
              {error && (
                <div className="bg-red-50 rounded-xl p-4 mb-4 flex items-center gap-3 text-red-600">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Paga {formatCurrency(nextInstallment.amount)}
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
                <Lock size={12} />
                Pagamento sicuro con Stripe
              </p>
            </div>
          )}

          {/* Tutto pagato */}
          {allPaid && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <CheckCircle className="mx-auto mb-3 text-green-500" size={40} />
              <h3 className="font-semibold text-green-800 mb-1">Pagamento completato!</h3>
              <p className="text-green-600 text-sm">
                Tutte le sessioni sono state pagate. Il tuo coach ti contatterà per programmare le sessioni.
              </p>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Come funziona</p>
            <ul className="space-y-1 text-blue-600">
              <li>• Paga una sessione alla volta</li>
              <li>• Dopo il pagamento, il coach ti contatterà</li>
              <li>• Riceverai conferma via email</li>
            </ul>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
