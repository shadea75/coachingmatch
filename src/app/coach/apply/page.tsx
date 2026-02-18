'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  User,
  GraduationCap,
  Target,
  FileText,
  Upload,
  Check,
  Plus,
  X,
  Info
} from 'lucide-react'
import Logo from '@/components/Logo'
import { 
  LIFE_AREAS, 
  LifeAreaId, 
  FOCUS_TOPICS_BY_AREA, 
  TARGET_CLIENTS_OPTIONS,
  CoachApplication 
} from '@/types'

const STEPS = [
  { id: 1, title: 'Dati Personali', icon: User },
  { id: 2, title: 'Esperienza', icon: GraduationCap },
  { id: 3, title: 'Specializzazioni', icon: Target },
  { id: 4, title: 'Servizio', icon: FileText },
  { id: 5, title: 'Documenti', icon: Upload },
]

const CERTIFICATION_TYPES = [
  { value: 'icf', label: 'ICF (International Coaching Federation)' },
  { value: 'aicp', label: 'AICP (Associazione Italiana Coach Professionisti)' },
  { value: 'other', label: 'Altra certificazione' },
]

const ICF_LEVELS = ['ACC', 'PCC', 'MCC']

const YEARS_OPTIONS = ['1-2', '3-5', '6-10', '10+']
const CLIENT_COUNT_OPTIONS = ['1-10', '11-50', '51-100', '100+']
const SESSION_COUNT_OPTIONS = ['1-3 sessioni', '4-6 sessioni', '6-8 sessioni', '8-12 sessioni', '12+ sessioni']

function CoachApplicationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPlan = searchParams.get('plan') || 'starter'
  
  const planPrices: Record<string, number> = { starter: 9, professional: 29, business: 49, elite: 79 }
  const selectedPrice = planPrices[selectedPlan] || 9
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    onlineAvailable: true,
    inPersonAvailable: false,
    linkedinUrl: '',
    websiteUrl: '',
    
    // Step 2: Experience
    yearsAsCoach: '',
    coachingSchool: '',
    mainCertification: 'icf',
    certificationLevel: '',
    otherCertifications: [] as string[],
    totalClientCount: '',
    languages: ['Italiano'],
    
    // Step 3: Specializations
    selectedAreas: [] as LifeAreaId[],
    focusTopics: {} as Record<LifeAreaId, string[]>,
    targetClients: [] as string[],
    coachingApproach: '',
    
    // Step 4: Service Details
    sessionPrice: '',
    typicalSessionCount: '',
    freeCallOffered: true,
    freeCallDuration: 30,
    bio: '',
    
    // Step 5: Documents
    acceptedTerms: false,
    acceptedPrivacy: false,
  })
  
  const [newCertification, setNewCertification] = useState('')
  const [newLanguage, setNewLanguage] = useState('')
  
  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  const toggleArea = (areaId: LifeAreaId) => {
    setFormData(prev => {
      const current = prev.selectedAreas
      if (current.includes(areaId)) {
        // Remove area and its topics
        const newTopics = { ...prev.focusTopics }
        delete newTopics[areaId]
        return { 
          ...prev, 
          selectedAreas: current.filter(a => a !== areaId),
          focusTopics: newTopics
        }
      } else if (current.length < 3) {
        // Add area
        return { 
          ...prev, 
          selectedAreas: [...current, areaId],
          focusTopics: { ...prev.focusTopics, [areaId]: [] }
        }
      }
      return prev // Max 3 areas reached
    })
  }
  
  const toggleFocusTopic = (areaId: LifeAreaId, topic: string) => {
    setFormData(prev => {
      const currentTopics = prev.focusTopics[areaId] || []
      const newTopics = currentTopics.includes(topic)
        ? currentTopics.filter(t => t !== topic)
        : [...currentTopics, topic]
      return {
        ...prev,
        focusTopics: { ...prev.focusTopics, [areaId]: newTopics }
      }
    })
  }
  
  const toggleTargetClient = (client: string) => {
    setFormData(prev => {
      const current = prev.targetClients
      return {
        ...prev,
        targetClients: current.includes(client)
          ? current.filter(c => c !== client)
          : [...current, client]
      }
    })
  }
  
  const addCertification = () => {
    if (newCertification.trim()) {
      updateForm('otherCertifications', [...formData.otherCertifications, newCertification.trim()])
      setNewCertification('')
    }
  }
  
  const removeCertification = (index: number) => {
    updateForm('otherCertifications', formData.otherCertifications.filter((_, i) => i !== index))
  }
  
  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      updateForm('languages', [...formData.languages, newLanguage.trim()])
      setNewLanguage('')
    }
  }
  
  const removeLanguage = (lang: string) => {
    if (lang !== 'Italiano') { // Keep Italian as default
      updateForm('languages', formData.languages.filter(l => l !== lang))
    }
  }
  
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    switch (step) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = 'Inserisci il nome'
        if (!formData.lastName.trim()) newErrors.lastName = 'Inserisci il cognome'
        if (!formData.email.trim()) newErrors.email = 'Inserisci l\'email'
        if (!formData.phone.trim()) newErrors.phone = 'Inserisci il telefono'
        if (!formData.city.trim()) newErrors.city = 'Inserisci la città'
        if (!formData.onlineAvailable && !formData.inPersonAvailable) {
          newErrors.availability = 'Seleziona almeno una modalità'
        }
        break
      case 2:
        if (!formData.yearsAsCoach) newErrors.yearsAsCoach = 'Seleziona gli anni di esperienza'
        if (!formData.coachingSchool.trim()) newErrors.coachingSchool = 'Inserisci la scuola di coaching'
        if (!formData.totalClientCount) newErrors.totalClientCount = 'Seleziona il numero di clienti'
        break
      case 3:
        if (formData.selectedAreas.length === 0) newErrors.selectedAreas = 'Seleziona almeno un\'area'
        if (!formData.coachingApproach.trim()) newErrors.coachingApproach = 'Descrivi il tuo approccio'
        break
      case 4:
        if (!formData.sessionPrice) newErrors.sessionPrice = 'Inserisci il prezzo'
        if (!formData.typicalSessionCount) newErrors.typicalSessionCount = 'Seleziona la durata tipica'
        if (!formData.bio.trim()) newErrors.bio = 'Inserisci la bio'
        if (formData.bio.length > 500) newErrors.bio = 'Max 500 caratteri'
        break
      case 5:
        if (!formData.acceptedTerms) newErrors.acceptedTerms = 'Devi accettare i termini'
        if (!formData.acceptedPrivacy) newErrors.acceptedPrivacy = 'Devi accettare la privacy policy'
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep(prev => prev + 1)
      } else {
        handleSubmit()
      }
    }
  }
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    } else {
      router.push('/')
    }
  }
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const { setDoc, doc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      
      // Genera un ID unico per la candidatura
      const applicationId = `apply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()
      
      // Prepara i dati della candidatura
      const applicationData = {
        // ID e tipo
        applicationId,
        applicationType: 'apply', // Distingue da 'register'
        
        // Dati personali
        name: fullName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        onlineAvailable: formData.onlineAvailable,
        inPersonAvailable: formData.inPersonAvailable,
        linkedinUrl: formData.linkedinUrl,
        websiteUrl: formData.websiteUrl,
        
        // Esperienza
        yearsAsCoach: formData.yearsAsCoach,
        yearsOfExperience: formData.yearsAsCoach,
        coachingSchool: formData.coachingSchool,
        mainCertification: formData.mainCertification,
        certificationLevel: formData.certificationLevel,
        otherCertifications: formData.otherCertifications,
        totalClientCount: formData.totalClientCount,
        languages: formData.languages,
        
        // Specializzazioni
        lifeAreas: formData.selectedAreas,
        lifeArea: formData.selectedAreas[0] || null,
        focusTopics: formData.focusTopics,
        targetClients: formData.targetClients,
        coachingApproach: formData.coachingApproach,
        
        // Servizio
        sessionPrice: formData.sessionPrice,
        averagePrice: parseInt(formData.sessionPrice) || 0,
        typicalSessionCount: formData.typicalSessionCount,
        freeCallOffered: formData.freeCallOffered,
        freeCallDuration: formData.freeCallDuration,
        bio: formData.bio,
        
        // Modalità sessione
        sessionMode: formData.onlineAvailable && formData.inPersonAvailable 
          ? 'both' 
          : formData.onlineAvailable ? 'online' : 'in-person',
        location: formData.city,
        
        // Status
        status: 'pending',
        subscriptionTier: selectedPlan,
        subscriptionPrice: selectedPrice,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }
      
      // Salva in Firebase
      await setDoc(doc(db, 'coachApplications', applicationId), applicationData)
      
      // Invia email di conferma al coach e notifica all'admin
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'coach_registration',
            data: {
              name: fullName,
              email: formData.email,
              lifeAreas: formData.selectedAreas,
              yearsOfExperience: formData.yearsAsCoach,
            }
          })
        })
      } catch (emailError) {
        console.error('Errore invio email:', emailError)
        // Non blocchiamo il flusso se l'email fallisce
      }
      
      // Redirect alla pagina di successo
      router.push('/coach/application-success')
    } catch (error: any) {
      console.error('Error submitting application:', error)
      setErrors({ submit: 'Errore durante l\'invio. Riprova.' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const progress = (currentStep / 5) * 100
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            
            <Logo size="sm" />
            
            <div className="w-9" />
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
          
          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isActive ? 'text-primary-600' : isCompleted ? 'text-green-500' : 'text-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-primary-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-36 pb-32 px-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
                  Dati Personali
                </h1>
                <p className="text-gray-500">
                  Iniziamo con le informazioni di base
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nome *</label>
                    <input
                      type="text"
                      className={`input ${errors.firstName ? 'border-red-500' : ''}`}
                      value={formData.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      placeholder="Mario"
                    />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="label">Cognome *</label>
                    <input
                      type="text"
                      className={`input ${errors.lastName ? 'border-red-500' : ''}`}
                      value={formData.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      placeholder="Rossi"
                    />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>
                
                <div>
                  <label className="label">Email *</label>
                  <input
                    type="email"
                    className={`input ${errors.email ? 'border-red-500' : ''}`}
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="mario.rossi@email.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                
                <div>
                  <label className="label">Telefono *</label>
                  <input
                    type="tel"
                    className={`input ${errors.phone ? 'border-red-500' : ''}`}
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="+39 333 1234567"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                
                <div>
                  <label className="label">Città *</label>
                  <input
                    type="text"
                    className={`input ${errors.city ? 'border-red-500' : ''}`}
                    value={formData.city}
                    onChange={(e) => updateForm('city', e.target.value)}
                    placeholder="Milano"
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                
                <div>
                  <label className="label">Modalità di lavoro *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.onlineAvailable}
                        onChange={(e) => updateForm('onlineAvailable', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-500"
                      />
                      <span className="text-sm">Online</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.inPersonAvailable}
                        onChange={(e) => updateForm('inPersonAvailable', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-500"
                      />
                      <span className="text-sm">Di persona</span>
                    </label>
                  </div>
                  {errors.availability && <p className="text-red-500 text-xs mt-1">{errors.availability}</p>}
                </div>
                
                <div>
                  <label className="label">LinkedIn (opzionale)</label>
                  <input
                    type="url"
                    className="input"
                    value={formData.linkedinUrl}
                    onChange={(e) => updateForm('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/tuoprofilo"
                  />
                </div>
                
                <div>
                  <label className="label">Sito web (opzionale)</label>
                  <input
                    type="url"
                    className="input"
                    value={formData.websiteUrl}
                    onChange={(e) => updateForm('websiteUrl', e.target.value)}
                    placeholder="https://tuosito.com"
                  />
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Step 2: Experience */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
                  Esperienza e Formazione
                </h1>
                <p className="text-gray-500">
                  Raccontaci il tuo percorso professionale
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Anni di esperienza come coach *</label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {YEARS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateForm('yearsAsCoach', option)}
                        className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                          formData.yearsAsCoach === option
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option} anni
                      </button>
                    ))}
                  </div>
                  {errors.yearsAsCoach && <p className="text-red-500 text-xs mt-1">{errors.yearsAsCoach}</p>}
                </div>
                
                <div>
                  <label className="label">Scuola di coaching principale *</label>
                  <input
                    type="text"
                    className={`input ${errors.coachingSchool ? 'border-red-500' : ''}`}
                    value={formData.coachingSchool}
                    onChange={(e) => updateForm('coachingSchool', e.target.value)}
                    placeholder="Es: Scuola Italiana di Life & Corporate Coaching"
                  />
                  {errors.coachingSchool && <p className="text-red-500 text-xs mt-1">{errors.coachingSchool}</p>}
                </div>
                
                <div>
                  <label className="label">Certificazione principale *</label>
                  <select
                    className="input"
                    value={formData.mainCertification}
                    onChange={(e) => updateForm('mainCertification', e.target.value)}
                  >
                    {CERTIFICATION_TYPES.map((cert) => (
                      <option key={cert.value} value={cert.value}>{cert.label}</option>
                    ))}
                  </select>
                </div>
                
                {formData.mainCertification === 'icf' && (
                  <div>
                    <label className="label">Livello ICF</label>
                    <div className="flex gap-2 mt-2">
                      {ICF_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateForm('certificationLevel', level)}
                          className={`py-2 px-6 rounded-lg border-2 text-sm font-medium transition-colors ${
                            formData.certificationLevel === level
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="label">Altre certificazioni (opzionale)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="input flex-1"
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Es: PNL Practitioner"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                    />
                    <button
                      type="button"
                      onClick={addCertification}
                      className="btn btn-primary px-4"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.otherCertifications.map((cert, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        {cert}
                        <button onClick={() => removeCertification(index)} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="label">Clienti seguiti finora *</label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {CLIENT_COUNT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateForm('totalClientCount', option)}
                        className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                          formData.totalClientCount === option
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.totalClientCount && <p className="text-red-500 text-xs mt-1">{errors.totalClientCount}</p>}
                </div>
                
                <div>
                  <label className="label">Lingue parlate</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="input flex-1"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="Aggiungi lingua"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                    />
                    <button
                      type="button"
                      onClick={addLanguage}
                      className="btn btn-primary px-4"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        {lang}
                        {lang !== 'Italiano' && (
                          <button onClick={() => removeLanguage(lang)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Step 3: Specializations */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
                  Le tue Specializzazioni
                </h1>
                <p className="text-gray-500">
                  Seleziona <strong>massimo 3 aree</strong> in cui ti senti più forte
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Area Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label mb-0">Aree della Ruota della Vita *</label>
                    <span className={`text-sm font-medium ${
                      formData.selectedAreas.length === 3 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {formData.selectedAreas.length}/3 selezionate
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {LIFE_AREAS.map((area) => {
                      const isSelected = formData.selectedAreas.includes(area.id)
                      const isDisabled = !isSelected && formData.selectedAreas.length >= 3
                      
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => toggleArea(area.id)}
                          disabled={isDisabled}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : isDisabled
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mb-2"
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="text-sm font-medium text-charcoal">
                            {area.label.split(' ')[0]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.selectedAreas && <p className="text-red-500 text-xs mt-1">{errors.selectedAreas}</p>}
                </div>
                
                {/* Focus Topics per area selezionata */}
                {formData.selectedAreas.length > 0 && (
                  <div className="space-y-4">
                    <label className="label">Argomenti specifici per area</label>
                    
                    {formData.selectedAreas.map((areaId) => {
                      const area = LIFE_AREAS.find(a => a.id === areaId)!
                      const topics = FOCUS_TOPICS_BY_AREA[areaId]
                      const selectedTopics = formData.focusTopics[areaId] || []
                      
                      return (
                        <div key={areaId} className="bg-white p-4 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: area.color }}
                            />
                            <span className="font-medium text-charcoal">{area.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {topics.map((topic) => (
                              <button
                                key={topic}
                                type="button"
                                onClick={() => toggleFocusTopic(areaId, topic)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                  selectedTopics.includes(topic)
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                style={{
                                  backgroundColor: selectedTopics.includes(topic) ? area.color : undefined
                                }}
                              >
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Target Clients */}
                <div>
                  <label className="label">Clienti ideali (opzionale)</label>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_CLIENTS_OPTIONS.map((client) => (
                      <button
                        key={client}
                        type="button"
                        onClick={() => toggleTargetClient(client)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.targetClients.includes(client)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {client}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Coaching Approach */}
                <div>
                  <label className="label">Descrivi il tuo approccio al coaching *</label>
                  <textarea
                    className={`input min-h-[120px] ${errors.coachingApproach ? 'border-red-500' : ''}`}
                    value={formData.coachingApproach}
                    onChange={(e) => updateForm('coachingApproach', e.target.value)}
                    placeholder="Qual è il tuo metodo? Come lavori con i tuoi clienti? Cosa ti distingue?"
                  />
                  {errors.coachingApproach && <p className="text-red-500 text-xs mt-1">{errors.coachingApproach}</p>}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Step 4: Service Details */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
                  Dettagli del Servizio
                </h1>
                <p className="text-gray-500">
                  Come strutturi il tuo lavoro con i clienti
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Prezzo a sessione (€) *</label>
                  <input
                    type="number"
                    className={`input ${errors.sessionPrice ? 'border-red-500' : ''}`}
                    value={formData.sessionPrice}
                    onChange={(e) => updateForm('sessionPrice', e.target.value)}
                    placeholder="80"
                    min="0"
                  />
                  {errors.sessionPrice && <p className="text-red-500 text-xs mt-1">{errors.sessionPrice}</p>}
                </div>
                
                <div>
                  <label className="label">Durata tipica di un percorso *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {SESSION_COUNT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateForm('typicalSessionCount', option)}
                        className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                          formData.typicalSessionCount === option
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.typicalSessionCount && <p className="text-red-500 text-xs mt-1">{errors.typicalSessionCount}</p>}
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Bio per il profilo *</label>
                    <span className={`text-xs ${formData.bio.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                      {formData.bio.length}/500
                    </span>
                  </div>
                  <textarea
                    className={`input min-h-[150px] mt-2 ${errors.bio ? 'border-red-500' : ''}`}
                    value={formData.bio}
                    onChange={(e) => updateForm('bio', e.target.value)}
                    placeholder="Presentati ai potenziali clienti. Chi sei? Perché fai questo lavoro? Cosa possono aspettarsi lavorando con te?"
                    maxLength={550}
                  />
                  {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Step 5: Documents */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
                  Documenti e Conferma
                </h1>
                <p className="text-gray-500">
                  Ultimo passo: carica i documenti e invia la candidatura
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Certificate Upload */}
                <div className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-charcoal mb-1">
                      Carica il certificato di coaching *
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      PDF o immagine (max 5MB)
                    </p>
                    <label className="btn btn-primary cursor-pointer">
                      <Upload size={18} />
                      Seleziona file
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          // Handle file upload
                          console.log('File selected:', e.target.files?.[0])
                        }}
                      />
                    </label>
                  </div>
                </div>
                
                {/* CV Upload (optional) */}
                <div className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-charcoal mb-1">
                      CV o Portfolio (opzionale)
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      PDF (max 5MB)
                    </p>
                    <label className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                      <Upload size={18} />
                      Seleziona file
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          console.log('CV selected:', e.target.files?.[0])
                        }}
                      />
                    </label>
                  </div>
                </div>
                
                {/* Info box */}
                <div className="bg-blue-50 p-4 rounded-xl flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Cosa succede dopo?</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-600">
                      <li>Revisioneremo la tua candidatura entro 48 ore</li>
                      <li>Ti contatteremo per una breve call conoscitiva</li>
                      <li>Se approvato, il tuo profilo sarà attivo sulla piattaforma</li>
                    </ol>
                  </div>
                </div>
                
                {/* Terms */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.acceptedTerms}
                      onChange={(e) => updateForm('acceptedTerms', e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500"
                    />
                    <span className="text-sm text-gray-600">
                      Accetto i{' '}
                      <a href="/terms" className="text-primary-500 hover:underline">
                        Termini di Servizio per Coach
                      </a>{' '}
                      e le condizioni della piattaforma *
                    </span>
                  </label>
                  {errors.acceptedTerms && <p className="text-red-500 text-xs">{errors.acceptedTerms}</p>}
                  
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.acceptedPrivacy}
                      onChange={(e) => updateForm('acceptedPrivacy', e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500"
                    />
                    <span className="text-sm text-gray-600">
                      Accetto la{' '}
                      <a href="/privacy" className="text-primary-500 hover:underline">
                        Privacy Policy
                      </a>{' '}
                      e il trattamento dei miei dati *
                    </span>
                  </label>
                  {errors.acceptedPrivacy && <p className="text-red-500 text-xs">{errors.acceptedPrivacy}</p>}
                </div>
                
                {errors.submit && (
                  <p className="text-red-500 text-sm text-center">{errors.submit}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Footer with buttons */}
      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-gray-100 p-4">
        <div className="max-w-xl mx-auto flex gap-3">
          <button
            onClick={handleBack}
            className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex-1"
          >
            <ArrowLeft size={18} />
            Indietro
          </button>
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="btn btn-primary flex-[2] disabled:opacity-50"
          >
            {isSubmitting ? (
              'Invio in corso...'
            ) : currentStep === 5 ? (
              <>
                Invia candidatura
                <Check size={18} />
              </>
            ) : (
              <>
                Continua
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}

export default function CoachApplicationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    }>
      <CoachApplicationContent />
    </Suspense>
  )
}
