'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Loader2,
  Mail,
  Calendar,
  ArrowRight
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

export default function ExternalOfferSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  
  const offerId = params.offerId as string
  const installmentNumber = searchParams.get('installment')
  
  const [isUpdating, setIsUpdating] = useState(true)
  const [offer, setOffer] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const updatePayment = async () => {
      if (!offerId || !installmentNumber) {
        setError('Parametri mancanti')
        setIsUpdating(false)
        return
      }

      try {
        const offerRef = doc(db, 'externalOffers', offerId)
        const offerSnap = await getDoc(offerRef)
        
        if (!offerSnap.exists()) {
          setError('Offerta non trovata')
          setIsUpdating(false)
          return
        }

        const offerData = offerSnap.data()
        setOffer(offerData)

        // Aggiorna lo stato della rata pagata
        const installmentIndex = parseInt(installmentNumber) - 1
        const installments = offerData.installments || []
        
        if (installments[installmentIndex] && installments[installmentIndex].status !== 'paid') {
          installments[installmentIndex] = {
            ...installments[installmentIndex],
            status: 'paid',
            paidAt: new Date()
          }

          const paidCount = installments.filter((i: any) => i.status === 'paid').length

          await updateDoc(offerRef, {
            installments,
            paidInstallments: paidCount,
            status: paidCount >= offerData.totalSessions ? 'completed' : 'active',
            updatedAt: serverTimestamp()
          })

          // Aggiorna anche il totale revenue del cliente
          try {
            const clientRef = doc(db, 'coachClients', offerData.clientId)
            const clientSnap = await getDoc(clientRef)
            if (clientSnap.exists()) {
              const clientData = clientSnap.data()
              await updateDoc(clientRef, {
                totalRevenue: (clientData.totalRevenue || 0) + installments[installmentIndex].amount,
                updatedAt: serverTimestamp()
              })
            }
          } catch (e) {
            console.error('Errore aggiornamento cliente:', e)
          }
          
          // Invia email di conferma
          try {
            await fetch('/api/emails/external-payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientEmail: offerData.clientEmail,
                clientName: offerData.clientName,
                coachEmail: offerData.coachEmail,
                coachName: offerData.coachName,
                offerTitle: offerData.title,
                sessionNumber: parseInt(installmentNumber),
                totalSessions: offerData.totalSessions,
                amountPaid: installments[installmentIndex].amount,
                offerId: offerId
              })
            })
          } catch (emailErr) {
            console.error('Errore invio email:', emailErr)
          }
        }

        setIsUpdating(false)
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore durante l\'aggiornamento')
        setIsUpdating(false)
      }
    }

    updatePayment()
  }, [offerId, installmentNumber])

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

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-charcoal mb-2">Errore</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link 
            href={`/external-offer/${offerId}`}
            className="inline-block px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
          >
            Torna all'offerta
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-center">
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-sm text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="text-green-500" size={40} />
          </motion.div>

          <h1 className="text-2xl font-bold text-charcoal mb-2">
            Pagamento confermato!
          </h1>
          
          <p className="text-gray-500 mb-6">
            Grazie per il tuo pagamento. {offer?.coachName} ti contatterà presto per programmare la sessione.
          </p>

          {offer && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-medium text-charcoal mb-2">{offer.title}</h3>
              <p className="text-sm text-gray-500">
                Sessione {installmentNumber}/{offer.totalSessions} pagata
              </p>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Importo pagato</span>
                  <span className="font-semibold text-green-600">
                    €{offer.pricePerSession?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Mail className="text-blue-500 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-blue-800">Email di conferma inviata</p>
                <p className="text-sm text-blue-600">
                  Riceverai i dettagli all'indirizzo {offer?.clientEmail}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href={`/external-offer/${offerId}`}
              className="w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              Vedi stato pagamenti
              <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
