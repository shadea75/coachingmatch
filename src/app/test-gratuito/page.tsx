'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Check,
  Mail,
  Lock,
  Target,
  Gift
} from 'lucide-react'
import { LIFE_AREAS, LifeAreaId } from '@/types'
import { AreaIllustrations } from '@/components/AreaIllustrations'
import RadarChart from '@/components/RadarChart'
import Logo from '@/components/Logo'
import { 
  ARCHETYPES,
  CONFIRMATION_QUESTIONS,
  calculateArchetype,
  ArchetypeResult
} from '@/lib/archetypes'
import { getScoreBand, ScoreBand } from '@/lib/lifeScoreInterpretation'

// Steps del test
type TestStep = 'intro' | 'scoring' | 'questions' | 'priority' | 'results' | 'email' | 'success'

// Area labels
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
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, number>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [priorityArea, setPriorityArea] = useState<LifeAreaId | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [archetypeResult, setArchetypeResult] = useState<ArchetypeResult | null>(null)
  const [scoreBand, setScoreBand] = useState<ScoreBand | null>(null)
  
  // Calcola il Life Score medio
  const lifeScore = Object.values(scores).length > 0 
    ? (Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1)
    : '0'
  
  // Progress bar
  const getProgress = () => {
    if (currentStep === 'intro') return 0
    if (currentStep === 'scoring') return ((currentAreaIndex + 1) / LIFE_AREAS.length) * 50
    if (currentStep === 'questions') return 50 + ((currentQuestionIndex + 1) / CONFIRMATION_QUESTIONS.length) * 15
    if (currentStep === 'priority') return 70
    if (currentStep === 'results') return 80
    if (currentStep === 'email') return 90
    if (currentStep === 'success') return 100
    return 0
  }
  
  // Calcola archetipo quando arriviamo ai risultati
  useEffect(() => {
    if (currentStep === 'results' && Object.keys(scores).length === 8) {
      const result = calculateArchetype(scores, questionAnswers)
      setArchetypeResult(result)
      setScoreBand(getScoreBand(parseFloat(lifeScore)))
    }
  }, [currentStep, scores, questionAnswers, lifeScore])
  
  // Gestione punteggio area
  const handleScoreSelect = (score: number) => {
    const areaId = LIFE_AREAS[currentAreaIndex].id as LifeAreaId
    setScores(prev => ({ ...prev, [areaId]: score }))
  }
  
  // Prossima area o step
  const handleNext = () => {
    if (currentStep === 'scoring') {
      if (currentAreaIndex < LIFE_AREAS.length - 1) {
        setCurrentAreaIndex(prev => prev + 1)
      } else {
        setCurrentStep('questions')
      }
    } else if (currentStep === 'questions') {
      if (currentQuestionIndex < CONFIRMATION_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      } else {
        setCurrentStep('priority')
      }
    }
  }
  
  // Step precedente
  const handlePrev = () => {
    if (currentStep === 'scoring' && currentAreaIndex > 0) {
      setCurrentAreaIndex(prev => prev - 1)
    } else if (currentStep === 'questions' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    } else if (currentStep === 'questions' && currentQuestionIndex === 0) {
      setCurrentStep('scoring')
      setCurrentAreaIndex(LIFE_AREAS.length - 1)
    } else if (currentStep === 'priority') {
      setCurrentStep('questions')
      setCurrentQuestionIndex(CONFIRMATION_QUESTIONS.length - 1)
    } else if (currentStep === 'results') {
      setCurrentStep('priority')
    } else if (currentStep === 'email') {
      setCurrentStep('results')
    }
  }
  
  // Seleziona risposta domanda
  const handleQuestionAnswer = (optionIndex: number) => {
    const questionId = CONFIRMATION_QUESTIONS[currentQuestionIndex].id
    setQuestionAnswers(prev => ({ ...prev, [questionId]: optionIndex }))
  }
  
  // Seleziona area prioritaria
  const handlePrioritySelect = (areaId: LifeAreaId) => {
    setPriorityArea(areaId)
    setCurrentStep('results')
  }
  
  // Invia email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          scores,
          priorityArea,
          lifeScore,
          archetype: archetypeResult?.primary.id,
          secondaryArchetype: archetypeResult?.secondary?.id,
          combination: archetypeResult?.combination,
          questionAnswers
        })
      })
      
      setCurrentStep('success')
    } catch (error) {
      console.error('Errore:', error)
      setCurrentStep('success') // Mostra successo comunque
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Componente Slider Score
  const ScoreSlider = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Molto insoddisfatto</span>
        <span>Completamente soddisfatto</span>
      </div>
      
      <div className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`w-full h-12 rounded-lg text-sm font-semibold transition-all ${
              value === num 
                ? 'bg-primary-500 text-white scale-105 shadow-lg' 
                : num <= (value || 0)
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      
      {value > 0 && (
        <div className="text-center">
          <span className="text-4xl font-bold text-primary-600">{value}</span>
          <span className="text-gray-400 text-lg">/10</span>
        </div>
      )}
    </div>
  )
  
  const currentArea = LIFE_AREAS[currentAreaIndex]
  const currentScore = currentArea ? scores[currentArea.id as LifeAreaId] : undefined
  const AreaIllustration = currentArea ? AreaIllustrations[currentArea.id] : null
  const currentQuestion = CONFIRMATION_QUESTIONS[currentQuestionIndex]
  const currentQuestionAnswer = currentQuestion ? questionAnswers[currentQuestion.id] : undefined
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => currentStep === 'intro' ? router.push('/') : handlePrev()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            
            <Logo size="sm" />
            
            <div className="w-9" />
          </div>
          
          {currentStep !== 'intro' && currentStep !== 'success' && (
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
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
      <main className="pt-20 pb-32 px-4">
        <AnimatePresence mode="wait">
          
          {/* INTRO */}
          {currentStep === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto text-center pt-8"
            >
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 text-primary-500 mb-6">
                  <Sparkles size={40} />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
                  Scopri chi sei<br />
                  <span className="text-primary-500">veramente</span>
                </h1>
                
                <p className="text-lg text-gray-600 mb-2">
                  Un test di 3 minuti per scoprire:
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-8 text-left">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🎭</span>
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal">Il tuo Archetipo</p>
                      <p className="text-sm text-gray-500">Chi sei nel profondo? Conquistatore, Saggio, Fenice...?</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal">Il tuo Life Score</p>
                      <p className="text-sm text-gray-500">Una fotografia delle 8 aree della tua vita</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🎯</span>
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal">Il tuo Piano d'Azione</p>
                      <p className="text-sm text-gray-500">Consigli personalizzati per migliorare</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <button
                onClick={() => setCurrentStep('scoring')}
                className="w-full btn btn-primary py-4 text-lg"
              >
                Scopri il tuo Archetipo
                <ArrowRight size={20} />
              </button>
              
              <p className="text-xs text-gray-400 mt-4">
                +2.500 persone hanno già scoperto il loro profilo
              </p>
            </motion.div>
          )}
          
          {/* SCORING */}
          {currentStep === 'scoring' && currentArea && (
            <motion.div
              key={`scoring-${currentArea.id}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-lg mx-auto pt-4"
            >
              <div className="text-center mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Area {currentAreaIndex + 1} di {LIFE_AREAS.length}
                </span>
              </div>
              
              <div className="flex justify-center mb-4">
                {AreaIllustration && <AreaIllustration size={120} />}
              </div>
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-display font-bold text-charcoal mb-1">
                  {AREA_LABELS[currentArea.id as LifeAreaId]}
                </h2>
                <p className="text-sm text-gray-500">
                  {AREA_DESCRIPTIONS[currentArea.id as LifeAreaId]}
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <p className="text-center text-gray-600 mb-6 text-sm">
                  Quanto sei soddisfatto di quest'area?
                </p>
                <ScoreSlider 
                  value={currentScore || 0}
                  onChange={handleScoreSelect}
                />
              </div>
            </motion.div>
          )}
          
          {/* DOMANDE DI CONFERMA */}
          {currentStep === 'questions' && currentQuestion && (
            <motion.div
              key={`question-${currentQuestion.id}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-lg mx-auto pt-4"
            >
              <div className="text-center mb-6">
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Domanda {currentQuestionIndex + 1} di {CONFIRMATION_QUESTIONS.length}
                </span>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-display font-bold text-charcoal mb-6 text-center">
                  {currentQuestion.question}
                </h2>
                
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionAnswer(index)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        currentQuestionAnswer === index
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* SCELTA PRIORITÀ */}
          {currentStep === 'priority' && (
            <motion.div
              key="priority"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto pt-4"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-500 mb-4">
                  <Target size={28} />
                </div>
                
                <h2 className="text-xl font-display font-bold text-charcoal mb-2">
                  Ultima domanda!
                </h2>
                <p className="text-gray-500 text-sm">
                  Su quale area vuoi lavorare per prima?
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {LIFE_AREAS.map(area => {
                  const AreaIcon = AreaIllustrations[area.id]
                  const score = scores[area.id as LifeAreaId]
                  
                  return (
                    <button
                      key={area.id}
                      onClick={() => handlePrioritySelect(area.id as LifeAreaId)}
                      className="bg-white rounded-xl p-3 border-2 border-transparent hover:border-primary-200 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col items-center">
                        {AreaIcon && <AreaIcon size={50} />}
                        <span className="text-xs font-medium text-charcoal mt-1">
                          {AREA_LABELS[area.id as LifeAreaId].split(' ')[0]}
                        </span>
                        <span className="text-xs text-gray-400">{score}/10</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
          
          {/* RISULTATI TEASER */}
          {currentStep === 'results' && archetypeResult && scoreBand && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-lg mx-auto pt-4"
            >
              {/* Life Score Teaser */}
              <div 
                className="rounded-2xl p-6 text-white text-center mb-4"
                style={{ background: `linear-gradient(135deg, ${scoreBand.color} 0%, ${scoreBand.color}cc 100%)` }}
              >
                <span className="text-4xl mb-2 block">{scoreBand.emoji}</span>
                <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Il tuo Life Score</p>
                <p className="text-4xl font-bold">{lifeScore}<span className="text-xl">/10</span></p>
                <p className="text-lg font-medium mt-1">{scoreBand.title}</p>
              </div>
              
              {/* Archetipo Teaser */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 mb-4 border border-purple-100">
                <div className="text-center">
                  <span className="text-5xl mb-3 block">{archetypeResult.primary.emoji}</span>
                  <p className="text-xs text-purple-600 uppercase tracking-wide mb-1">Il tuo Archetipo</p>
                  <h3 className="text-2xl font-bold text-charcoal mb-2">{archetypeResult.primary.name}</h3>
                  <p className="text-primary-600 font-medium italic">
                    &ldquo;{archetypeResult.primary.tagline}&rdquo;
                  </p>
                  
                  {archetypeResult.combination && (
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <p className="text-sm text-purple-700">
                        🔮 <span className="font-medium">{archetypeResult.combination}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Radar Chart Sfocato/Teaser */}
              <div className="bg-white rounded-2xl p-4 mb-4 relative overflow-hidden">
                <div className="flex justify-center opacity-40 blur-[2px]">
                  <RadarChart scores={scores} size={200} showLabels={false} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <div className="text-center">
                    <Lock size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Analisi completa nel report</p>
                  </div>
                </div>
              </div>
              
              {/* Cosa include il report */}
              <div className="bg-charcoal rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Gift size={20} className="text-primary-400" />
                  <h3 className="font-semibold">Il tuo Report Completo include:</h3>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3 text-sm">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Analisi dettagliata del tuo archetipo <span className="text-primary-400">{archetypeResult.primary.name}</span></span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>I tuoi punti di forza e le sfide da affrontare</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Radar chart completo delle 8 aree della vita</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Piano d&apos;azione personalizzato per <span className="text-primary-400">{priorityArea ? AREA_LABELS[priorityArea] : 'la tua priorità'}</span></span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>3 azioni concrete da fare subito</span>
                  </li>
                </ul>
                
                <button
                  onClick={() => setCurrentStep('email')}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={18} />
                  Ricevi il Report Gratuito
                </button>
                
                <p className="text-center text-gray-400 text-xs mt-3">
                  📧 Lo riceverai via email in 2 minuti
                </p>
              </div>
            </motion.div>
          )}
          
          {/* EMAIL FORM */}
          {currentStep === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto pt-8"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-500 mb-4">
                  <Mail size={32} />
                </div>
                
                <h2 className="text-2xl font-display font-bold text-charcoal mb-2">
                  Dove ti invio il report?
                </h2>
                <p className="text-gray-500 text-sm">
                  Riceverai l&apos;analisi completa del tuo profilo<br />
                  <span className="font-medium text-primary-600">{archetypeResult?.primary.name}</span> in 2 minuti
                </p>
              </div>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Il tuo nome
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Come ti chiami?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    La tua email
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
                  {isSubmitting ? 'Invio in corso...' : 'Inviami il Report Completo'}
                </button>
                
                <p className="text-xs text-center text-gray-400">
                  🔒 I tuoi dati sono al sicuro. Niente spam, promesso.
                </p>
              </form>
            </motion.div>
          )}
          
          {/* SUCCESS */}
          {currentStep === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto pt-8 text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
                <Check size={40} />
              </div>
              
              <h2 className="text-2xl font-display font-bold text-charcoal mb-3">
                Report inviato! 🎉
              </h2>
              <p className="text-gray-500 mb-2">
                Controlla la tua casella email<br />(anche lo spam!)
              </p>
              <p className="text-sm text-gray-400 mb-8">
                Il report arriverà entro 2 minuti a <strong>{email}</strong>
              </p>
              
              <div className="bg-primary-50 rounded-2xl p-6 mb-6">
                <p className="text-sm text-primary-800 mb-3">
                  🎯 Intanto, vuoi parlare con un coach specializzato in <strong>{priorityArea ? AREA_LABELS[priorityArea] : 'crescita personale'}</strong>?
                </p>
                <button
                  onClick={() => router.push(`/coaches?area=${priorityArea}`)}
                  className="w-full btn btn-primary"
                >
                  Trova il tuo Coach (call gratuita)
                </button>
              </div>
              
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-500 hover:text-primary-500 transition-colors"
              >
                Torna alla home
              </button>
            </motion.div>
          )}
          
        </AnimatePresence>
      </main>
      
      {/* Footer con bottone Next */}
      {(currentStep === 'scoring' || currentStep === 'questions') && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 'scoring' && !currentScore) ||
                (currentStep === 'questions' && currentQuestionAnswer === undefined)
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
