'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  Euro,
  Clock,
  Package,
  FileText,
  User,
  Calculator,
  Info,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  Offer, 
  OfferType,
  PLATFORM_CONFIG,
  calculateOfferFinancials,
  formatCurrency
} from '@/types/payments'
import { db } from '@/lib/firebase'
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore'

function NewOfferContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const coacheeId = searchParams.get('coacheeId')
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [coachee, setCoachee] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    type: 'single' as OfferType,
    title: '',
    description: '',
    priceTotal: 0,
    sessionsIncluded: 1,
    sessionDuration: 60,
    validDays: 7,
    coachNotes: ''
  })
  
  // Calcoli finanziari
  const financials = calculateOfferFinancials(formData.priceTotal)
  
  // Carica dati coachee
  useEffect(() => {
    const loadCoachee = async () => {
      if (!coacheeId) return
      
      setIsLoading(true)
      try {
        const coacheeDoc = await getDoc(doc(db, 'users', coacheeId))
        if (coacheeDoc.exists()) {
          setCoachee({ id: coacheeDoc.id, ...coacheeDoc.data() })
        }
      } catch (err) {
        console.error('Errore caricamento coachee:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadCoachee()
  }, [coacheeId])
  
  // Prezzi suggeriti
  const suggestedPrices = {
    single: [50, 70, 100, 120, 150],
    package: [180, 250, 350, 450, 600]
  }
  
  // Validazione
  const isValid = () => {
    if (!formData.title.trim()) return false
    if (formData.priceTotal < 10) return false
    if (formData.sessionsIncluded < 1) return false
    if (formData.sessionDuration < 15) return false
    if (!coacheeId || !coachee) return false
    return true
  }
  
  // Invia offerta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!isValid()) {
      setError('Compila tutti i campi obbligatori')
      return
    }
    
    if (!user) {
      setError('Devi essere loggato')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + formData.validDays)
      
      const offerData: Partial<Offer> = {
        // Parti
        coachId: user.id,
        coachName: user.name || 'Coach',
        coachEmail: user.email,
        coacheeId: coachee.id,
        coacheeName: coachee.name || 'Coachee',
        coacheeEmail: coachee.email,
        
        // Dettagli
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        
        // Pricing
        priceTotal: financials.priceTotal,
        priceNet: financials.priceNet,
        vatAmount: financials.vatAmount,
        platformFee: financials.platformFee,
        coachPayout: financials.coachPayout,
        
        // Sessioni
        sessionsIncluded: formData.type === 'package' ? formData.sessionsIncluded : 1,
        sessionDuration: formData.sessionDuration,
        
        // Validità
        validUntil,
        
        // Stato
        status: 'pending',
        
        // Note
        coachNotes: formData.coachNotes.trim() || undefined,
        
        // Timestamp
        createdAt: new Date(),
        sentAt: new Date()
      }
      
      await addDoc(collection(db, 'offers'), {
        ...offerData,
        createdAt: serverTimestamp(),
        sentAt: serverTimestamp(),
        validUntil
      })
      
      // TODO: Inviare notifica email al coachee
      
      router.push('/coach/offers?success=sent')
    } catch (err: any) {
      console.error('Errore invio offerta:', err)
      setError('Errore durante l\'invio. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!user || user.role !== 'coach') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">Accesso riservato ai coach</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coach/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Nuova Offerta</h1>
                <p className="text-sm text-gray-500">Crea un'offerta per un coachee</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 py-6">
        {!coacheeId ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-charcoal mb-2">
              Seleziona un coachee
            </h2>
            <p className="text-gray-500 mb-4">
              Per creare un'offerta devi prima selezionare il coachee destinatario.
            </p>
            <Link 
              href="/coach/coachees"
              className="btn bg-primary-500 text-white hover:bg-primary-600"
            >
              Vai ai miei coachee
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Destinatario */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-500" />
                Destinatario
              </h2>
              
              <div className="flex items-center gap-4 p-4 bg-cream rounded-xl">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-semibold text-lg">
                    {coachee?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-charcoal">{coachee?.name || 'Coachee'}</p>
                  <p className="text-sm text-gray-500">{coachee?.email}</p>
                </div>
              </div>
            </motion.div>
            
            {/* Tipo offerta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Package size={20} className="text-primary-500" />
                Tipo di offerta
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'single', sessionsIncluded: 1 })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.type === 'single'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Clock size={24} className="text-primary-500 mb-2" />
                  <p className="font-semibold text-charcoal">Sessione singola</p>
                  <p className="text-sm text-gray-500">Una sessione di coaching</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'package', sessionsIncluded: 4 })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.type === 'package'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Package size={24} className="text-primary-500 mb-2" />
                  <p className="font-semibold text-charcoal">Pacchetto</p>
                  <p className="text-sm text-gray-500">Più sessioni a prezzo scontato</p>
                </button>
              </div>
            </motion.div>
            
            {/* Dettagli */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary-500" />
                Dettagli offerta
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={formData.type === 'single' 
                      ? 'es. Sessione di coaching carriera' 
                      : 'es. Percorso di 4 sessioni - Crescita personale'}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrivi cosa include questa offerta, obiettivi, metodologia..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {formData.type === 'package' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numero sessioni *
                      </label>
                      <select
                        value={formData.sessionsIncluded}
                        onChange={(e) => setFormData({ ...formData, sessionsIncluded: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                          <option key={n} value={n}>{n} sessioni</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durata sessione *
                    </label>
                    <select
                      value={formData.sessionDuration}
                      onChange={(e) => setFormData({ ...formData, sessionDuration: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={30}>30 minuti</option>
                      <option value={45}>45 minuti</option>
                      <option value={60}>60 minuti</option>
                      <option value={90}>90 minuti</option>
                      <option value={120}>120 minuti</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Prezzo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Euro size={20} className="text-primary-500" />
                Prezzo (IVA inclusa)
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prezzo totale per il coachee *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    <input
                      type="number"
                      min={10}
                      step={1}
                      value={formData.priceTotal || ''}
                      onChange={(e) => setFormData({ ...formData, priceTotal: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                    />
                  </div>
                </div>
                
                {/* Prezzi suggeriti */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Prezzi suggeriti:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrices[formData.type].map(price => (
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
                        €{price}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Calcolo guadagno */}
                {formData.priceTotal >= 10 && (
                  <div className="bg-green-50 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator size={18} className="text-green-600" />
                      <span className="font-medium text-green-700">Il tuo guadagno</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prezzo IVA inclusa</span>
                        <span className="font-medium">{formatCurrency(financials.priceTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Imponibile</span>
                        <span>{formatCurrency(financials.priceNet)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IVA (22%)</span>
                        <span>{formatCurrency(financials.vatAmount)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Commissione CoachaMi (30%)</span>
                        <span>-{formatCurrency(financials.platformFee)}</span>
                      </div>
                      <div className="border-t border-green-200 pt-2 mt-2">
                        <div className="flex justify-between text-green-700 font-semibold">
                          <span>Il tuo guadagno netto</span>
                          <span className="text-lg">{formatCurrency(financials.coachPayout)}</span>
                        </div>
                      </div>
                    </div>
                    {formData.type === 'package' && formData.sessionsIncluded > 1 && (
                      <p className="text-xs text-green-600 mt-2">
                        = {formatCurrency(financials.coachPayout / formData.sessionsIncluded)} per sessione
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Validità */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4">Validità offerta</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  L'offerta scade tra
                </label>
                <select
                  value={formData.validDays}
                  onChange={(e) => setFormData({ ...formData, validDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={3}>3 giorni</option>
                  <option value={7}>7 giorni</option>
                  <option value={14}>14 giorni</option>
                  <option value={30}>30 giorni</option>
                </select>
              </div>
            </motion.div>
            
            {/* Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h2 className="font-semibold text-charcoal mb-4">Note private</h2>
              <textarea
                value={formData.coachNotes}
                onChange={(e) => setFormData({ ...formData, coachNotes: e.target.value })}
                placeholder="Note visibili solo a te (non al coachee)..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </motion.div>
            
            {/* Info */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Come funziona</p>
                <ul className="space-y-1 text-blue-600">
                  <li>• Il coachee riceverà una notifica con la tua offerta</li>
                  <li>• Potrà accettare o rifiutare entro la scadenza</li>
                  <li>• Se accetta, procederà al pagamento</li>
                  <li>• Riceverai il tuo compenso 7 giorni dopo il pagamento</li>
                </ul>
              </div>
            </div>
            
            {/* Error */}
            {error && (
              <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3 text-red-600">
                <AlertCircle size={20} />
                {error}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-4">
              <Link
                href="/coach/dashboard"
                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-center transition-colors"
              >
                Annulla
              </Link>
              <button
                type="submit"
                disabled={!isValid() || isSubmitting}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Invio...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Invia offerta
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default function NewOfferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <NewOfferContent />
    </Suspense>
  )
}
