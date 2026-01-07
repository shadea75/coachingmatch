'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Lock,
  User
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

interface Offer {
  id: string
  coachId: string
  coachName: string
  coacheeId: string
  coacheeEmail: string
  title: string
  totalSessions: number
  sessionDuration: number
  pricePerSession: number
  paidInstallments: number
  status: string
  installments: Array<{ sessionNumber: number; amount: number; status: string }>
  coachStripeAccountId?: string
  commissionRate?: number // Commissione (es. 0.30 per 30%, 0.035 per 3.5%)
  source?: string // 'office' per offerte dall'ufficio virtuale
}

function PayOfferContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const offerId = params.offerId as string
  const cancelled = searchParams.get('cancelled')
  
  const [offer, setOffer] = useState<Offer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  
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
        
        // Carica anche l'account Stripe del coach se esiste
        let coachStripeAccountId = undefined
        try {
          const stripeDoc = await getDoc(doc(db, 'coachStripeAccounts', data.coachId))
          if (stripeDoc.exists()) {
            coachStripeAccountId = stripeDoc.data().stripeAccountId
          }
        } catch (e) {
          console.log('Coach non ha Stripe Connect')
        }
        
        setOffer({
          id: offerDoc.id,
          coachId: data.coachId,
          coachName: data.coachName || 'Coach',
          coacheeId: data.coacheeId,
          coacheeEmail: data.coacheeEmail || '',
          title: data.title || 'Offerta',
          totalSessions: data.totalSessions || 1,
          sessionDuration: data.sessionDuration || 60,
          pricePerSession: data.pricePerSession || 0,
          paidInstallments: data.paidInstallments || 0,
          status: data.status || 'pending',
          installments: data.installments || [],
          coachStripeAccountId,
          commissionRate: data.commissionRate, // Commissione salvata nell'offerta
          source: data.source // 'office' se creata dall'ufficio virtuale
        })
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    loadOffer()
  }, [offerId])
  
  const nextInstallment = offer?.installments.find(i => i.status !== 'paid')
  const nextInstallmentNumber = nextInstallment?.sessionNumber || 1
  
  const handlePayment = async () => {
    if (!user || !offer || !nextInstallment) return
    setIsProcessing(true)
    setError('')
    
    // Log per debug
    console.log('Pagamento offerta:', {
      offerId: offer.id,
      commissionRate: offer.commissionRate,
      source: offer.source,
      amount: nextInstallment.amount
    })
    
    try {
      const response = await fetch('/api/payments/create-installment-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          installmentNumber: nextInstallmentNumber,
          userId: user.id,
          // Passa i dati necessari per evitare firebase-admin
          amount: nextInstallment.amount,
          coachName: offer.coachName,
          coacheeEmail: offer.coacheeEmail || user.email,
          sessionDuration: offer.sessionDuration,
          totalSessions: offer.totalSessions,
          title: offer.title,
          coachStripeAccountId: offer.coachStripeAccountId,
          // Commissione dinamica (default 30% se non specificata)
          commissionRate: offer.commissionRate ?? 0.30
        })
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Errore nel pagamento')
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante il pagamento')
    } finally {
      setIsProcessing(false)
    }
  }
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Effettua il login per procedere</p>
          <Link href="/login" className="text-primary-500 hover:underline">Accedi</Link>
        </div>
      </div>
    )
  }
  
  if (error && !offer) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/dashboard" className="text-primary-500 hover:underline">Torna alla dashboard</Link>
        </div>
      </div>
    )
  }
  
  if (offer && offer.coacheeId !== user.id) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-gray-500 mb-4">Non autorizzato</p>
          <Link href="/dashboard" className="text-primary-500 hover:underline">Torna alla dashboard</Link>
        </div>
      </div>
    )
  }
  
  if (offer && offer.paidInstallments >= offer.totalSessions) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold text-charcoal mb-2">Tutte le rate pagate!</h2>
          <p className="text-gray-500 mb-6">Hai completato tutti i pagamenti.</p>
          <Link href="/dashboard" className="inline-flex px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600">
            Vai alla Dashboard
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/offers" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <Logo size="sm" />
        </div>
      </header>
      
      <main className="max-w-lg mx-auto px-4 py-6">
        {cancelled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-yellow-500" size={20} />
            <p className="text-yellow-700 text-sm">Pagamento annullato. Puoi riprovare.</p>
          </div>
        )}
        
        {offer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="text-primary-600" size={28} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-charcoal">{offer.title}</h1>
                  <p className="text-gray-500">con {offer.coachName}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Progresso pagamenti</span>
                  <span className="font-medium">{offer.paidInstallments}/{offer.totalSessions}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500" style={{ width: `${(offer.paidInstallments / offer.totalSessions) * 100}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                {offer.installments.map((inst, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${
                    inst.status === 'paid' ? 'bg-green-50' : inst.sessionNumber === nextInstallmentNumber ? 'bg-primary-50 border-2 border-primary-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      {inst.status === 'paid' ? <CheckCircle className="text-green-500" size={20} /> : 
                       inst.sessionNumber === nextInstallmentNumber ? <div className="w-5 h-5 rounded-full border-2 border-primary-500" /> : 
                       <Clock className="text-gray-400" size={20} />}
                      <span className={inst.status === 'paid' ? 'text-green-700' : 'text-gray-700'}>Sessione {inst.sessionNumber}</span>
                    </div>
                    <span className={`font-medium ${inst.status === 'paid' ? 'text-green-600' : 'text-charcoal'}`}>{formatCurrency(inst.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {nextInstallment && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                  <CreditCard className="text-primary-500" size={20} />
                  Paga Sessione {nextInstallmentNumber}
                </h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Durata sessione</span>
                    <span>{offer.sessionDuration} min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Coach</span>
                    <span>{offer.coachName}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-medium">Totale</span>
                    <span className="text-xl font-bold text-primary-500">{formatCurrency(nextInstallment.amount)}</span>
                  </div>
                </div>
                
                {error && (
                  <div className="bg-red-50 rounded-xl p-4 mb-4 flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} /><span className="text-sm">{error}</span>
                  </div>
                )}
                
                <button onClick={handlePayment} disabled={isProcessing}
                  className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium">
                  {isProcessing ? <><Loader2 size={20} className="animate-spin" />Elaborazione...</> : <><Lock size={18} />Paga {formatCurrency(nextInstallment.amount)}</>}
                </button>
                
                <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
                  <Lock size={12} />Pagamento sicuro con Stripe
                </p>
              </div>
            )}
            
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">Come funziona</p>
              <ul className="space-y-1 text-blue-600">
                <li>• Dopo il pagamento potrai prenotare la sessione</li>
                <li>• Il coach riceverà una notifica</li>
                <li>• Riceverai un'email di conferma</li>
              </ul>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default function PayOfferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <PayOfferContent />
    </Suspense>
  )
}
