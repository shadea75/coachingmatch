'use client'

// src/components/TierGate.tsx
// Componente gate per funzionalità bloccate per piano.
// Uso: avvolgi il contenuto della pagina con <TierGate feature="hasCalendarSync">

import Link from 'next/link'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import { TIER_CONFIG, getTierConfig, minimumTierFor } from '@/lib/tierAccess'
import type { CoachTier } from '@/lib/tierAccess'

const TIER_LABELS: Record<CoachTier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
  elite: 'Elite',
}

const TIER_COLORS: Record<CoachTier, { bg: string; border: string; badge: string; text: string }> = {
  starter:      { bg: 'bg-gray-50',    border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700',       text: 'text-gray-900' },
  professional: { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',       text: 'text-blue-900' },
  business:     { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700',   text: 'text-violet-900' },
  elite:        { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',     text: 'text-amber-900' },
}

const FEATURE_LABELS: Partial<Record<keyof typeof TIER_CONFIG['starter'], string>> = {
  hasCalendarSync:         'Sincronizzazione Google Calendar',
  hasEarningsReport:       'Report Guadagni',
  hasElectronicInvoicing:  'Fatturazione Elettronica',
  hasDigitalProducts:      'Prodotti Digitali',
  hasVirtualOffice:        'Ufficio Virtuale',
  hasAdvancedAnalytics:    'Analytics Avanzate',
  hasAutoContracts:        'Contratti Automatici',
  hasVerifiedBadge:        'Badge Verificato',
}

interface TierGateProps {
  /** Feature key da tierAccess.ts */
  feature: keyof typeof TIER_CONFIG['starter']
  /** Tier attuale del coach (stringa da Firestore) */
  currentTier: string | null | undefined
  /** Se true, mostra solo un banner in cima senza nascondere il contenuto */
  bannerOnly?: boolean
  children: React.ReactNode
}

export default function TierGate({
  feature,
  currentTier,
  bannerOnly = false,
  children,
}: TierGateProps) {
  const config = getTierConfig(currentTier)
  const hasAccess = !!config[feature]

  if (hasAccess) return <>{children}</>

  const requiredTier = minimumTierFor(feature)
  const colors = TIER_COLORS[requiredTier]
  const featureLabel = FEATURE_LABELS[feature] || String(feature)
  const requiredPrice = TIER_CONFIG[requiredTier].monthlyPrice

  const UpgradeCard = (
    <div className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-8 text-center max-w-md mx-auto`}>
      {/* Icona lock */}
      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-5">
        <Lock size={28} className="text-gray-400" />
      </div>

      {/* Badge piano richiesto */}
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mb-4 ${colors.badge}`}>
        <Sparkles size={14} />
        Piano {TIER_LABELS[requiredTier]} richiesto
      </span>

      <h2 className={`text-xl font-bold mb-2 ${colors.text}`}>
        {featureLabel}
      </h2>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        Questa funzionalità è disponibile dal piano{' '}
        <strong>{TIER_LABELS[requiredTier]}</strong> (da €{requiredPrice}/mese).
        Fai l'upgrade per sbloccarla.
      </p>

      {/* Confronto piani mini */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 mb-6 text-left text-sm">
        {(['starter', 'professional', 'business', 'elite'] as CoachTier[]).map(tier => {
          const tierCfg = TIER_CONFIG[tier]
          const tierHas = !!tierCfg[feature]
          const isCurrent = tier === (currentTier || 'starter')
          const isRequired = tier === requiredTier
          return (
            <div
              key={tier}
              className={`flex items-center justify-between px-4 py-2.5 ${isRequired ? `${colors.bg} font-semibold` : ''}`}
            >
              <span className="flex items-center gap-2">
                {isCurrent && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                    Il tuo piano
                  </span>
                )}
                {TIER_LABELS[tier]} — €{tierCfg.monthlyPrice}/mese
              </span>
              {tierHas
                ? <span className="text-green-500 font-bold text-base">✓</span>
                : <span className="text-gray-300 text-base">✗</span>
              }
            </div>
          )
        })}
      </div>

      <Link
        href="/coach/subscription"
        className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        Vedi i piani
        <ArrowRight size={16} />
      </Link>

      <p className="mt-3 text-xs text-gray-400">
        Puoi cambiare piano in qualsiasi momento
      </p>
    </div>
  )

  if (bannerOnly) {
    return (
      <>
        {/* Banner top */}
        <div className={`rounded-xl border ${colors.border} ${colors.bg} px-4 py-3 flex items-center justify-between mb-6`}>
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700">
              <strong>{featureLabel}</strong> richiede il piano{' '}
              <strong>{TIER_LABELS[requiredTier]}</strong> (€{requiredPrice}/mese)
            </span>
          </div>
          <Link
            href="/coach/subscription"
            className={`shrink-0 text-sm font-semibold ${colors.text} hover:underline flex items-center gap-1`}
          >
            Upgrade <ArrowRight size={13} />
          </Link>
        </div>
        {children}
      </>
    )
  }

  // Full gate: sostituisce l'intera pagina con la upgrade card
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      {UpgradeCard}
    </div>
  )
}
