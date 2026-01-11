'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Check,
  Download,
  Users,
  Mail,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Star,
  ChevronRight
} from 'lucide-react'
import { LIFE_AREAS, LifeAreaId } from '@/types'
import { AreaIllustrations } from '@/components/AreaIllustrations'
import RadarChart from '@/components/RadarChart'
import Logo from '@/components/Logo'
import { 
  generateFullAnalysis, 
  getScoreBand,
  FullAnalysis 
} from '@/lib/lifeScoreInterpretation'

// Steps del test
type TestStep = 'intro' | 'scoring' | 'priority' | 'results' | 'email'

// Area labels in italiano
const AREA_LABELS: Record<LifeAreaId, string> = {
  salute: 'Salute e Vitalità',
  finanze: 'Finanze',
  carriera: 'Carriera e Lavoro',
  relazioni: 'Relazioni e Amicizie',
  amore: 'Amore',
  crescita: 'Crescita Personale',
  spiritualita: 'Spiritualità',
  divertimento: 'Divertimento'
}

// Descrizioni brevi per ogni area
const AREA_DESCRIPTIONS: Record<LifeAreaId, string> = {
  salute: 'Energia, benessere fisico, alimentazione, sonno',
  finanze: 'Stabilità economica, risparmio, rapporto col denaro',
  carriera: 'Lavoro, crescita professionale, soddisfazione',
  relazioni: 'Amicizie, famiglia, connessioni significative',
  amore: 'Relazione romantica, intimità, vita di coppia',
  crescita: 'Autostima, apprendimento, sviluppo personale',
  spiritualita: 'Scopo, valori, senso di significato',
  divertimento: 'Hobby, svago, tempo libero, gioia'
}

