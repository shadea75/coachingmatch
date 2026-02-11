'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  Euro,
  Clock,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'

export default function StripeOnboardingPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean
    onboardingComplete: boolean
    chargesEnabled: boolean
    payoutsEnabled: boolean
  } | null>(null)
  const [error, setError] = useState('')
  
  // Verifica stato account direttamente da Firebase client
  useEffect(() => {
    const checkAccount = async () => {
      if (!user?.id) return
      
      try {
        // Importa Firebase dinamicamente
        const { db } = await import('@/lib/firebase')
        const { doc, getDoc } = await import('firebase/firestore')
        
        const accountDoc = await getDoc(doc(db, 'coachStripeAccounts', user.id))
        
        if (accountDoc.exists()) {
          const data = accountDoc.data()
          setAccountStatus({
            hasAccount: true,
            onboardingComplete: data.onboardingComplete || false,
            chargesEnabled: data.chargesEnabled || false,
            payoutsEnabled: data.payoutsEnabled || false
          })
        } else {
          setAccountStatus({
            hasAccount: false,
            onboardingComplete: false,
            chargesEnabled: false,
            payoutsEnabled: false
          })
        }
      } catch (err: any) {
        console.error('Errore verifica account:', err)
        // Non mostrare errore, semplicemente mostra form di onboarding
        setAccountStatus({
          hasAccount: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAccount()
  }, [user?.id])
  
  // Avvia onboarding
  const handleStartOnboarding = async () => {
    if (!user) return
    
    setIsCreating(true)
    setError('')
    
    try {
      // Importa Firebase
      const { db } = await import('@/lib/firebase')
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      // Controlla se esiste già un account
      const accountDoc = await getDoc(doc(db, 'coachStripeAccounts', user.id))
      const existingAccountId = accountDoc.exists() ? accountDoc.data()?.stripeAccountId : null
      
      const response = await fetch('/api/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: user.id,
          email: user.email,
          coachName: user.name,
          existingAccountId
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Salva accountId in Firebase
      if (data.accountId) {
        await setDoc(doc(db, 'coachStripeAccounts', user.id), {
          coachId: user.id,
          stripeAccountId: data.accountId,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          country: 'IT',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true })
      }
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Errore onboarding:', err)
      setError(err.message || 'Errore durante la configurazione')
    } finally {
      setIsCreating(false)
    }
  }
  
  if (!user || user.role !== 'coach') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">Accesso riservato ai coach</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coach/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Configura pagamenti</h1>
                <p className="text-sm text-gray-500">Ricevi pagamenti dai tuoi coachee</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : accountStatus?.onboardingComplete ? (
          // Account configurato
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-500" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-charcoal mb-2">
                Account pagamenti attivo! ✨
              </h2>
              <p className="text-gray-500 mb-6">
                Sei pronto a ricevere pagamenti dai tuoi coachee.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-cream rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Pagamenti</span>
                  </div>
                  <p className="text-xs text-gray-500">Abilitati</p>
                </div>
                <div className="bg-cream rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Trasferimenti</span>
                  </div>
                  <p className="text-xs text-gray-500">Abilitati</p>
                </div>
              </div>
              
              <Link
                href="/coach/earnings"
                className="btn bg-primary-500 text-white hover:bg-primary-600"
              >
                <Euro size={18} />
                Vai ai guadagni
              </Link>
            </div>
          </motion.div>
        ) : (
          // Onboarding necessario
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Hero */}
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="text-primary-500" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-charcoal mb-2">
                Configura i tuoi pagamenti
              </h2>
              <p className="text-gray-500 mb-6">
                Per ricevere pagamenti dai coachee, devi collegare il tuo conto bancario tramite Stripe.
              </p>
              
              {error && (
                <div className="bg-red-50 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              <button
                onClick={handleStartOnboarding}
                disabled={isCreating}
                className="btn bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Preparazione...
                  </>
                ) : accountStatus?.hasAccount ? (
                  <>
                    <RefreshCw size={18} />
                    Completa configurazione
                  </>
                ) : (
                  <>
                    <ExternalLink size={18} />
                    Inizia configurazione
                  </>
                )}
              </button>
            </div>
            
            {/* Vantaggi */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-charcoal mb-4">Come funziona</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="text-blue-500" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">Pagamenti sicuri</p>
                    <p className="text-sm text-gray-500">
                      Stripe è la piattaforma di pagamenti più sicura, usata da milioni di aziende
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Euro className="text-green-500" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">Ricevi il 70%</p>
                    <p className="text-sm text-gray-500">
                      Tratteniamo solo il 30% come commissione piattaforma
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="text-amber-500" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">Pagamento in 7 giorni</p>
                    <p className="text-sm text-gray-500">
                      I fondi vengono trasferiti automaticamente sul tuo conto dopo 7 giorni
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Info */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Cosa ti servirà:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>Documento d'identità</li>
                  <li>Codice fiscale o P.IVA</li>
                  <li>Coordinate bancarie (IBAN)</li>
                </ul>
              </div>
            </div>
            
            {/* Opzione salta */}
            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <p className="text-gray-600 text-sm mb-2">
                <strong>Non hai la Partita IVA?</strong> Nessun problema!
              </p>
              <p className="text-gray-500 text-sm mb-4">
                Puoi ricevere i pagamenti tramite bonifico manuale da parte di CoachaMi. 
                Potrai configurare Stripe in qualsiasi momento dalle impostazioni.
              </p>
              <Link
                href="/coach/dashboard"
                className="text-primary-500 hover:text-primary-600 text-sm font-medium hover:underline"
              >
                Salta per ora e vai alla dashboard →
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
