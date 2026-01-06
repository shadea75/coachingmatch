// src/components/coach/StripeConnectSetup.tsx
// Componente per configurare Stripe Connect nella dashboard coach

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

type StripeStatus = {
  connected: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  onboardingComplete?: boolean
  actionRequired?: 'complete_onboarding' | 'verification_pending' | null
  email?: string
}

export default function StripeConnectSetup() {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Controlla lo stato all'avvio e dopo redirect da Stripe
  useEffect(() => {
    if (user?.uid) {
      checkStripeStatus()
    }
  }, [user?.uid])
  
  // Gestisci parametri URL dopo redirect da Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeParam = params.get('stripe')
    
    if (stripeParam === 'success') {
      // Ricarica stato dopo onboarding completato
      checkStripeStatus()
      // Pulisci URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (stripeParam === 'refresh') {
      // Link scaduto, genera nuovo
      handleRefreshLink()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])
  
  const checkStripeStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/stripe/connect/status?coachId=${user?.uid}`)
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      setError('Errore nel recupero dello stato')
    } finally {
      setLoading(false)
    }
  }
  
  const handleStartOnboarding = async () => {
    try {
      setActionLoading(true)
      setError(null)
      
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: user?.uid,
          coachEmail: user?.email,
          coachName: user?.displayName || '',
        })
      })
      
      const data = await res.json()
      
      if (data.alreadyConnected) {
        checkStripeStatus()
        return
      }
      
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Errore durante la configurazione')
      }
    } catch (err) {
      setError('Errore di connessione')
    } finally {
      setActionLoading(false)
    }
  }
  
  const handleRefreshLink = async () => {
    try {
      setActionLoading(true)
      setError(null)
      
      const res = await fetch('/api/stripe/connect/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: user?.uid })
      })
      
      const data = await res.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Errore durante la rigenerazione del link')
      }
    } catch (err) {
      setError('Errore di connessione')
    } finally {
      setActionLoading(false)
    }
  }
  
  const handleOpenDashboard = async () => {
    try {
      setActionLoading(true)
      
      const res = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: user?.uid })
      })
      
      const data = await res.json()
      
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        setError(data.error || 'Errore nell\'apertura della dashboard')
      }
    } catch (err) {
      setError('Errore di connessione')
    } finally {
      setActionLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        💳 Configurazione Pagamenti
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Non connesso */}
      {!status?.connected && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Collega il tuo account per ricevere pagamenti automatici dai tuoi coachee.
            I soldi verranno accreditati direttamente sul tuo conto.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Come funziona?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Clicca il pulsante qui sotto</li>
              <li>• Inserisci i tuoi dati (5-10 minuti)</li>
              <li>• Inizia a ricevere pagamenti automatici!</li>
            </ul>
          </div>
          
          <button
            onClick={handleStartOnboarding}
            disabled={actionLoading}
            className="w-full bg-[#635BFF] hover:bg-[#5046e5] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Caricamento...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
                Configura con Stripe
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center">
            Utilizziamo Stripe per gestire i pagamenti in modo sicuro.
            CoachaMi trattiene il 30% come commissione.
          </p>
        </div>
      )}
      
      {/* Onboarding incompleto */}
      {status?.connected && status?.actionRequired === 'complete_onboarding' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-medium text-yellow-900">Configurazione incompleta</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Devi completare la configurazione del tuo account Stripe per ricevere pagamenti.
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleRefreshLink}
            disabled={actionLoading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {actionLoading ? 'Caricamento...' : 'Completa configurazione'}
          </button>
        </div>
      )}
      
      {/* Verifica in corso */}
      {status?.connected && status?.actionRequired === 'verification_pending' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <h4 className="font-medium text-blue-900">Verifica in corso</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Stripe sta verificando i tuoi dati. Di solito richiede 1-2 giorni lavorativi.
                  Ti invieremo un'email quando sarà tutto pronto.
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={checkStripeStatus}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Aggiorna stato
          </button>
        </div>
      )}
      
      {/* Tutto ok! */}
      {status?.connected && status?.chargesEnabled && status?.payoutsEnabled && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className="font-medium text-green-900">Account attivo</h4>
                <p className="text-sm text-green-800 mt-1">
                  Sei pronto a ricevere pagamenti! I tuoi guadagni verranno accreditati 
                  automaticamente sul tuo conto ogni settimana.
                </p>
                {status.email && (
                  <p className="text-xs text-green-700 mt-2">
                    Account: {status.email}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleOpenDashboard}
            disabled={actionLoading}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {actionLoading ? 'Apertura...' : 'Visualizza guadagni su Stripe'}
          </button>
          
          <p className="text-xs text-gray-500 text-center">
            Dalla dashboard Stripe puoi vedere tutti i tuoi incassi, 
            i payout programmati e scaricare i report.
          </p>
        </div>
      )}
    </div>
  )
}
