'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Briefcase,
  Heart,
  Users,
  HeartHandshake,
  TrendingUp,
  PartyPopper,
  PiggyBank,
  Star,
  Check
} from 'lucide-react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { LIFE_AREAS, LifeAreaId, OBJECTIVES_BY_AREA } from '@/types'
import { getAreaSubtitle } from '@/lib/areaDescriptions'
import ScoreSelector from '@/components/ScoreSelector'
import ObjectivesSelector from '@/components/ObjectivesSelector'
import RadarChart from '@/components/RadarChart'
import Logo from '@/components/Logo'

// Icon mapping
const AREA_ICONS: Record<LifeAreaId, typeof Briefcase> = {
  salute: Heart,
  finanze: PiggyBank,
  carriera: Briefcase,
  relazioni: Users,
  amore: HeartHandshake,
  crescita: TrendingUp,
  spiritualita: Star,
  divertimento: PartyPopper
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, signUp, updateUserProfile } = useAuth()
  const { 
    state, 
    setAreaScore, 
    setObjectives, 
    nextArea, 
    prevArea, 
    goToStep,
    getProgress,
    getCurrentArea
  } = useOnboarding()
  
  const [currentObjectiveAreaIndex, setCurrentObjectiveAreaIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Registration form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    codiceFiscale: '',
    acceptTerms: false
  })
  const [formError, setFormError] = useState('')
  
  const currentArea = getCurrentArea()
  const progress = getProgress()
  
  // Handle area score selection
  const handleScoreSelect = (score: number) => {
    if (currentArea) {
      setAreaScore(currentArea.id, score)
    }
  }
  
  // Handle next button
  const handleNext = () => {
    if (state.currentStep === 'areas') {
      if (currentArea && state.areaScores[currentArea.id]) {
        nextArea()
      }
    } else if (state.currentStep === 'objectives') {
      if (currentObjectiveAreaIndex < state.areasToImprove.length - 1) {
        setCurrentObjectiveAreaIndex(prev => prev + 1)
      } else {
        goToStep('registration')
      }
    }
  }
  
  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)
    
    if (!formData.acceptTerms) {
      setFormError('Devi accettare i termini di servizio')
      setIsSubmitting(false)
      return
    }
    
    try {
      await signUp(formData.email, formData.password, formData.name)
      
      // Try to save onboarding data, but don't block if it fails
      try {
        await updateUserProfile({
          areaScores: state.areaScores as Record<LifeAreaId, number>,
          selectedObjectives: state.selectedObjectives as Record<LifeAreaId, string[]>,
          onboardingCompleted: true,
          // Nuovi campi
          age: formData.age ? parseInt(formData.age) : null,
          gender: (formData.gender || null) as 'M' | 'F' | 'other' | 'prefer_not' | null,
          codiceFiscale: formData.codiceFiscale || null,
        })
      } catch (profileError) {
        console.log('Profile update skipped:', profileError)
        // Continue anyway - user is created
      }
      
      // Always go to results after successful signup
      setIsSubmitting(false)
      goToStep('results')
    } catch (error: any) {
      setFormError(error.message || 'Errore durante la registrazione')
      setIsSubmitting(false)
    }
  }
  
  // Skip to matching if user already logged in
  useEffect(() => {
    if (user && user.onboardingCompleted) {
      router.push('/matching')
    }
  }, [user, router])
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                if (state.currentStep === 'areas' && state.currentAreaIndex > 0) {
                  prevArea()
                } else if (state.currentStep === 'objectives' && currentObjectiveAreaIndex > 0) {
                  setCurrentObjectiveAreaIndex(prev => prev - 1)
                } else if (state.currentStep === 'objectives') {
                  goToStep('areas')
                } else if (state.currentStep === 'registration') {
                  goToStep('objectives')
                } else {
                  router.push('/')
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            
            <Logo size="sm" />
            
            <div className="w-9" /> {/* Spacer */}
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-28 pb-32 px-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: Area Evaluation */}
          {state.currentStep === 'areas' && currentArea && (
            <motion.div
              key={`area-${currentArea.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              {/* Area indicator */}
              <div className="text-center mb-8">
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                  style={{ 
                    backgroundColor: `${currentArea.color}15`,
                    color: currentArea.color 
                  }}
                >
                  {(() => {
                    const Icon = AREA_ICONS[currentArea.id]
                    return <Icon size={18} />
                  })()}
                  {state.currentAreaIndex + 1} di {LIFE_AREAS.length}
                </div>
                
                <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal mb-2">
                  {currentArea.label}
                </h1>
                
                <p className="text-sm text-gray-400 italic mb-4">
                  {getAreaSubtitle(currentArea.id)}
                </p>
                
                <p className="text-gray-500 text-lg">
                  Come valuteresti quest'area della tua vita in questo momento?
                </p>
              </div>
              
              {/* Score selector */}
              <ScoreSelector
                value={state.areaScores[currentArea.id]}
                onChange={handleScoreSelect}
                color={currentArea.color}
                areaId={currentArea.id}
              />
              
              {/* Mini radar preview */}
              <div className="mt-8 flex justify-center">
                <div className="opacity-80">
                  <RadarChart 
                    scores={state.areaScores} 
                    size={280}
                    showLabels={false}
                  />
                </div>
              </div>
            </motion.div>
          )}
          
          {/* STEP 2: Objectives Selection */}
          {state.currentStep === 'objectives' && state.areasToImprove.length > 0 && (
            <motion.div
              key={`objectives-${state.areasToImprove[currentObjectiveAreaIndex]}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <ObjectivesSelector
                area={state.areasToImprove[currentObjectiveAreaIndex]}
                currentScore={state.areaScores[state.areasToImprove[currentObjectiveAreaIndex]] || 5}
                selectedObjectives={state.selectedObjectives[state.areasToImprove[currentObjectiveAreaIndex]] || []}
                onChange={(objectives) => setObjectives(state.areasToImprove[currentObjectiveAreaIndex], objectives)}
              />
              
              {/* Skip option */}
              <div className="text-center mt-6">
                <button
                  onClick={handleNext}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {currentObjectiveAreaIndex < state.areasToImprove.length - 1 
                    ? 'Salta quest\'area' 
                    : 'Continua senza selezionare'}
                </button>
              </div>
            </motion.div>
          )}
          
          {/* STEP 3: Registration */}
          {state.currentStep === 'registration' && (
            <motion.div
              key="registration"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal mb-3">
                  Quasi fatto!
                </h1>
                <p className="text-gray-500">
                  Crea il tuo account per vedere i coach selezionati per te
                </p>
              </div>
              
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="label">Nome</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Il tuo nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="nome@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Minimo 8 caratteri"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={8}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Età</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Es: 35"
                      min={18}
                      max={100}
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="label">Sesso</label>
                    <select
                      className="input"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Seleziona</option>
                      <option value="M">Uomo</option>
                      <option value="F">Donna</option>
                      <option value="other">Altro</option>
                      <option value="prefer_not">Preferisco non dire</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="label">
                    Codice Fiscale <span className="text-gray-400 font-normal">(opzionale, per fatturazione)</span>
                  </label>
                  <input
                    type="text"
                    className="input uppercase"
                    placeholder="RSSMRA85M01H501Z"
                    maxLength={16}
                    value={formData.codiceFiscale}
                    onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value.toUpperCase() })}
                  />
                </div>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    Accetto i{' '}
                    <a href="/terms" className="text-primary-500 hover:underline">
                      Termini di Servizio
                    </a>{' '}
                    e la{' '}
                    <a href="/privacy" className="text-primary-500 hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                </div>
                
                {formError && (
                  <p className="text-red-500 text-sm">{formError}</p>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn btn-primary py-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creazione account...' : 'Crea account'}
                </button>
                
                <p className="text-center text-sm text-gray-500">
                  Hai già un account?{' '}
                  <a href="/login" className="text-primary-500 hover:underline">
                    Accedi
                  </a>
                </p>
              </form>
            </motion.div>
          )}
          
          {/* STEP 4: Results */}
          {state.currentStep === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 mb-4">
                  <Check size={32} strokeWidth={3} />
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal mb-3">
                  Ecco la tua valutazione!
                </h1>
                <p className="text-gray-500">
                  Questa è una fotografia delle aree della tua vita
                </p>
              </div>
              
              {/* Radar Chart */}
              <div className="flex justify-center mb-8">
                <RadarChart 
                  scores={state.areaScores} 
                  size={350}
                  showLabels={true}
                />
              </div>
              
              {/* Area scores list */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {LIFE_AREAS.map(area => {
                  const score = state.areaScores[area.id] || 0
                  return (
                    <div 
                      key={area.id}
                      className="flex items-center justify-between p-3 bg-white rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: area.color }}
                        />
                        <span className="text-sm text-gray-600">
                          {area.label.split(' ')[0]}
                        </span>
                      </div>
                      <span 
                        className="font-semibold"
                        style={{ color: area.color }}
                      >
                        {score}/10
                      </span>
                    </div>
                  )
                })}
              </div>
              
              <button
                onClick={() => router.push('/matching')}
                className="btn btn-primary text-lg px-8 py-4"
              >
                Scopri i coach per te
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Footer with Next button */}
      {(state.currentStep === 'areas' || state.currentStep === 'objectives') && (
        <footer className="fixed bottom-0 left-0 right-0 glass border-t border-gray-100 p-4">
          <div className="max-w-xl mx-auto">
            <button
              onClick={handleNext}
              disabled={
                state.currentStep === 'areas' && currentArea && !state.areaScores[currentArea.id] ? true : false
              }
              className="w-full btn btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continua
              <ArrowRight size={20} />
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
