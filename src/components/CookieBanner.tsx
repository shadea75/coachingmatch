'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Cookie, ChevronDown, ChevronUp } from 'lucide-react'

type ConsentStatus = 'pending' | 'accepted_all' | 'accepted_necessary' | 'customized'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = 'coachami_cookie_consent'

function loadConsent(): { status: ConsentStatus; prefs: CookiePreferences } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveConsent(status: ConsentStatus, prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, prefs }))
}

export function enableAnalytics() {
  // Attiva Google Analytics e Google Ads
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
  }
}

export function disableAnalytics() {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [prefs, setPrefs] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const saved = loadConsent()
    if (!saved) {
      setVisible(true)
      // Default: tutto negato finché non c'è consenso
      disableAnalytics()
    } else {
      if (saved.prefs.analytics) enableAnalytics()
      else disableAnalytics()
    }
  }, [])

  const acceptAll = () => {
    const allPrefs: CookiePreferences = { necessary: true, analytics: true, marketing: true }
    saveConsent('accepted_all', allPrefs)
    enableAnalytics()
    setVisible(false)
  }

  const acceptNecessary = () => {
    const minPrefs: CookiePreferences = { necessary: true, analytics: false, marketing: false }
    saveConsent('accepted_necessary', minPrefs)
    disableAnalytics()
    setVisible(false)
  }

  const saveCustom = () => {
    saveConsent('customized', prefs)
    if (prefs.analytics) enableAnalytics()
    else disableAnalytics()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[9999]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-primary-500 px-5 py-4 flex items-center gap-3">
              <Cookie size={20} className="text-white flex-shrink-0" />
              <p className="text-white font-semibold text-sm">Utilizziamo i cookie</p>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Usiamo cookie tecnici necessari al funzionamento del sito e, con il tuo consenso, cookie analitici e di marketing per migliorare la tua esperienza.
                Leggi la nostra{' '}
                <Link href="/privacy" className="text-primary-500 hover:underline font-medium">
                  Privacy Policy
                </Link>
                {' '}e la{' '}
                <Link href="/cookie-policy" className="text-primary-500 hover:underline font-medium">
                  Cookie Policy
                </Link>.
              </p>

              {/* Dettagli personalizzazione */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-charcoal transition-colors"
              >
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showDetails ? 'Nascondi preferenze' : 'Personalizza preferenze'}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {[
                      {
                        key: 'necessary' as const,
                        label: 'Necessari',
                        desc: 'Autenticazione, sessioni, preferenze. Non disattivabili.',
                        locked: true,
                      },
                      {
                        key: 'analytics' as const,
                        label: 'Analitici',
                        desc: 'Google Analytics — statistiche di utilizzo anonime.',
                        locked: false,
                      },
                      {
                        key: 'marketing' as const,
                        label: 'Marketing',
                        desc: 'Google Ads — pubblicità personalizzata.',
                        locked: false,
                      },
                    ].map(item => (
                      <div key={item.key} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-xs font-semibold text-charcoal">{item.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          disabled={item.locked}
                          onClick={() => !item.locked && setPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                          className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${
                            prefs[item.key] ? 'bg-primary-500' : 'bg-gray-200'
                          } ${item.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              prefs[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={saveCustom}
                      className="w-full py-2 bg-charcoal text-white text-sm font-semibold rounded-xl hover:bg-charcoal/90 transition-colors"
                    >
                      Salva preferenze
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={acceptNecessary}
                className="flex-1 py-2.5 border border-gray-200 text-charcoal text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Solo necessari
              </button>
              <button
                onClick={acceptAll}
                className="flex-1 py-2.5 bg-primary-500 text-white text-sm font-bold rounded-xl hover:bg-primary-600 transition-colors"
              >
                Accetta tutti
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook per verificare il consenso dall'esterno
export function useCookieConsent() {
  const [consent, setConsent] = useState<{ status: ConsentStatus; prefs: CookiePreferences } | null>(null)

  useEffect(() => {
    setConsent(loadConsent())
  }, [])

  return consent
}