export default function TestGratuitoPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<TestStep>('intro')
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0)
  const [scores, setScores] = useState<Record<LifeAreaId, number>>({} as Record<LifeAreaId, number>)
  const [priorityArea, setPriorityArea] = useState<LifeAreaId | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null)
  
  // Calcola il Life Score medio
  const lifeScore = Object.values(scores).length > 0 
    ? (Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1)
    : '0'
  
  // Genera analisi completa quando arriviamo ai risultati
  useEffect(() => {
    if (currentStep === 'results' && Object.keys(scores).length === 8 && priorityArea) {
      const fullAnalysis = generateFullAnalysis(scores, priorityArea)
      setAnalysis(fullAnalysis)
    }
  }, [currentStep, scores, priorityArea])
  
  // Trova area più forte e più debole
  const sortedAreas = Object.entries(scores).sort(([,a], [,b]) => b - a)
  const strongestArea = sortedAreas[0]?.[0] as LifeAreaId | undefined
  const weakestArea = sortedAreas[sortedAreas.length - 1]?.[0] as LifeAreaId | undefined
  
  // Progress bar
  const getProgress = () => {
    if (currentStep === 'intro') return 0
    if (currentStep === 'scoring') return ((currentAreaIndex + 1) / LIFE_AREAS.length) * 60
    if (currentStep === 'priority') return 70
    if (currentStep === 'results') return 85
    if (currentStep === 'email') return 100
    return 0
  }
  
  // Gestione punteggio area
  const handleScoreSelect = (score: number) => {
    const areaId = LIFE_AREAS[currentAreaIndex].id as LifeAreaId
    setScores(prev => ({ ...prev, [areaId]: score }))
  }
  
  // Prossima area o prossimo step
  const handleNext = () => {
    if (currentStep === 'scoring') {
      if (currentAreaIndex < LIFE_AREAS.length - 1) {
        setCurrentAreaIndex(prev => prev + 1)
      } else {
        setCurrentStep('priority')
      }
    }
  }
  
  // Area precedente
  const handlePrev = () => {
    if (currentStep === 'scoring' && currentAreaIndex > 0) {
      setCurrentAreaIndex(prev => prev - 1)
    } else if (currentStep === 'priority') {
      setCurrentStep('scoring')
      setCurrentAreaIndex(LIFE_AREAS.length - 1)
    } else if (currentStep === 'results') {
      setCurrentStep('priority')
    } else if (currentStep === 'email') {
      setCurrentStep('results')
    }
  }
  
  // Seleziona area prioritaria
  const handlePrioritySelect = (areaId: LifeAreaId) => {
    setPriorityArea(areaId)
    setCurrentStep('results')
  }
  
  // Invia email per report completo
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Qui invieresti i dati al backend per:
      // 1. Salvare il lead nel database
      // 2. Inviare email con PDF report
      await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          scores,
          priorityArea,
          lifeScore
        })
      })
      
      setEmailSent(true)
    } catch (error) {
      console.error('Errore invio:', error)
      // Mostra comunque successo per UX (gestiremo errori lato server)
      setEmailSent(true)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Componente Slider Score
  const ScoreSlider = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-gray-500">
        <span>1 - Molto insoddisfatto</span>
        <span>10 - Completamente soddisfatto</span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min="1"
          max="10"
          value={value || 5}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-500"
          style={{
            background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${((value || 5) - 1) * 11.11}%, #E5E7EB ${((value || 5) - 1) * 11.11}%, #E5E7EB 100%)`
          }}
        />
      </div>
      
      <div className="flex justify-center">
        <div className="text-4xl font-bold text-primary-600">
          {value || '?'}
        </div>
      </div>
      
      {/* Quick select buttons */}
      <div className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
              value === num 
                ? 'bg-primary-500 text-white scale-110' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  )
  
  const currentArea = LIFE_AREAS[currentAreaIndex]
  const currentScore = currentArea ? scores[currentArea.id as LifeAreaId] : undefined
  const AreaIllustration = currentArea ? AreaIllustrations[currentArea.id] : null
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                if (currentStep === 'intro') {
                  router.push('/')
                } else {
                  handlePrev()
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            
            <Logo size="sm" />
            
            <div className="w-9" />
          </div>
          
          {/* Progress bar */}
          {currentStep !== 'intro' && (
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${getProgress()}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-24 pb-32 px-4">
        <AnimatePresence mode="wait">
          
          {/* INTRO */}
          {currentStep === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto text-center"
            >
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 text-primary-500 mb-6">
                  <Sparkles size={40} />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
                  Scopri la tua<br />
                  <span className="text-primary-500">Ruota della Vita</span>
                </h1>
                
                <p className="text-lg text-gray-600 mb-6">
                  Un test gratuito di 2 minuti per capire quali aree della tua vita 
                  meritano più attenzione.
                </p>
              </div>
              
              {/* Benefits */}
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-8 text-left">
                <h3 className="font-semibold text-charcoal mb-4">Cosa scoprirai:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-green-600" />
                    </div>
                    <span className="text-gray-600">Il tuo Life Score complessivo</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-green-600" />
                    </div>
                    <span className="text-gray-600">La tua area più forte e quella da migliorare</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-green-600" />
                    </div>
                    <span className="text-gray-600">Un grafico visivo della tua situazione attuale</span>
                  </li>
                </ul>
              </div>
              
              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-8">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>+500 test completati</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⏱️</span>
                  <span>2 minuti</span>
                </div>
              </div>
              
              <button
                onClick={() => setCurrentStep('scoring')}
                className="w-full btn btn-primary py-4 text-lg"
              >
                Inizia il test gratuito
                <ArrowRight size={20} />
              </button>
              
              <p className="text-xs text-gray-400 mt-4">
                Nessuna registrazione richiesta per vedere i risultati
              </p>
            </motion.div>
          )}
          
          {/* SCORING - Una area alla volta */}
          {currentStep === 'scoring' && currentArea && (
            <motion.div
              key={`scoring-${currentArea.id}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-lg mx-auto"
            >
              {/* Area counter */}
              <div className="text-center mb-2">
                <span className="text-sm text-gray-500">
                  Area {currentAreaIndex + 1} di {LIFE_AREAS.length}
                </span>
              </div>
              
              {/* Area illustration */}
              <div className="flex justify-center mb-4">
                {AreaIllustration && <AreaIllustration size={140} />}
              </div>
              
              {/* Area name and description */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold text-charcoal mb-2">
                  {AREA_LABELS[currentArea.id as LifeAreaId]}
                </h2>
                <p className="text-gray-500">
                  {AREA_DESCRIPTIONS[currentArea.id as LifeAreaId]}
                </p>
              </div>
              
              {/* Question */}
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <p className="text-center text-gray-700 mb-6">
                  Quanto sei soddisfatto di quest'area della tua vita?
                </p>
                
                <ScoreSlider 
                  value={currentScore || 5}
                  onChange={handleScoreSelect}
                />
              </div>
            </motion.div>
          )}
          
          {/* PRIORITY - Scelta area prioritaria */}
          {currentStep === 'priority' && (
            <motion.div
              key="priority"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-500 mb-4">
                  <Target size={32} />
                </div>
                
                <h2 className="text-2xl font-display font-bold text-charcoal mb-3">
                  Su quale area vuoi<br />lavorare per prima?
                </h2>
                <p className="text-gray-500">
                  Indipendentemente dal punteggio, qual è la tua priorità?
                </p>
              </div>
              
              {/* Area selection grid */}
              <div className="grid grid-cols-2 gap-3">
                {LIFE_AREAS.map(area => {
                  const AreaIcon = AreaIllustrations[area.id]
                  const score = scores[area.id as LifeAreaId]
                  
                  return (
                    <button
                      key={area.id}
                      onClick={() => handlePrioritySelect(area.id as LifeAreaId)}
                      className={`relative bg-white rounded-xl p-4 border-2 transition-all hover:shadow-md ${
                        priorityArea === area.id 
                          ? 'border-primary-500 shadow-md' 
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        {AreaIcon && <AreaIcon size={60} />}
                        <span className="text-sm font-medium text-charcoal mt-2">
                          {AREA_LABELS[area.id as LifeAreaId].split(' ')[0]}
                        </span>
                        <span 
                          className="text-xs font-semibold mt-1"
                          style={{ color: area.color }}
                        >
                          {score}/10
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
          
          {/* RESULTS - Risultato immediato */}
          {currentStep === 'results' && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              {/* Header con emoji e titolo */}
              <div className="text-center mb-6">
                <span className="text-5xl mb-4 block">{analysis.scoreBand.emoji}</span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-charcoal mb-2">
                  {analysis.scoreBand.title}
                </h2>
                <p className="text-gray-500">
                  La tua Ruota della Vita
                </p>
              </div>
              
              {/* Life Score Card */}
              <div 
                className="rounded-2xl p-6 text-white text-center mb-6"
                style={{ background: `linear-gradient(135deg, ${analysis.scoreBand.color} 0%, ${analysis.scoreBand.color}dd 100%)` }}
              >
                <p className="text-white/80 text-sm mb-1">Il tuo Life Score</p>
                <p className="text-5xl font-bold mb-2">{analysis.lifeScore}<span className="text-2xl">/10</span></p>
                <p className="text-white/90 text-sm max-w-md mx-auto">
                  {analysis.scoreBand.description}
                </p>
              </div>
              
              {/* Radar Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex justify-center">
                  <RadarChart 
                    scores={scores} 
                    size={300}
                    showLabels={true}
                  />
                </div>
                <p className="text-center text-sm text-gray-500 mt-4">
                  {analysis.balanceInsight}
                </p>
              </div>
              
              {/* Archetipo */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{analysis.archetype.emoji}</span>
                  <div>
                    <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Il tuo profilo</p>
                    <h3 className="text-xl font-bold text-charcoal">{analysis.archetype.name}</h3>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  {analysis.archetype.description}
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                      <Star size={14} /> I tuoi punti di forza
                    </p>
                    <ul className="space-y-1">
                      {analysis.archetype.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                      <Zap size={14} /> Le tue sfide
                    </p>
                    <ul className="space-y-1">
                      {analysis.archetype.challenges.map((c, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-sm text-purple-800 italic">
                    💡 {analysis.archetype.advice}
                  </p>
                </div>
              </div>
              
              {/* Top 3 e Bottom 3 */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Aree forti */}
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Le tue aree più forti
                  </h4>
                  <div className="space-y-2">
                    {analysis.strongestAreas.map((area, i) => (
                      <div key={area.area} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                          <span className="text-sm text-gray-700">{area.label}</span>
                        </div>
                        <span className="font-bold text-green-600">{area.score}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Aree da migliorare */}
                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <TrendingDown size={18} />
                    Aree con più potenziale
                  </h4>
                  <div className="space-y-2">
                    {analysis.weakestAreas.map((area, i) => (
                      <div key={area.area} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{i === 0 ? '🎯' : i === 1 ? '📈' : '💪'}</span>
                          <span className="text-sm text-gray-700">{area.label}</span>
                        </div>
                        <span className="font-bold text-amber-600">{area.score}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Analisi area prioritaria */}
              {analysis.priorityAnalysis && priorityArea && (
                <div className="bg-primary-50 rounded-2xl p-6 mb-6 border border-primary-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Target size={24} className="text-primary-600" />
                    <div>
                      <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">La tua priorità</p>
                      <h3 className="text-xl font-bold text-charcoal">{AREA_LABELS[priorityArea]}</h3>
                    </div>
                    <span className="ml-auto text-2xl font-bold text-primary-600">{scores[priorityArea]}/10</span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {analysis.priorityAnalysis.interpretation}
                  </p>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm font-medium text-primary-700 mb-2">⚡ Azione immediata:</p>
                    <p className="text-gray-700">{analysis.priorityAnalysis.quickWin}</p>
                  </div>
                </div>
              )}
              
              {/* Messaggio di incoraggiamento */}
              <div className="bg-white rounded-xl p-4 mb-6 text-center border border-gray-100">
                <p className="text-gray-600 italic">
                  "{analysis.scoreBand.encouragement}"
                </p>
              </div>
              
              {/* CTA per report completo */}
              <div className="bg-gradient-to-br from-charcoal to-gray-800 rounded-2xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-2">
                  Vuoi trasformare questi insight in azione?
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  Ricevi gratis via email:
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-400" />
                    <span>Piano d'azione personalizzato per {priorityArea ? AREA_LABELS[priorityArea] : 'la tua priorità'}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-400" />
                    <span>Guida specifica per il profilo "{analysis.archetype.name}"</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-400" />
                    <span>Coach specializzati nel tuo obiettivo</span>
                  </li>
                </ul>
                
                <button
                  onClick={() => setCurrentStep('email')}
                  className="w-full bg-white text-charcoal font-semibold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={18} />
                  Ricevi il piano d'azione gratuito
                </button>
              </div>
              
              {/* Skip link */}
              <div className="text-center mt-4">
                <button
                  onClick={() => router.push('/coaches')}
                  className="text-sm text-gray-500 hover:text-primary-500 transition-colors"
                >
                  Salta e scopri i coach →
                </button>
              </div>
            </motion.div>
          )}
          
          {/* EMAIL - Form per report */}
          {currentStep === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto"
            >
              {!emailSent ? (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-500 mb-4">
                      <Download size={32} />
                    </div>
                    
                    <h2 className="text-2xl font-display font-bold text-charcoal mb-3">
                      Ricevi il tuo report
                    </h2>
                    <p className="text-gray-500">
                      Ti invieremo il PDF con l'analisi completa e i consigli personalizzati
                    </p>
                  </div>
                  
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Il tuo nome"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn btn-primary py-4 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Invio in corso...' : 'Invia il report'}
                    </button>
                    
                    <p className="text-xs text-center text-gray-400">
                      Niente spam, promesso. Potrai cancellarti in qualsiasi momento.
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
                    <Check size={40} />
                  </div>
                  
                  <h2 className="text-2xl font-display font-bold text-charcoal mb-3">
                    Report inviato! 🎉
                  </h2>
                  <p className="text-gray-500 mb-8">
                    Controlla la tua casella email (anche lo spam).
                    <br />Il report arriverà entro pochi minuti.
                  </p>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/coaches')}
                      className="w-full btn btn-primary py-4"
                    >
                      Scopri i coach per te
                      <ArrowRight size={18} />
                    </button>
                    
                    <button
                      onClick={() => router.push('/onboarding')}
                      className="w-full btn btn-secondary py-4"
                    >
                      Approfondisci con l'onboarding completo
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
        </AnimatePresence>
      </main>
      
      {/* Footer with Next button - solo per scoring */}
      {currentStep === 'scoring' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              disabled={!currentScore}
              className="w-full btn btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentAreaIndex < LIFE_AREAS.length - 1 ? 'Continua' : 'Vedi i risultati'}
              <ArrowRight size={20} />
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
