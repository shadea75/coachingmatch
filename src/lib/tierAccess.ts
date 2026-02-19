// src/lib/tierAccess.ts
// Controlla le funzionalità disponibili per ogni piano coach

export type CoachTier = 'starter' | 'professional' | 'business' | 'elite'

export const TIER_CONFIG: Record<CoachTier, {
  name: string
  monthlyPrice: number
  matchLimit: number // 0 = illimitato
  commissionPercent: number // piattaforma
  coachPercent: number
  hasVirtualOffice: boolean
  hasExternalCRM: boolean
  hasCalendarSync: boolean
  hasEarningsReport: boolean
  hasVerifiedBadge: boolean
  hasElectronicInvoicing: boolean
  hasDigitalProducts: boolean
  hasAutoContracts: boolean
  hasAdvancedAnalytics: boolean
  hasPrioritySupport: boolean
  hasPremiumProfile: boolean
  hasBlogAccess: boolean
  hasWebinarAccess: boolean
  hasDedicatedManager: boolean
  hasEarlyAccess: boolean
}> = {
  starter: {
    name: 'Starter',
    monthlyPrice: 9,
    matchLimit: 5,
    commissionPercent: 30,
    coachPercent: 70,
    hasVirtualOffice: false,
    hasExternalCRM: false,
    hasCalendarSync: false,
    hasEarningsReport: false,
    hasVerifiedBadge: false,
    hasElectronicInvoicing: false,
    hasDigitalProducts: false,
    hasAutoContracts: true,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    hasPremiumProfile: false,
    hasBlogAccess: false,
    hasWebinarAccess: false,
    hasDedicatedManager: false,
    hasEarlyAccess: false,
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 29,
    matchLimit: 0, // illimitato
    commissionPercent: 30,
    coachPercent: 70,
    hasVirtualOffice: true,
    hasExternalCRM: true,
    hasCalendarSync: true,
    hasEarningsReport: true,
    hasVerifiedBadge: false,
    hasElectronicInvoicing: false,
    hasDigitalProducts: false,
    hasAutoContracts: false,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    hasPremiumProfile: false,
    hasBlogAccess: false,
    hasWebinarAccess: false,
    hasDedicatedManager: false,
    hasEarlyAccess: false,
  },
  business: {
    name: 'Business',
    monthlyPrice: 49,
    matchLimit: 0,
    commissionPercent: 30,
    coachPercent: 70,
    hasVirtualOffice: true,
    hasExternalCRM: true,
    hasCalendarSync: true,
    hasEarningsReport: true,
    hasVerifiedBadge: true,
    hasElectronicInvoicing: true,
    hasDigitalProducts: true,
    hasAutoContracts: true,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasPremiumProfile: false,
    hasBlogAccess: false,
    hasWebinarAccess: false,
    hasDedicatedManager: false,
    hasEarlyAccess: false,
  },
  elite: {
    name: 'Elite',
    monthlyPrice: 79,
    matchLimit: 0,
    commissionPercent: 20,
    coachPercent: 80,
    hasVirtualOffice: true,
    hasExternalCRM: true,
    hasCalendarSync: true,
    hasEarningsReport: true,
    hasVerifiedBadge: true,
    hasElectronicInvoicing: true,
    hasDigitalProducts: true,
    hasAutoContracts: true,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasPremiumProfile: true,
    hasBlogAccess: true,
    hasWebinarAccess: true,
    hasDedicatedManager: true,
    hasEarlyAccess: true,
  },
}

export function getTierConfig(tier?: string | null) {
  return TIER_CONFIG[(tier as CoachTier) || 'starter'] || TIER_CONFIG.starter
}

export function getCommissionSplit(tier?: string | null) {
  const config = getTierConfig(tier)
  return {
    coachPercent: config.coachPercent,
    platformPercent: config.commissionPercent,
  }
}

export function getMatchLimit(tier?: string | null): number {
  return getTierConfig(tier).matchLimit
}

export function hasFeature(tier: string | null | undefined, feature: keyof typeof TIER_CONFIG['starter']): boolean {
  const config = getTierConfig(tier)
  return !!config[feature]
}

// Restituisce il piano minimo richiesto per una funzionalità
export function minimumTierFor(feature: keyof typeof TIER_CONFIG['starter']): CoachTier {
  const tiers: CoachTier[] = ['starter', 'professional', 'business', 'elite']
  for (const tier of tiers) {
    if (TIER_CONFIG[tier][feature]) return tier
  }
  return 'elite'
}
