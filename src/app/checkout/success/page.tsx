'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Calendar, 
  Mail, 
  ArrowRight,
  Loader2,
  FileText
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { formatCurrency } from '@/types/payments'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const offerId = searchParams.get('offer_id')
  
  const [isLoading, setIsLoading] = useState(true)
  const [offer, setOffer] = useState<any>(null)
  const [error, setError] = useState('')
  
  useEffect(() => {
    const verifyPayment = async () => {
      if (!offerId) {
        setError('ID offerta mancante')
        setIsLoading(false)
        return
      }
      
      try {
        // Carica offerta
        const offerDoc = await getDoc(doc(db, 'offers', offerId))
        
        if (!offerDoc.exists()) {
          setError('Offerta non trovata')
          setIsLoading(false)
          return
        }
        
        const offerData = offerDoc.data()
        setOffer(offerData)
        
        // Aggiorna stato a "paid"
        if (offerData.status !== 'paid') {
          await updateDoc(doc(db, 'offers', offerId), {
            status: 'paid',
            paidAt: serverTimestamp(),
            stripeSessionId: sessionId,
            updatedAt: serverTimestamp()
          })
        }
        
      } catch (err) {
        console.error('Errore verifica pagamento:', err)
        setError('Errore durante la verifica del pagamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    verifyPayment()
  }, [offerId, sessionId])
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500">Verifica pagamento in corso...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/offers" className="text-primary-500 hover:underline">
            Torna alle offerte
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <Logo size="md" />
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-lg max-w-lg w-full text-center"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="text-green-500" size={48} />
          </motion.div>
          
          {/* Title */}
          <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
            Pagamento completato! 🎉
          </h1>
          <p className="text-gray-500 mb-6">
            Grazie per il tuo acquisto. Il coach è stato notificato.
          </p>
          
          {/* Riepilogo */}
          {offer && (
            <div className="bg-cream rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-charcoal mb-2">{offer.title}</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Coach: <span className="font-medium">{offer.coachName}</span></p>
                <p>
                  {offer.type === 'package' 
                    ? `${offer.sessionsIncluded} sessioni x ${offer.sessionDuration} min`
                    : `Sessione ${offer.sessionDuration} min`
                  }
                </p>
                <p className="text-primary-600 font-semibold">
                  Totale: {formatCurrency(offer.priceTotal)}
                </p>
              </div>
            </div>
          )}
          
          {/* Prossimi passi */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-left p-3 bg-blue-50 rounded-lg">
              <Mail className="text-blue-500 flex-shrink-0" size={20} />
              <p className="text-sm text-blue-700">
                Riceverai una email di conferma con tutti i dettagli
              </p>
            </div>
            <div className="flex items-center gap-3 text-left p-3 bg-green-50 rounded-lg">
              <Calendar className="text-green-500 flex-shrink-0" size={20} />
              <p className="text-sm text-green-700">
                Ora puoi prenotare la tua sessione con il coach
              </p>
            </div>
            <div className="flex items-center gap-3 text-left p-3 bg-purple-50 rounded-lg">
              <FileText className="text-purple-500 flex-shrink-0" size={20} />
              <p className="text-sm text-purple-700">
                La fattura sarà disponibile nella tua area personale
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/sessions/book"
              className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Calendar size={20} />
              Prenota la tua sessione
              <ArrowRight size={20} />
            </Link>
            
            <Link
              href="/dashboard"
              className="w-full px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Torna alla dashboard
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
