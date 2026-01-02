'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  ArrowLeft,
  Upload,
  Check,
  Plus,
  X
} from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { LIFE_AREAS, LifeAreaId } from '@/types'
import Logo from '@/components/Logo'

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
    certifications: [{ name: '', institution: '', year: new Date().getFullYear(), file: null as File | null }],
    certificationFiles: [] as File[],
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
      certifications: [...prev.certifications, { name: '', institution: '', year: new Date().getFullYear(), file: null }]
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
    
    try {
      // Salva candidatura su Firebase
      const applicationData = {
        // Dati personali
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        
        // Esperienza
        certifications: formData.certifications,
        yearsOfExperience: formData.yearsOfExperience,
        languages: formData.languages,
        
        // Specializzazioni
        lifeArea: formData.lifeAreas[0] || null, // Solo 1 area
        clientTypes: formData.clientTypes,
        problemsAddressed: formData.problemsAddressed,
        coachingMethod: formData.coachingMethod,
        
        // Servizio
        sessionMode: formData.sessionMode,
        location: formData.location,
        averagePrice: formData.averagePrice,
        freeCallAvailable: formData.freeCallAvailable,
        availability: formData.availability,
        
        // Status
        status: 'pending',
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }
      
      await addDoc(collection(db, 'coachApplications'), applicationData)
      
      // Invia email di conferma
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'coach_registration',
            data: {
              name: formData.name,
              email: formData.email,
              lifeAreas: formData.lifeAreas,
              yearsOfExperience: formData.yearsOfExperience,
            }
          })
        })
      } catch (emailError) {
        console.error('Errore invio email:', emailError)
      }
      
      router.push('/coach/register/success')
    } catch (error) {
      console.error('Errore durante la registrazione:', error)
      alert('Errore durante la registrazione. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
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
                  <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-300 transition-colors cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          updateForm('photo', file)
                        }
                      }}
                    />
                    {formData.photo ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={URL.createObjectURL(formData.photo)} 
                          alt="Anteprima" 
                          className="w-24 h-24 rounded-full object-cover mb-2"
                        />
                        <p className="text-sm text-green-600 font-medium">
                          ✓ {formData.photo.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Clicca per cambiare
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Trascina un'immagine o clicca per caricare
                        </p>
                      </>
                    )}
                  </label>
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Bio professionale *</label>
                    <span className={`text-xs ${formData.bio.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                      {formData.bio.length}/500
                    </span>
                  </div>
                  <textarea
                    className={`input min-h-[120px] mt-2 ${formData.bio.length > 500 ? 'border-red-500' : ''}`}
                    value={formData.bio}
                    onChange={(e) => updateForm('bio', e.target.value)}
                    placeholder="Descrivi la tua esperienza e il tuo approccio al coaching..."
                    maxLength={550}
                    required
                  />
                  {formData.bio.length > 500 && (
                    <p className="text-red-500 text-xs mt-1">Massimo 500 caratteri</p>
                  )}
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
                    <div key={index} className="bg-gray-50 rounded-xl p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="md:col-span-1">
                          <label className="text-xs text-gray-500 mb-1 block">Nome certificazione</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="Es: ICF PCC, AICP, Life Coach"
                            value={cert.name}
                            onChange={(e) => updateCertification(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="text-xs text-gray-500 mb-1 block">Ente / Istituzione</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="Es: ICF Italia, AICP"
                            value={cert.institution}
                            onChange={(e) => updateCertification(index, 'institution', e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Anno</label>
                            <input
                              type="number"
                              className="input"
                              placeholder="2024"
                              min={1990}
                              max={2030}
                              value={cert.year}
                              onChange={(e) => updateCertification(index, 'year', parseInt(e.target.value))}
                            />
                          </div>
                          {formData.certifications.length > 1 && (
                            <button
                              onClick={() => removeCertification(index)}
                              className="self-end p-3 text-red-500 hover:bg-red-100 rounded-xl transition-colors"
                              title="Rimuovi certificazione"
                            >
                              <X size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Upload certificazione */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Carica certificato (PDF o immagine)</label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                            <Upload size={18} className="text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {cert.file ? cert.file.name : 'Scegli file...'}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  updateCertification(index, 'file', file)
                                }
                              }}
                            />
                          </label>
                          {cert.file && (
                            <button
                              onClick={() => updateCertification(index, 'file', null)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Max 5MB - PDF, JPG, PNG</p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addCertification}
                    className="flex items-center gap-2 text-primary-500 text-sm font-medium mt-2 hover:text-primary-600 transition-colors"
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
                      max={50}
                      placeholder="Es: 5"
                      value={formData.yearsOfExperience}
                      onChange={(e) => updateForm('yearsOfExperience', parseInt(e.target.value) || 0)}
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
                  <label className="label">Area di specializzazione * <span className="text-gray-400 font-normal">(scegli 1 area)</span></label>
                  <p className="text-sm text-gray-500 mb-3">Seleziona l'area in cui sei più specializzato/a</p>
                  <div className="flex flex-wrap gap-2">
                    {LIFE_AREAS.map(area => (
                      <button
                        key={area.id}
                        onClick={() => {
                          // Solo 1 area selezionabile
                          if (formData.lifeAreas.includes(area.id)) {
                            updateForm('lifeAreas', [])
                          } else {
                            updateForm('lifeAreas', [area.id])
                          }
                        }}
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
