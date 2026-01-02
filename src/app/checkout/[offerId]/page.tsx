'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  CreditCard, 
  Lock, 
  Check, 
  Package,
  Clock,
  User,
  Euro,
  AlertCircle,
  Loader2,
  Shield,
  FileText
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  Offer,
  formatCurrency,
  PLATFORM_CONFIG
} from '@/types/payments'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const offerId = params.offerId as string
  
  const [offer, setOffer] = useState<Offer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  
  // Carica offerta
  useEffect(() => {
    const loadOffer = async () => {
      if (!offerId) return
      
      setIsLoading(true)
      try {
        const offerDoc = await getDoc(doc(db, 'offers', offerId))
        if (offerDoc.exists()) {
          const data = offerDoc.data()
          setOffer({
            id: offerDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            validUntil: data.validUntil?.toDate?.() || new Date()
          } as Offer)
        }
      } catch (err) {
        console.error('Errore caricamento offerta:', err)
        setError('Offerta non trovata')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadOffer()
  }, [offerId])
  
  // Verifica autorizzazione
  useEffect(() => {
    if (offer && user && offer.coacheeId !== user.id) {
      setError('Non sei autorizzato a visualizzare questa offerta')
    }
  }, [offer, user])
  
  // Processa pagamento
  const handlePayment = async () => {
    if (!offer || !acceptTerms) return
    
    setIsProcessing(true)
    setError('')
    
    try {
      // Chiama API per creare Stripe Checkout Session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          coacheeId: user?.id,
          coacheeEmail: user?.email
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Redirect a Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Errore pagamento:', err)
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
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/offers" className="text-primary-500 hover:underline">
            Torna alle offerte
          </Link>
        </div>
      </div>
    )
  }
  
  if (!offer) return null
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/offers"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Checkout</h1>
                <p className="text-sm text-gray-500">Completa il pagamento</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Riepilogo offerta */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Package size={20} className="text-primary-500" />
                Riepilogo offerta
              </h2>
              
              {/* Coach */}
              <div className="flex items-center gap-3 p-4 bg-cream rounded-xl mb-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="text-primary-600" size={24} />
                </div>
                <div>
                  <p className="font-medium text-charcoal">{offer.coachName}</p>
                  <p className="text-sm text-gray-500">Coach</p>
                </div>
              </div>
              
              {/* Dettagli */}
              <div className="space-y-3">
                <h3 className="font-semibold text-charcoal">{offer.title}</h3>
                {offer.description && (
                  <p className="text-gray-600 text-sm">{offer.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    {offer.type === 'package' ? (
                      <>
                        <Package size={18} />
                        <span>{offer.sessionsIncluded} sessioni</span>
                      </>
                    ) : (
                      <>
                        <Clock size={18} />
                        <span>Sessione singola</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={18} />
                    <span>{offer.sessionDuration} min/sessione</span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Policy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Shield size={20} className="text-green-500" />
                Garanzie e policy
              </h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700">Rimborso completo</p>
                    <p className="text-green-600">Se cancelli più di 24 ore prima della sessione</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Lock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-700">Pagamento sicuro</p>
                    <p className="text-blue-600">Transazione protetta da Stripe</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">Cancellazione tardiva</p>
                    <p className="text-amber-600">Nessun rimborso se cancelli meno di 24 ore prima</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Termini */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500 mt-0.5"
                />
                <span className="text-sm text-gray-600">
                  Accetto i{' '}
                  <Link href="/terms" className="text-primary-500 hover:underline">
                    Termini di Servizio
                  </Link>
                  {' '}e la{' '}
                  <Link href="/privacy" className="text-primary-500 hover:underline">
                    Privacy Policy
                  </Link>
                  . Confermo di aver letto e compreso la policy di cancellazione.
                </span>
              </label>
            </motion.div>
          </div>
          
          {/* Sidebar pagamento */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm sticky top-6"
            >
              <h2 className="font-semibold text-charcoal mb-4">Riepilogo pagamento</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotale</span>
                  <span>{formatCurrency(offer.priceNet)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA (22%)</span>
                  <span>{formatCurrency(offer.vatAmount)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-charcoal">Totale</span>
                    <span className="text-primary-600">{formatCurrency(offer.priceTotal)}</span>
                  </div>
                </div>
              </div>
              
              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              {/* Pulsante pagamento */}
              <button
                onClick={handlePayment}
                disabled={!acceptTerms || isProcessing}
                className="w-full mt-6 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Paga {formatCurrency(offer.priceTotal)}
                  </>
                )}
              </button>
              
              {/* Sicurezza */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock size={14} />
                Pagamento sicuro con Stripe
              </div>
              
              {/* Dati fattura */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Fattura emessa da:</p>
                <div className="text-xs text-gray-500">
                  <p className="font-medium">{PLATFORM_CONFIG.COMPANY.name}</p>
                  <p>{PLATFORM_CONFIG.COMPANY.address}</p>
                  <p>{PLATFORM_CONFIG.COMPANY.city}</p>
                  <p>P.IVA: {PLATFORM_CONFIG.COMPANY.vatNumber}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
