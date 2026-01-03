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
  platformFeePercent: 30,
  vatPercent: 22,
  minPricePerSession: 30,
  maxSessions: 20,
  offerValidDays: 7,
}

// Calcola pricing
function calculatePricing(priceTotal: number, totalSessions: number) {
  const pricePerSession = priceTotal / totalSessions
  const priceNet = priceTotal / (1 + PLATFORM_CONFIG.vatPercent / 100)
  const vatAmount = priceTotal - priceNet
  const platformFeeTotal = priceNet * (PLATFORM_CONFIG.platformFeePercent / 100)
  const coachPayoutTotal = priceNet - platformFeeTotal
  
  return {
    priceTotal,
    pricePerSession: Math.round(pricePerSession * 100) / 100,
    priceNet: Math.round(priceNet * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    platformFeeTotal: Math.round(platformFeeTotal * 100) / 100,
    coachPayoutTotal: Math.round(coachPayoutTotal * 100) / 100,
    perSessionCoachPayout: Math.round((coachPayoutTotal / totalSessions) * 100) / 100,
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
      
      // Crea le rate (installments)
      const installments = Array.from({ length: formData.totalSessions }, (_, i) => ({
        sessionNumber: i + 1,
        amount: pricing.pricePerSession,
        amountNet: pricing.priceNet / formData.totalSessions,
        vatAmount: pricing.vatAmount / formData.totalSessions,
        platformFee: pricing.platformFeeTotal / formData.totalSessions,
        coachPayout: pricing.coachPayoutTotal / formData.totalSessions,
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
        
        // Pricing
        priceTotal: pricing.priceTotal,
        pricePerSession: pricing.pricePerSession,
        priceNet: pricing.priceNet,
        vatAmount: pricing.vatAmount,
        platformFeeTotal: pricing.platformFeeTotal,
        coachPayoutTotal: pricing.coachPayoutTotal,
        
        // Rate
        installments,
        paidInstallments: 0,
        
        // Stato
        status: 'pending',
        
        // Date
        createdAt: serverTimestamp(),
        sentAt: serverTimestamp(),
        validUntil,
        
        // Note
        coachNotes: formData.coachNotes.trim() || null,
      }
      
      const docRef = await addDoc(collection(db, 'offers'), offerData)
      
      // Invia email notifica al coachee
      try {
        await fetch('/api/emails/offer-created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coacheeEmail: selectedCoachee.email,
            coacheeName: selectedCoachee.name,
            coachName: user.name || 'Il tuo coach',
            offerTitle: formData.title.trim(),
            totalSessions: formData.totalSessions,
            sessionDuration: formData.sessionDuration,
            priceTotal: pricing.priceTotal,
            pricePerSession: pricing.pricePerSession,
            offerId: docRef.id
          })
        })
      } catch (emailErr) {
        console.error('Errore invio email:', emailErr)
        // Non blocchiamo il flusso se l'email fallisce
      }
      
      setSuccess(true)
      
      // Redirect dopo 2 secondi
      setTimeout(() => {
        router.push('/coach/offers')
      }, 2000)
      
    } catch (err: any) {
      console.error('Errore creazione offerta:', err)
      setError('Errore durante la creazione dell\'offerta. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Se non è coach
  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Accesso riservato ai coach</p>
          <Link href="/login" className="text-primary-500 hover:underline">
            Accedi
          </Link>
        </div>
      </div>
    )
  }
  
  // Successo
  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 text-center max-w-md mx-4"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-charcoal mb-2">Offerta inviata!</h2>
          <p className="text-gray-500 mb-4">
            {selectedCoachee?.name} riceverà una notifica e potrà accettare l'offerta.
          </p>
          <p className="text-sm text-gray-400">Reindirizzamento...</p>
        </motion.div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coach/offers"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Nuova Offerta</h1>
                <p className="text-sm text-gray-500">Step {step} di 3</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      {/* Progress bar */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`flex-1 h-1 ${s <= step ? 'bg-primary-500' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </div>
      
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Step 1: Seleziona Coachee */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Users size={20} className="text-primary-500" />
                Seleziona il Coachee
              </h2>
              
              {/* Ricerca */}
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              
              {/* Lista coachee */}
              {isLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
                </div>
              ) : filteredCoachees.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <User size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Nessun coachee trovato</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredCoachees.map((coachee) => (
                    <button
                      key={coachee.id}
                      onClick={() => setSelectedCoachee(coachee)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        selectedCoachee?.id === coachee.id
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        {coachee.photoURL ? (
                          <img src={coachee.photoURL} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-primary-600 font-semibold">
                            {coachee.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-charcoal">{coachee.name}</p>
                        <p className="text-sm text-gray-500">{coachee.email}</p>
                      </div>
                      {selectedCoachee?.id === coachee.id && (
                        <Check className="text-primary-500" size={20} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Step 2: Dettagli Sessioni */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Package size={20} className="text-primary-500" />
                Dettagli del Percorso
              </h2>
              
              <div className="space-y-4">
                {/* Numero sessioni */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numero di sessioni
                  </label>
                  <div className="flex items-center gap-3">
                    {[1, 2, 4, 6, 8, 10, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, totalSessions: num })}
                        className={`w-12 h-12 rounded-xl font-semibold transition-colors ${
                          formData.totalSessions === num
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Il coachee pagherà una rata prima di ogni sessione
                  </p>
                </div>
                
                {/* Durata sessione */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durata di ogni sessione
                  </label>
                  <div className="flex items-center gap-3">
                    {[30, 45, 60, 90, 120].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setFormData({ ...formData, sessionDuration: min })}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                          formData.sessionDuration === min
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {min} min
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Riepilogo */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Calendar size={18} />
                <span className="font-medium">Riepilogo percorso</span>
              </div>
              <p className="text-blue-600">
                {formData.totalSessions} sessioni da {formData.sessionDuration} minuti ciascuna
              </p>
            </div>
          </motion.div>
        )}
        
        {/* Step 3: Prezzo e Conferma */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Titolo offerta */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary-500" />
                Titolo Offerta
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
                Prezzo Totale (IVA inclusa)
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
            
            {/* Calcolo guadagno */}
            {formData.priceTotal >= formData.totalSessions * PLATFORM_CONFIG.minPricePerSession && (
              <div className="bg-green-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator size={20} className="text-green-600" />
                  <span className="font-semibold text-green-700">Riepilogo economico</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prezzo totale (IVA incl.)</span>
                    <span className="font-semibold">{formatCurrency(pricing.priceTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">÷ {formData.totalSessions} sessioni</span>
                    <span>{formatCurrency(pricing.pricePerSession)} / sessione</span>
                  </div>
                  
                  <div className="border-t border-green-200 pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Imponibile</span>
                      <span>{formatCurrency(pricing.priceNet)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IVA (22%)</span>
                      <span>{formatCurrency(pricing.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Commissione CoachaMi (30%)</span>
                      <span>-{formatCurrency(pricing.platformFeeTotal)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-green-200 pt-3">
                    <div className="flex justify-between text-green-700">
                      <span className="font-semibold">Il tuo guadagno totale</span>
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
                  <li>• Riceverai {formatCurrency(pricing.perSessionCoachPayout)} dopo ogni sessione completata</li>
                  <li>• Le sessioni verranno create automaticamente dopo il pagamento</li>
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
