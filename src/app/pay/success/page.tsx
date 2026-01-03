'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Calendar, ArrowRight, Loader2, Home } from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'

function PaySuccessContent() {
  const searchParams = useSearchParams()
  const offerId = searchParams.get('offerId')
  const sessionNumber = searchParams.get('session')
  
  const [isUpdating, setIsUpdating] = useState(true)
  const [offer, setOffer] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const updatePaymentStatus = async () => {
      if (!offerId || !sessionNumber) {
        setIsUpdating(false)
        return
      }

      try {
        // Carica l'offerta
        const offerRef = doc(db, 'offers', offerId)
        const offerSnap = await getDoc(offerRef)
        
        if (!offerSnap.exists()) {
          setError('Offerta non trovata')
          setIsUpdating(false)
          return
        }

        const offerData = offerSnap.data()
        setOffer({ id: offerSnap.id, ...offerData })

        // Aggiorna lo stato della rata pagata
        const installmentIndex = parseInt(sessionNumber) - 1
        const installments = offerData.installments || []
        
        // Controlla se la rata non è già stata segnata come pagata
        if (installments[installmentIndex] && installments[installmentIndex].status !== 'paid') {
          const amountPaid = installments[installmentIndex].amount || offerData.pricePerSession
          
          installments[installmentIndex] = {
            ...installments[installmentIndex],
            status: 'paid',
            paidAt: new Date()
          }

          // Calcola quante rate sono state pagate
          const paidCount = installments.filter((i: any) => i.status === 'paid').length

          // Aggiorna l'offerta
          await updateDoc(offerRef, {
            installments,
            paidInstallments: paidCount,
            status: paidCount > 0 ? 'active' : offerData.status,
            updatedAt: serverTimestamp()
          })

          // Invia email di conferma a coachee e coach
          try {
            await fetch('/api/emails/payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                coacheeEmail: offerData.coacheeEmail,
                coacheeName: offerData.coacheeName,
                coachEmail: offerData.coachEmail,
                coachName: offerData.coachName,
                offerTitle: offerData.title,
                sessionNumber: parseInt(sessionNumber),
                totalSessions: offerData.totalSessions,
                amountPaid: amountPaid,
                offerId: offerId
              })
            })
          } catch (emailErr) {
            console.error('Errore invio email:', emailErr)
            // Non blocchiamo il flusso se l'email fallisce
          }
        }

        setIsUpdating(false)
      } catch (err) {
        console.error('Errore aggiornamento:', err)
        setError('Errore durante l\'aggiornamento')
        setIsUpdating(false)
      }
    }

    updatePaymentStatus()
  }, [offerId, sessionNumber])

  if (isUpdating) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Conferma pagamento in corso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4">
        <div className="max-w-lg mx-auto flex justify-center">
          <Logo size="md" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-sm max-w-md w-full text-center"
        >
          {error ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-red-500 text-2xl">!</span>
              </div>
              <h1 className="text-2xl font-bold text-charcoal mb-2">
                Ops, qualcosa è andato storto
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
            </>
          ) : (
            <>
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="text-green-500" size={40} />
              </motion.div>

              <h1 className="text-2xl font-bold text-charcoal mb-2">
                Pagamento completato!
              </h1>
              
              <p className="text-gray-500 mb-6">
                {sessionNumber ? (
                  <>Hai pagato la sessione #{sessionNumber} del tuo percorso di coaching.</>
                ) : (
                  <>Il tuo pagamento è stato elaborato con successo.</>
                )}
              </p>

              {offer && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                  <h3 className="font-medium text-charcoal mb-2">{offer.title}</h3>
                  <p className="text-sm text-gray-500">Coach: {offer.coachName}</p>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sessioni pagate</span>
                      <span className="font-medium text-green-600">
                        {offer.paidInstallments || parseInt(sessionNumber || '1')}/{offer.totalSessions}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Info box */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Calendar className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-blue-700">Prossimi passi</p>
                    <p className="text-sm text-blue-600 mt-1">
                      Il tuo coach riceverà una notifica. Potrai prenotare la sessione dalla tua dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/offers"
              className="w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              Vai alle mie offerte
              <ArrowRight size={18} />
            </Link>
            
            <Link
              href="/dashboard"
              className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Home size={18} />
              Torna alla Dashboard
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <PaySuccessContent />
    </Suspense>
  )
}
