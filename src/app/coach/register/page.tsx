'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  Check,
  Plus,
  X
} from 'lucide-react'
import { LIFE_AREAS, LifeAreaId } from '@/types'

const STEPS = [
  'Informazioni personali',
  'Esperienza',
  'Specializzazioni',
  'Disponibilità'
]

const CLIENT_TYPES = [
  'Manager', 'Professionisti', 'Imprenditori', 'Freelance', 
  'Startup founder', 'Individui', 'Coppie', 'Team'
]

const PROBLEMS = [
  'Crescita professionale', 'Leadership', 'Work-life balance',
  'Stress e burnout', 'Comunicazione', 'Decision making',
  'Produttività', 'Relazioni', 'Autostima', 'Transizione di carriera'
]

const METHODS = [
  'Coaching ontologico', 'PNL', 'Mindfulness', 'Coaching sistemico',
  'Business coaching', 'Goal setting', 'Comunicazione non violenta'
]

const STYLES = ['diretto', 'empatico', 'strutturato', 'esplorativo'] as const

export default function CoachRegisterPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    // Step 1
    name: '',
    email: '',
    password: '',
    photo: null as File | null,
    bio: '',
    
    // Step 2
    certifications: [{ name: '', institution: '', year: new Date().getFullYear() }],
    yearsOfExperience: 0,
    languages: ['Italiano'],
    sessionMode: ['online'] as ('online' | 'presence')[],
    location: '',
    averagePrice: 100,
    freeCallAvailable: true,
    
    // Step 3
    lifeAreas: [] as LifeAreaId[],
    clientTypes: [] as string[],
    problemsAddressed: [] as string[],
    coachingMethod: [] as string[],
    style: [] as string[],
    
    // Step 4
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    
    acceptTerms: false
  })
  
  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const toggleArrayItem = (field: string, item: string) => {
    setFormData(prev => {
      const arr = prev[field as keyof typeof prev] as string[]
      const newArr = arr.includes(item) 
        ? arr.filter(i => i !== item)
        : [...arr, item]
      return { ...prev, [field]: newArr }
    })
  }
  
  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', institution: '', year: new Date().getFullYear() }]
    }))
  }
  
  const updateCertification = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const certs = [...prev.certifications]
      certs[index] = { ...certs[index], [field]: value }
      return { ...prev, certifications: certs }
    })
  }
  
  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }
  
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In production: save to Firestore, upload files, etc.
    router.push('/coach/register/success')
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-charcoal">CoachMatch</span>
          </Link>
          
          <span className="text-sm text-gray-500">
            Registrazione Coach
          </span>
        </div>
      </header>
      
      {/* Progress */}
      <div className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div 
                key={step}
                className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index <= currentStep 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {index < currentStep ? <Check size={16} /> : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`
                    flex-1 h-1 mx-2
                    ${index < currentStep ? 'bg-primary-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center">
            {STEPS[currentStep]}
          </p>
        </div>
      </div>
      
      {/* Form */}
      <main className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl p-8"
          >
            {/* Step 1: Personal Info */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold text-charcoal mb-6">
                  Raccontaci di te
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nome e cognome *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="label">Password *</label>
                  <input
                    type="password"
                    className="input"
                    value={formData.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Foto profilo</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-300 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Trascina un'immagine o clicca per caricare
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="label">Bio professionale *</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={formData.bio}
                    onChange={(e) => updateForm('bio', e.target.value)}
                    placeholder="Descrivi la tua esperienza e il tuo approccio al coaching..."
                    required
                  />
                </div>
              </div>
            )}
            
            {/* Step 2: Experience */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold text-charcoal mb-6">
                  La tua esperienza
                </h2>
                
                {/* Certifications */}
                <div>
                  <label className="label">Certificazioni</label>
                  {formData.certifications.map((cert, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder="Nome certificazione"
                        value={cert.name}
                        onChange={(e) => updateCertification(index, 'name', e.target.value)}
                      />
                      <input
                        type="text"
                        className="input w-32"
                        placeholder="Ente"
                        value={cert.institution}
                        onChange={(e) => updateCertification(index, 'institution', e.target.value)}
                      />
                      <input
                        type="number"
                        className="input w-24"
                        placeholder="Anno"
                        value={cert.year}
                        onChange={(e) => updateCertification(index, 'year', parseInt(e.target.value))}
                      />
                      {formData.certifications.length > 1 && (
                        <button
                          onClick={() => removeCertification(index)}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-xl"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addCertification}
                    className="flex items-center gap-2 text-primary-500 text-sm font-medium mt-2"
                  >
                    <Plus size={16} />
                    Aggiungi certificazione
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Anni di esperienza *</label>
                    <input
                      type="number"
                      className="input"
                      min={0}
                      value={formData.yearsOfExperience}
                      onChange={(e) => updateForm('yearsOfExperience', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">Prezzo medio sessione (€) *</label>
                    <input
                      type="number"
                      className="input"
                      min={0}
                      value={formData.averagePrice}
                      onChange={(e) => updateForm('averagePrice', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="label">Modalità di sessione *</label>
                  <div className="flex gap-3">
                    {['online', 'presence'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          const modes = formData.sessionMode.includes(mode as any)
                            ? formData.sessionMode.filter(m => m !== mode)
                            : [...formData.sessionMode, mode]
                          updateForm('sessionMode', modes)
                        }}
                        className={`
                          px-4 py-2 rounded-xl border transition-all
                          ${formData.sessionMode.includes(mode as any)
                            ? 'border-primary-500 bg-primary-50 text-primary-600'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        {mode === 'online' ? 'Online' : 'In presenza'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {formData.sessionMode.includes('presence') && (
                  <div>
                    <label className="label">Città</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.location}
                      onChange={(e) => updateForm('location', e.target.value)}
                      placeholder="Es: Milano"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="freeCall"
                    checked={formData.freeCallAvailable}
                    onChange={(e) => updateForm('freeCallAvailable', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary-500"
                  />
                  <label htmlFor="freeCall" className="text-charcoal">
                    Offro una prima call gratuita di orientamento
                  </label>
                </div>
              </div>
            )}
            
            {/* Step 3: Specializations */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold text-charcoal mb-6">
                  Le tue specializzazioni
                </h2>
                
                <div>
                  <label className="label">Aree della vita *</label>
                  <div className="flex flex-wrap gap-2">
                    {LIFE_AREAS.map(area => (
                      <button
                        key={area.id}
                        onClick={() => toggleArrayItem('lifeAreas', area.id)}
                        className={`
                          px-4 py-2 rounded-full text-sm font-medium transition-all
                          ${formData.lifeAreas.includes(area.id)
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                        style={{
                          backgroundColor: formData.lifeAreas.includes(area.id) ? area.color : undefined
                        }}
                      >
                        {area.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="label">Tipologia clienti</label>
                  <div className="flex flex-wrap gap-2">
                    {CLIENT_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleArrayItem('clientTypes', type)}
                        className={`
                          px-4 py-2 rounded-full text-sm font-medium transition-all
                          ${formData.clientTypes.includes(type)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="label">Problemi che tratti</label>
                  <div className="flex flex-wrap gap-2">
                    {PROBLEMS.map(problem => (
                      <button
                        key={problem}
                        onClick={() => toggleArrayItem('problemsAddressed', problem)}
                        className={`
                          px-4 py-2 rounded-full text-sm font-medium transition-all
                          ${formData.problemsAddressed.includes(problem)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {problem}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="label">Stile di coaching *</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map(style => (
                      <button
                        key={style}
                        onClick={() => toggleArrayItem('style', style)}
                        className={`
                          px-4 py-2 rounded-full text-sm font-medium transition-all capitalize
                          ${formData.style.includes(style)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Availability */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold text-charcoal mb-6">
                  La tua disponibilità
                </h2>
                
                <div>
                  <label className="label">Giorni disponibili</label>
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(formData.availability).map(([day, available]) => (
                      <button
                        key={day}
                        onClick={() => updateForm('availability', {
                          ...formData.availability,
                          [day]: !available
                        })}
                        className={`
                          p-3 rounded-xl text-center transition-all
                          ${available
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                          }
                        `}
                      >
                        <span className="text-xs uppercase">
                          {day.slice(0, 3)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="bg-cream rounded-xl p-4">
                  <p className="text-sm text-gray-600">
                    💡 Potrai configurare gli orari specifici dalla tua dashboard dopo la registrazione.
                  </p>
                </div>
                
                <div className="border-t border-gray-100 pt-6">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={formData.acceptTerms}
                      onChange={(e) => updateForm('acceptTerms', e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-500"
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
                      . Comprendo che la piattaforma tratterrà una commissione del 30% sulle sessioni prenotate.
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="btn btn-ghost disabled:opacity-50"
              >
                <ArrowLeft size={18} />
                Indietro
              </button>
              
              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="btn btn-primary"
                >
                  Continua
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!formData.acceptTerms || isSubmitting}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {isSubmitting ? 'Invio in corso...' : 'Completa registrazione'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
