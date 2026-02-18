'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, ArrowLeft, Check, Eye, EyeOff, Loader2, 
  Mail, Lock, User, Upload, Camera, Calendar, Sparkles
} from 'lucide-react'
import { doc, setDoc, getDocs, collection, query, where, updateDoc, serverTimestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, auth, storage } from '@/lib/firebase'
import Logo from '@/components/Logo'

const STEPS = [
  { title: 'Crea account', icon: Lock },
  { title: 'Il tuo profilo', icon: User },
  { title: 'Disponibilità', icon: Calendar },
]

function CoachRegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email') || ''
  
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [applicationData, setApplicationData] = useState<any>(null)
  const [loadingApp, setLoadingApp] = useState(true)

  // Form data
  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  // Profilo extra
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [motivation, setMotivation] = useState('') // Il mio scopo
  
  // Disponibilità
  const [availability, setAvailability] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  })

  const dayLabels: Record<string, string> = {
    monday: 'LUN',
    tuesday: 'MAR',
    wednesday: 'MER',
    thursday: 'GIO',
    friday: 'VEN',
    saturday: 'SAB',
    sunday: 'DOM',
  }

  // Cerca la candidatura approvata per questa email
  useEffect(() => {
    const findApplication = async () => {
      if (!email) { setLoadingApp(false); return }
      try {
        const q = query(
          collection(db, 'coachApplications'),
          where('email', '==', email),
          where('status', '==', 'approved')
        )
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const appDoc = snapshot.docs[0]
          setApplicationData({ id: appDoc.id, ...appDoc.data() })
        }
      } catch (err) {
        console.error('Errore ricerca candidatura:', err)
      } finally {
        setLoadingApp(false)
      }
    }
    findApplication()
  }, [email])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleNext = () => {
    setError('')
    
    if (currentStep === 0) {
      if (!email || !password) { setError('Compila tutti i campi'); return }
      if (password.length < 8) { setError('La password deve avere almeno 8 caratteri'); return }
      if (password !== confirmPassword) { setError('Le password non corrispondono'); return }
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    setError('')
    if (!termsAccepted) { setError('Devi accettare i termini di servizio'); return }
    
    setIsSubmitting(true)

    try {
      // 1. Crea account Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const userId = userCredential.user.uid
      const coachName = applicationData?.name || email.split('@')[0]

      // 2. Upload foto se presente
      let photoURL = ''
      if (photo) {
        try {
          const photoRef = ref(storage, `coaches/${userId}/profile.jpg`)
          await uploadBytes(photoRef, photo)
          photoURL = await getDownloadURL(photoRef)
        } catch (photoErr) {
          console.error('Errore upload foto:', photoErr)
        }
      }

      // 3. Aggiorna profilo Auth
      await updateProfile(userCredential.user, { 
        displayName: coachName,
        photoURL: photoURL || undefined
      })

      // 4. Crea documento utente
      await setDoc(doc(db, 'users', userId), {
        name: coachName,
        email: email,
        photo: photoURL,
        role: 'coach',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // 5. Se c'è una candidatura approvata, collegala e aggiorna con i dati extra
      if (applicationData?.id) {
        await updateDoc(doc(db, 'coachApplications', applicationData.id), {
          userId: userId,
          authLinked: true,
          ...(photoURL && { photo: photoURL }),
          ...(motivation && { motivation: motivation }),
          availability: availability,
          registeredAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }

      // 6. Redirect alla dashboard coach
      router.push('/coach/dashboard')
    } catch (error: any) {
      console.error('Errore registrazione:', error)
      if (error.code === 'auth/email-already-in-use') {
        setError('Questa email è già registrata. Prova ad accedere dalla pagina di login.')
      } else if (error.code === 'auth/weak-password') {
        setError('La password è troppo debole. Usa almeno 8 caratteri.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Email non valida.')
      } else {
        setError('Errore durante la registrazione. Riprova.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <span className="text-sm text-gray-500">Registrazione Coach</span>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-lg mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                index < currentStep ? 'bg-green-500 text-white' :
                index === currentStep ? 'bg-primary-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {index < currentStep ? <Check size={18} /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-16 sm:w-24 h-1 mx-2 rounded transition-colors ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-3">{STEPS[currentStep].title}</p>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-sm p-8"
          >

            {/* ===== STEP 0: Account ===== */}
            {currentStep === 0 && (
              <div>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="text-green-600" size={28} />
                  </div>
                  <h2 className="text-xl font-display font-bold text-charcoal mb-1">
                    Benvenuto su CoachaMi!
                  </h2>
                  <p className="text-gray-500 text-sm">
                    La tua candidatura è stata approvata. Crea il tuo account.
                  </p>
                </div>

                {/* Application found */}
                {applicationData && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                        <User className="text-green-700" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">{applicationData.name}</p>
                        <p className="text-sm text-green-600">Candidatura approvata ✓</p>
                      </div>
                    </div>
                  </div>
                )}

                {!loadingApp && !applicationData && email && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-amber-700">
                      ⚠️ Non abbiamo trovato una candidatura approvata per questa email.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="La stessa email della candidatura"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Crea una password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Minimo 8 caratteri" minLength={8} required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'} value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ripeti la password" minLength={8} required
                      />
                    </div>
                    {password && confirmPassword && password !== confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">Le password non corrispondono</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 1: Profilo Extra ===== */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl font-display font-bold text-charcoal mb-1">Completa il tuo profilo</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Queste informazioni saranno visibili ai coachee.
                </p>

                {/* Photo Upload */}
                <div className="flex justify-center mb-6">
                  <label className="cursor-pointer group relative">
                    <div className={`w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed transition-colors ${
                      photoPreview ? 'border-green-400' : 'border-gray-300 group-hover:border-primary-500'
                    }`}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 group-hover:bg-primary-50 transition-colors">
                          <Camera className="text-gray-400 group-hover:text-primary-500 mb-1" size={24} />
                          <span className="text-xs text-gray-400 group-hover:text-primary-500">Foto profilo</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    {photoPreview && (
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </label>
                </div>

                {/* Motivation / Scopo */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Il mio scopo come coach
                  </label>
                  <p className="text-xs text-gray-400 mb-2">Perché fai coaching? Cosa ti motiva?</p>
                  <textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Es: Aiuto le persone a superare i momenti di transizione e a trovare chiarezza nei propri obiettivi..."
                  />
                  <span className={`text-xs ${motivation.length > 450 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {motivation.length}/500
                  </span>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                  <Sparkles size={16} className="inline mr-1" />
                  I dati della tua candidatura (bio, certificazioni, specializzazioni) sono già salvati. 
                  Qui puoi aggiungere foto e scopo.
                </div>
              </div>
            )}

            {/* ===== STEP 2: Disponibilità ===== */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-xl font-display font-bold text-charcoal mb-1">La tua disponibilità</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Seleziona i giorni in cui sei disponibile per le sessioni.
                </p>

                {/* Giorni */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Giorni disponibili</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dayLabels).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAvailability(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className={`w-16 h-14 rounded-xl text-sm font-semibold transition-all ${
                          availability[key as keyof typeof availability]
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    💡 Potrai configurare gli orari specifici dalla tua dashboard dopo la registrazione.
                  </p>
                </div>

                {/* Terms */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox" id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-primary-500 mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                      Accetto i <a href="/terms" className="text-primary-500 underline">Termini di Servizio</a> e 
                      la <a href="/privacy" className="text-primary-500 underline">Privacy Policy</a>.
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mt-4">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              {currentStep > 0 ? (
                <button onClick={handleBack} className="flex items-center gap-2 text-gray-500 hover:text-charcoal transition-colors">
                  <ArrowLeft size={18} /> Indietro
                </button>
              ) : (
                <div />
              )}
              
              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-8 rounded-xl transition-colors flex items-center gap-2"
                >
                  Continua <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !termsAccepted}
                  className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={18} /> Creazione account...</>
                  ) : (
                    <>Completa registrazione <Check size={18} /></>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Hai già un account?{' '}
          <a href="/login" className="text-primary-500 font-medium hover:underline">Accedi</a>
        </p>
      </div>
    </div>
  )
}

export default function CoachRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    }>
      <CoachRegisterContent />
    </Suspense>
  )
}
