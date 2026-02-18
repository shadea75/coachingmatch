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
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, auth, storage } from '@/lib/firebase'
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
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    // Step 1 - Info personali
    name: '',
    email: '',
    password: '',
    photo: null as File | null,
    photoPreview: '',
    bio: '', // "La mia storia, la mia missione"
    motivation: '', // "Il mio scopo"
    
    // Step 2 - Esperienza
    certifications: [{ name: '', institution: '', year: new Date().getFullYear(), file: null as File | null }],
    education: [''], // Formazione/studi
    certificationFiles: [] as File[],
    yearsOfExperience: 0,
    languages: ['Italiano'],
    sessionMode: ['online'] as ('online' | 'presence')[],
    location: '',
    averagePrice: 100,
    freeCallAvailable: true,
    
    // Step 3 - Specializzazioni
    lifeAreas: [] as LifeAreaId[],
    clientTypes: [] as string[],
    problemsAddressed: [] as string[],
    coachingMethod: [] as string[],
    style: [] as string[],
    
    // Step 4 - Disponibilità
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

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateForm('photo', file)
      const reader = new FileReader()
      reader.onloadend = () => {
        updateForm('photoPreview', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleNext = () => {
    setError('')
    
    // Validazione step 1
    if (currentStep === 0) {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Compila tutti i campi obbligatori')
        return
      }
      if (formData.password.length < 8) {
        setError('La password deve essere di almeno 8 caratteri')
        return
      }
      if (!formData.bio) {
        setError('Inserisci una breve bio professionale')
        return
      }
    }
    
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
    setError('')
    
    try {
      // 1. Crea l'utente in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      )
      const userId = userCredential.user.uid
      
      // 2. Aggiorna il profilo con il nome
      await updateProfile(userCredential.user, {
        displayName: formData.name
      })
      
      // 3. Foto sarà caricata dopo dalle impostazioni (evita errori CORS)
      let photoURL = ''
      
      // 4. Crea documento utente in Firestore
      await setDoc(doc(db, 'users', userId), {
        name: formData.name,
        email: formData.email,
        photo: photoURL,
        role: 'pending_coach', // In attesa di approvazione admin
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // 5. Crea la candidatura coach
      const applicationData = {
        userId: userId,
        // Dati personali
        name: formData.name,
        email: formData.email,
        photo: photoURL,
        bio: formData.bio, // La mia storia
        motivation: formData.motivation, // Il mio scopo
        
        // Esperienza e formazione
        certifications: formData.certifications.map(c => ({
          name: c.name,
          institution: c.institution,
          year: c.year
        })),
        education: formData.education.filter(e => e.trim() !== ''), // Formazione/studi
        experience: {
          yearsCoaching: formData.yearsOfExperience,
          certifications: formData.certifications.map(c => c.name).filter(n => n)
        },
        yearsOfExperience: formData.yearsOfExperience,
        languages: formData.languages,
        
        // Specializzazioni
        lifeArea: formData.lifeAreas[0] || null,
        specializations: {
          focusTopics: formData.problemsAddressed,
          targetAudience: formData.clientTypes
        },
        clientTypes: formData.clientTypes,
        problemsAddressed: formData.problemsAddressed,
        coachingMethod: formData.coachingMethod,
        style: formData.style,
        
        // Servizio
        sessionMode: formData.sessionMode,
        location: formData.location,
        averagePrice: formData.averagePrice,
        hourlyRate: formData.averagePrice,
        freeCallAvailable: formData.freeCallAvailable,
        availability: formData.availability,
        
        // Status
        status: 'pending',
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }
      
      // Usa lo stesso ID dell'utente per coachApplications
      await setDoc(doc(db, 'coachApplications', userId), applicationData)
      
      // 6. Invia email di conferma
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
    } catch (error: any) {
      console.error('Errore durante la registrazione:', error)
      
      if (error.code === 'auth/email-already-in-use') {
        setError('Questa email è già registrata. Prova ad accedere.')
      } else if (error.code === 'auth/weak-password') {
        setError('La password è troppo debole. Usa almeno 8 caratteri.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Email non valida.')
      } else {
        setError(error.message || 'Errore durante la registrazione. Riprova.')
      }
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
          <p className="text-center text-sm text-gray-500">
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
            className="bg-white rounded-2xl p-6 md:p-8 shadow-sm"
          >
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}
            
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
                      placeholder="Mario Rossi"
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
                      placeholder="mario@email.com"
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
                    placeholder="Minimo 8 caratteri"
                    minLength={8}
                    required
                  />
                </div>
                
                <div>
                  <label className="label">La mia storia, la mia missione *</label>
                  <p className="text-xs text-gray-500 mb-2">Racconta chi sei, il tuo percorso e cosa ti ha portato a diventare coach</p>
                  <textarea
                    className="input min-h-[120px]"
                    value={formData.bio}
                    onChange={(e) => updateForm('bio', e.target.value)}
                    placeholder="La mia passione per il coaching nasce da..."
                    maxLength={1000}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formData.bio.length}/1000
                  </p>
                </div>
                
                <div>
                  <label className="label">Il mio scopo</label>
                  <p className="text-xs text-gray-500 mb-2">Qual è la tua missione? Cosa vuoi aiutare le persone a raggiungere?</p>
                  <textarea
                    className="input min-h-[100px]"
                    value={formData.motivation}
                    onChange={(e) => updateForm('motivation', e.target.value)}
                    placeholder="Il mio scopo è aiutare le persone a..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formData.motivation.length}/500
                  </p>
                </div>
              </div>
            )}
            
            {/* Step 2: Experience */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold text-charcoal mb-6">
                  La tua esperienza
                </h2>
                
                <div>
                  <label className="label">Certificazioni di coaching</label>
                  {formData.certifications.map((cert, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 mb-3">
                      <div className="grid md:grid-cols-3 gap-3 mb-3">
                        <input
                          type="text"
                          className="input"
                          value={cert.name}
                          onChange={(e) => updateCertification(index, 'name', e.target.value)}
                          placeholder="Nome certificazione"
                        />
                        <input
                          type="text"
                          className="input"
                          value={cert.institution}
                          onChange={(e) => updateCertification(index, 'institution', e.target.value)}
                          placeholder="Ente certificatore"
                        />
                        <input
                          type="number"
                          className="input"
                          value={cert.year}
                          onChange={(e) => updateCertification(index, 'year', parseInt(e.target.value))}
                          placeholder="Anno"
                        />
                      </div>
                      {formData.certifications.length > 1 && (
                        <button
                          onClick={() => removeCertification(index)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addCertification}
                    className="text-primary-500 text-sm font-medium flex items-center gap-1 hover:underline"
                  >
                    <Plus size={16} /> Aggiungi certificazione
                  </button>
                </div>
                
                <div>
                  <label className="label">Formazione e studi</label>
                  <p className="text-xs text-gray-500 mb-2">Lauree, master, corsi rilevanti</p>
                  {formData.education.map((edu, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="input flex-1"
                        value={edu}
                        onChange={(e) => {
                          const newEdu = [...formData.education]
                          newEdu[index] = e.target.value
                          updateForm('education', newEdu)
                        }}
                        placeholder="Es: Laurea in Psicologia - Università di Milano"
                      />
                      {formData.education.length > 1 && (
                        <button
                          onClick={() => {
                            const newEdu = formData.education.filter((_, i) => i !== index)
                            updateForm('education', newEdu)
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => updateForm('education', [...formData.education, ''])}
                    className="text-primary-500 text-sm font-medium flex items-center gap-1 hover:underline"
                  >
                    <Plus size={16} /> Aggiungi formazione
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Anni di esperienza</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.yearsOfExperience}
                      onChange={(e) => updateForm('yearsOfExperience', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  
                  <div>
                    <label className="label">Prezzo medio sessione (€)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.averagePrice}
                      onChange={(e) => updateForm('averagePrice', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="label">Modalità sessioni</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const modes = formData.sessionMode.includes('online')
                          ? formData.sessionMode.filter(m => m !== 'online')
                          : [...formData.sessionMode, 'online'] as ('online' | 'presence')[]
                        updateForm('sessionMode', modes)
                      }}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-medium transition-all
                        ${formData.sessionMode.includes('online')
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}
                    >
                      Online
                    </button>
                    <button
                      onClick={() => {
                        const modes = formData.sessionMode.includes('presence')
                          ? formData.sessionMode.filter(m => m !== 'presence')
                          : [...formData.sessionMode, 'presence'] as ('online' | 'presence')[]
                        updateForm('sessionMode', modes)
                      }}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-medium transition-all
                        ${formData.sessionMode.includes('presence')
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}
                    >
                      In presenza
                    </button>
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
                  {isSubmitting ? 'Registrazione in corso...' : 'Completa registrazione'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
