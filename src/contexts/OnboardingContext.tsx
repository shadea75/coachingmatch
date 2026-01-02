'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { OnboardingState, LifeAreaId, LIFE_AREAS, OBJECTIVES_BY_AREA } from '@/types'

interface OnboardingContextType {
  state: OnboardingState
  setAreaScore: (area: LifeAreaId, score: number) => void
  setObjectives: (area: LifeAreaId, objectives: string[]) => void
  nextArea: () => void
  prevArea: () => void
  goToStep: (step: OnboardingState['currentStep']) => void
  selectAreasToImprove: (areas: LifeAreaId[]) => void
  getCurrentArea: () => typeof LIFE_AREAS[number] | null
  getProgress: () => number
  reset: () => void
}

const initialState: OnboardingState = {
  currentStep: 'areas',
  currentAreaIndex: 0,
  areaScores: {},
  selectedObjectives: {},
  areasToImprove: []
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState)

  const setAreaScore = useCallback((area: LifeAreaId, score: number) => {
    setState(prev => ({
      ...prev,
      areaScores: { ...prev.areaScores, [area]: score }
    }))
  }, [])

  const setObjectives = useCallback((area: LifeAreaId, objectives: string[]) => {
    setState(prev => ({
      ...prev,
      selectedObjectives: { ...prev.selectedObjectives, [area]: objectives }
    }))
  }, [])

  const nextArea = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentAreaIndex + 1
      
      if (nextIndex >= LIFE_AREAS.length) {
        // Completato tutte le aree, passa agli obiettivi
        // Identifica le aree con punteggio più basso (< 7)
        const lowScoreAreas = LIFE_AREAS
          .filter(area => (prev.areaScores[area.id] || 5) < 7)
          .map(area => area.id)
        
        return {
          ...prev,
          currentStep: 'objectives',
          areasToImprove: lowScoreAreas.length > 0 ? lowScoreAreas : [LIFE_AREAS[0].id]
        }
      }
      
      return { ...prev, currentAreaIndex: nextIndex }
    })
  }, [])

  const prevArea = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentAreaIndex: Math.max(0, prev.currentAreaIndex - 1)
    }))
  }, [])

  const goToStep = useCallback((step: OnboardingState['currentStep']) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }, [])

  const selectAreasToImprove = useCallback((areas: LifeAreaId[]) => {
    setState(prev => ({ ...prev, areasToImprove: areas }))
  }, [])

  const getCurrentArea = useCallback(() => {
    if (state.currentStep !== 'areas') return null
    return LIFE_AREAS[state.currentAreaIndex] || null
  }, [state.currentStep, state.currentAreaIndex])

  const getProgress = useCallback(() => {
    if (state.currentStep === 'areas') {
      return ((state.currentAreaIndex + 1) / LIFE_AREAS.length) * 50
    }
    if (state.currentStep === 'objectives') {
      return 60
    }
    if (state.currentStep === 'registration') {
      return 80
    }
    if (state.currentStep === 'results') {
      return 90
    }
    return 100
  }, [state.currentStep, state.currentAreaIndex])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <OnboardingContext.Provider value={{
      state,
      setAreaScore,
      setObjectives,
      nextArea,
      prevArea,
      goToStep,
      selectAreasToImprove,
      getCurrentArea,
      getProgress,
      reset
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
