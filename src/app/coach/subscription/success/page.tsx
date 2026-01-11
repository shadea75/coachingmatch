'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Loader2, PartyPopper, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'

function SubscriptionSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isUpdating, setIsUpdating] = useState(true)

  useEffect(() => {
    const updateSubscription = async () => {
      const sessionId = searchParams.get('session_id')
      
      if (!sessionId || !user?.id) {
        setIsUpdating(false)
        return
      }

      try {
        // Aggiorna lo stato dell'abbonamento nel database
        const now = new Date()
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 giorni

        await updateDoc(doc(db, 'coachApplications', user.id), {
          subscriptionStatus: 'active',
          subscriptionStartDate: now,
          subscriptionEndDate: endDate,
          stripeSessionId: sessionId,
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        console.error('Errore aggiornamento abbonamento:', err)
      } finally {
        setIsUpdating(false)
      }
    }

    updateSubscription()
  }, [searchParams, user?.id])

  if (isUpdating) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Attivazione abbonamento in corso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card successo */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header verde */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center relative overflow-hidden">
            {/* Decorazioni animate */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-4 left-4"
            >
              <Sparkles size={20} className="text-white/50" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute top-6 right-6"
            >
              <Sparkles size={16} className="text-white/50" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="absolute bottom-4 right-4"
            >
              <Sparkles size={24} className="text-white/50" />
            </motion.div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle size={40} />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Abbonamento Attivato!</h1>
            <p className="text-white/90">
              Benvenuto nella community CoachaMi
            </p>
          </div>

          {/* Contenuto */}
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
                <PartyPopper size={20} />
                <span className="font-medium">Congratulazioni!</span>
                <PartyPopper size={20} />
              </div>
              <p className="text-gray-600">
                Il tuo abbonamento è ora attivo. Hai accesso completo a tutte le funzionalità della piattaforma.
              </p>
            </div>

            {/* Cosa puoi fare */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-charcoal mb-3">Ora puoi:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  Accedere alla tua Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  Gestire i tuoi clienti e sessioni
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  Pubblicare nella Community
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  Ricevere prenotazioni dai coachee
                </li>
              </ul>
            </div>

            {/* CTA */}
            <Link
              href="/coach/dashboard"
              className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-2"
            >
              Vai alla Dashboard
              <ArrowRight size={20} />
            </Link>

            <p className="text-center text-sm text-gray-500">
              Riceverai una email di conferma con i dettagli del tuo abbonamento.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={40} />
        <p className="text-gray-600">Caricamento...</p>
      </div>
    </div>
  )
}

// Main component wrapped in Suspense
export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubscriptionSuccessContent />
    </Suspense>
  )
}
