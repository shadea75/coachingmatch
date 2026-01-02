'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Loader2, Euro, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'

export default function StripeOnboardingCompletePage() {
  const { user } = useAuth()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  
  useEffect(() => {
    const verifyAccount = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch(`/api/stripe-connect?coachId=${user.id}`)
        const data = await response.json()
        
        setIsComplete(data.onboardingComplete)
      } catch (err) {
        console.error('Errore verifica:', err)
      } finally {
        setIsVerifying(false)
      }
    }
    
    // Aspetta un po' per dare tempo a Stripe di processare
    setTimeout(verifyAccount, 2000)
  }, [user?.id])
  
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4">
        <div className="max-w-2xl mx-auto flex justify-center">
          <Logo size="md" />
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        {isVerifying ? (
          <div className="text-center">
            <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
            <p className="text-gray-500">Verifica in corso...</p>
          </div>
        ) : isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="text-green-500" size={48} />
            </motion.div>
            
            <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
              Account configurato! 🎉
            </h1>
            <p className="text-gray-500 mb-8">
              Ora puoi ricevere pagamenti dai tuoi coachee. I fondi verranno trasferiti 
              automaticamente sul tuo conto bancario.
            </p>
            
            <div className="space-y-3">
              <Link
                href="/coach/earnings"
                className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Euro size={20} />
                Vai ai guadagni
                <ArrowRight size={20} />
              </Link>
              
              <Link
                href="/coach/dashboard"
                className="w-full px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors block"
              >
                Torna alla dashboard
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center"
          >
            <h2 className="text-xl font-semibold text-charcoal mb-4">
              Configurazione in corso
            </h2>
            <p className="text-gray-500 mb-6">
              La verifica del tuo account potrebbe richiedere qualche minuto. 
              Riceverai una notifica quando sarà completata.
            </p>
            
            <Link
              href="/coach/stripe-onboarding"
              className="btn bg-primary-500 text-white hover:bg-primary-600"
            >
              Verifica stato
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  )
}
