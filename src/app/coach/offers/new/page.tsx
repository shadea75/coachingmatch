'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  Euro,
  Users,
  Package,
  FileText,
  User,
  Calculator,
  Info,
  AlertCircle,
  Check,
  Clock,
  Calendar
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore'

// Configurazione piattaforma
const PLATFORM_CONFIG = {
  coachPercent: 70, // Coach riceve il 70%
  platformPercent: 30, // CoachaMi trattiene il 30%
  vatPercent: 22, // IVA sulla commissione CoachaMi
  minPricePerSession: 30,
  maxSessions: 20,
  offerValidDays: 7,
}

// Calcola pricing CORRETTO
// Il coachee paga €100 → Coach riceve €70, CoachaMi tiene €30 (di cui €24,59 netti + €5,41 IVA)
function calculatePricing(priceTotal: number, totalSessions: number) {
  const pricePerSession = priceTotal / totalSessions
  
  // Split 70/30 sul LORDO pagato dal coachee
  const coachPayoutTotal = priceTotal * (PLATFORM_CONFIG.coachPercent / 100) // 70%
  const platformFeeTotal = priceTotal * (PLATFORM_CONFIG.platformPercent / 100) // 30%
  
  // L'IVA si calcola solo sulla commissione CoachaMi (è il nostro ricavo)
  const platformFeeNet = platformFeeTotal / (1 + PLATFORM_CONFIG.vatPercent / 100) // Netto
  const platformVatAmount = platformFeeTotal - platformFeeNet // IVA su commissione
  
  return {
    priceTotal, // €400 - pagato dal coachee
    pricePerSession: Math.round(pricePerSession * 100) / 100, // €100
    coachPayoutTotal: Math.round(coachPayoutTotal * 100) / 100, // €280 - al coach
    platformFeeTotal: Math.round(platformFeeTotal * 100) / 100, // €120 - a CoachaMi (lordo)
    platformFeeNet: Math.round(platformFeeNet * 100) / 100, // €98,36 - guadagno netto CoachaMi
    platformVatAmount: Math.round(platformVatAmount * 100) / 100, // €21,64 - IVA da versare
    perSessionCoachPayout: Math.round((coachPayoutTotal / totalSessions) * 100) / 100, // €70
    perSessionPlatformFee: Math.round((platformFeeTotal / totalSessions) * 100) / 100, // €30
  }
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

interface Coachee {
  id: string
  name: string
  email: string
  photoURL?: string
}

export default function NewOfferPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Lista coachee
  const [coachees, setCoachees] = useState<Coachee[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCoachee, setSelectedCoachee] = useState<Coachee | null>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    title: 'Percorso di Coaching',
    description: '',
    totalSessions: 4,
    sessionDuration: 60,
    priceTotal: 400,
    validDays: 7,
    coachNotes: ''
  })
  
  // Calcoli
  const pricing = calculatePricing(formData.priceTotal, formData.totalSessions)
  
  // Carica coachee (utenti che hanno interagito con il coach)
  useEffect(() => {
    const loadCoachees = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Carica tutti gli utenti coachee
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'coachee')
        )
        const snapshot = await getDocs(usersQuery)
        const loadedCoachees: Coachee[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.data().email?.split('@')[0] || 'Utente',
          email: doc.data().email || '',
          photoURL: doc.data().photoURL
        }))
        setCoachees(loadedCoachees)
      } catch (err) {
        console.error('Errore caricamento coachee:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadCoachees()
  }, [user?.id])
  
  // Filtra coachee per ricerca
  const filteredCoachees = coachees.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Validazione step
  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return selectedCoachee !== null
      case 2:
        return formData.totalSessions >= 1 && 
               formData.totalSessions <= PLATFORM_CONFIG.maxSessions &&
               formData.sessionDuration >= 30
      case 3:
        return formData.priceTotal >= formData.totalSessions * PLATFORM_CONFIG.minPricePerSession &&
               formData.title.trim().length > 0
      default:
        return true
    }
  }
  
  // Crea offerta
  const handleSubmit = async () => {
    if (!user || !selectedCoachee) return
    
    setError('')
    setIsSubmitting(true)
    
    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + formData.validDays)
      
      // Crea le rate (installments) con calcoli CORRETTI
      const installments = Array.from({ length: formData.totalSessions }, (_, i) => ({
        sessionNumber: i + 1,
        amount: pricing.pricePerSession, // €100 - pagato dal coachee
        coachPayout: pricing.perSessionCoachPayout, // €70 - al coach (70%)
        platformFee: pricing.perSessionPlatformFee, // €30 - a CoachaMi (30%)
        status: 'pending'
      }))
      
      const offerData = {
        // Coach
        coachId: user.id,
        coachName: user.name || 'Coach',
        coachEmail: user.email,
        
        // Coachee
        coacheeId: selectedCoachee.id,
        coacheeName: selectedCoachee.name,
        coacheeEmail: selectedCoachee.email,
        
        // Dettagli
        title: formData.title.trim(),
        description: formData.description.trim(),
        
        // Sessioni
        totalSessions: formData.totalSessions,
        sessionDuration: formData.sessionDuration,
        completedSessions: 0,
        
        // Pricing CORRETTO
        priceTotal: pricing.priceTotal, // €400 - totale pagato dal coachee
        pricePerSession: pricing.pricePerSession, // €100 - per sessione
        coachPayoutTotal: pricing.coachPayoutTotal, // €280 - totale al coach (70%)
        platformFeeTotal: pricing.platformFeeTotal, // €120 - totale a CoachaMi (30%)
        platformFeeNet: pricing.platformFeeNet, // €98,36 - guadagno netto CoachaMi
        
        // Rate
        installments,
        paidInstallments: 0,
        
        // Status
        status: 'pending',
        validUntil,
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      const docRef = await addDoc(collection(db, 'offers'), offerData)
      
      // Invia notifica al coachee
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_offer',
            data: {
              coacheeEmail: selectedCoachee.email,
              coacheeName: selectedCoachee.name,
              coachName: user.name || 'Il tuo coach',
              offerTitle: formData.title,
              totalSessions: formData.totalSessions,
              priceTotal: pricing.priceTotal,
              pricePerSession: pricing.pricePerSession,
              validDays: formData.validDays,
              offerId: docRef.id
            }
          })
        })
      } catch (emailErr) {
        console.error('Errore invio email:', emailErr)
      }
      
      setSuccess(true)
      
      // Redirect dopo 2 secondi
      setTimeout(() => {
        router.push('/coach/offers')
      }, 2000)
      
    } catch (err: any) {
      console.error('Errore creazione offerta:', err)
      setError(err.message || 'Errore durante la creazione dell\'offerta')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-charcoal mb-2">Offerta Inviata!</h2>
          <p className="text-gray-600 mb-6">
            {selectedCoachee?.name} riceverà una notifica e potrà accettare l'offerta.
          </p>
          <p className="text-sm text-gray-500">Reindirizzamento in corso...</p>
        </motion.div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/coach/offers" className="flex items-center gap-2 text-gray-600 hover:text-charcoal">
            <ArrowLeft size={20} />
            <span>Indietro</span>
          </Link>
          <Logo className="h-8" />
          <div className="w-20" />
        </div>
      </header>
      
      {/* Progress */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step ? 'bg-green-500 text-white' :
                  s === step ? 'bg-primary-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {s < step ? <Check size={16} /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-24 sm:w-32 h-1 mx-2 rounded ${
                    s < step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Destinatario</span>
            <span>Sessioni</span>
            <span>Prezzo</span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Step 1: Seleziona coachee */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-500" />
                Seleziona il destinatario
              </h2>
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per nome o email..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredCoachees.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nessun coachee trovato
                    </p>
                  ) : (
                    filteredCoachees.map((coachee) => (
                      <button
                        key={coachee.id}
                        onClick={() => setSelectedCoachee(coachee)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedCoachee?.id === coachee.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                            {coachee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-charcoal">{coachee.name}</p>
                            <p className="text-sm text-gray-500">{coachee.email}</p>
                          </div>
                          {selectedCoachee?.id === coachee.id && (
                            <Check size={20} className="ml-auto text-primary-500" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Step 2: Configura sessioni */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Package size={20} className="text-primary-500" />
                Numero di sessioni
              </h2>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[4, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => setFormData({ ...formData, totalSessions: num })}
                    className={`py-3 rounded-xl font-medium transition-colors ${
                      formData.totalSessions === num
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              <input
                type="number"
                min={1}
                max={PLATFORM_CONFIG.maxSessions}
                value={formData.totalSessions}
                onChange={(e) => setFormData({ ...formData, totalSessions: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Clock size={20} className="text-primary-500" />
                Durata sessione
              </h2>
              
              <div className="grid grid-cols-3 gap-2">
                {[45, 60, 90].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setFormData({ ...formData, sessionDuration: dur })}
                    className={`py-3 rounded-xl font-medium transition-colors ${
                      formData.sessionDuration === dur
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {dur} min
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Step 3: Prezzo e riepilogo */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Titolo */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary-500" />
                Titolo del percorso
              </h2>
              
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Es: Percorso di Life Coaching"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione opzionale..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mt-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            {/* Prezzo */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Euro size={20} className="text-primary-500" />
                Prezzo Totale
              </h2>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
                <input
                  type="number"
                  min={formData.totalSessions * PLATFORM_CONFIG.minPricePerSession}
                  step={10}
                  value={formData.priceTotal || ''}
                  onChange={(e) => setFormData({ ...formData, priceTotal: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-4 border border-gray-200 rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                Minimo: {formatCurrency(formData.totalSessions * PLATFORM_CONFIG.minPricePerSession)} 
                ({formatCurrency(PLATFORM_CONFIG.minPricePerSession)} per sessione)
              </p>
              
              {/* Prezzi suggeriti */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Prezzi suggeriti:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    formData.totalSessions * 50,
                    formData.totalSessions * 70,
                    formData.totalSessions * 100,
                    formData.totalSessions * 120,
                  ].map(price => (
                    <button
                      key={price}
                      type="button"
                      onClick={() => setFormData({ ...formData, priceTotal: price })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        formData.priceTotal === price
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {formatCurrency(price)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Calcolo guadagno CORRETTO */}
            {formData.priceTotal >= formData.totalSessions * PLATFORM_CONFIG.minPricePerSession && (
              <div className="bg-green-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator size={20} className="text-green-600" />
                  <span className="font-semibold text-green-700">Riepilogo economico</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prezzo totale (pagato dal coachee)</span>
                    <span className="font-semibold">{formatCurrency(pricing.priceTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">÷ {formData.totalSessions} sessioni</span>
                    <span>{formatCurrency(pricing.pricePerSession)} / sessione</span>
                  </div>
                  
                  <div className="border-t border-green-200 pt-3 mt-3">
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Commissione CoachaMi (30%)</span>
                      <span>-{formatCurrency(pricing.platformFeeTotal)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-green-200 pt-3">
                    <div className="flex justify-between text-green-700">
                      <span className="font-semibold">Il tuo guadagno totale (70%)</span>
                      <span className="text-xl font-bold">{formatCurrency(pricing.coachPayoutTotal)}</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      = {formatCurrency(pricing.perSessionCoachPayout)} per ogni sessione
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Info pagamento a rate */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Come funziona il pagamento</p>
                <ul className="space-y-1 text-blue-600">
                  <li>• {selectedCoachee?.name} pagherà {formatCurrency(pricing.pricePerSession)} prima di ogni sessione</li>
                  <li>• Riceverai {formatCurrency(pricing.perSessionCoachPayout)} per ogni sessione</li>
                  <li>• Dovrai emettere fattura a CoachaMi per ricevere il pagamento</li>
                </ul>
              </div>
            </div>
            
            {/* Riepilogo offerta */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-4">Riepilogo Offerta</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Coachee</span>
                  <span className="font-medium">{selectedCoachee?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Percorso</span>
                  <span className="font-medium">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sessioni</span>
                  <span className="font-medium">{formData.totalSessions} x {formData.sessionDuration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prezzo totale</span>
                  <span className="font-medium">{formatCurrency(pricing.priceTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rata per sessione</span>
                  <span className="font-medium">{formatCurrency(pricing.pricePerSession)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tuo guadagno per sessione</span>
                  <span className="font-medium text-green-600">{formatCurrency(pricing.perSessionCoachPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Validità offerta</span>
                  <span className="font-medium">{formData.validDays} giorni</span>
                </div>
              </div>
            </div>
            
            {/* Error */}
            {error && (
              <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3 text-red-600">
                <AlertCircle size={20} />
                {error}
              </div>
            )}
          </motion.div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Indietro
            </button>
          )}
          
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!isStepValid(step)}
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continua
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isStepValid(3) || isSubmitting}
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Invia Offerta
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
