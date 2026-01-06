'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Euro,
  Calendar,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Copy,
  Check,
  Send,
  CreditCard,
  Shield,
  FileText,
  ExternalLink,
  Info
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'

interface Installment {
  sessionNumber: number
  amount: number
  status: 'pending' | 'paid'
}

export default function NewOfferPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const clientId = params.id as string
  const isCoachaMiClient = searchParams.get('source') === 'coachami'
  const coacheeId = searchParams.get('coacheeId')
  
  const COACHAMI_COMMISSION = 0.30 // 30% commissione per clienti CoachaMi
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [offerLink, setOfferLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [client, setClient] = useState<{ name: string; email: string; coacheeId?: string } | null>(null)
  
  // Stato contratto
  const [contractEnabled, setContractEnabled] = useState(false)
  const [contractConfigured, setContractConfigured] = useState(false)
  const [includeContract, setIncludeContract] = useState(true)
  
  const [offerData, setOfferData] = useState({
    title: '',
    totalSessions: 1,
    sessionDuration: 60,
    pricePerSession: 0,
    description: '',
    // Opzioni pagamento
    allowSinglePayment: true,
    allowInstallments: true,
    installmentFeePercent: 0 // Sovrapprezzo per rateale (0-15%)
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadClient = async () => {
      if (!clientId || !user?.id) return
      
      setIsLoading(true)
      try {
        const clientDoc = await getDoc(doc(db, 'coachClients', clientId))
        if (clientDoc.exists()) {
          const data = clientDoc.data()
          setClient({
            name: data.name,
            email: data.email
          })
        } else {
          setError('Cliente non trovato')
        }
        
        // Carica stato contratto
        const contractDoc = await getDoc(doc(db, 'coachContracts', user.id))
        if (contractDoc.exists()) {
          const contractData = contractDoc.data()
          setContractConfigured(true)
          setContractEnabled(contractData.enabled || false)
          setIncludeContract(contractData.enabled || false)
        }
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadClient()
    }
  }, [clientId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !client) return
    if (!offerData.title || offerData.pricePerSession <= 0) {
      setError('Titolo e prezzo per sessione sono obbligatori')
      return
    }
    if (!offerData.allowSinglePayment && !offerData.allowInstallments) {
      setError('Devi permettere almeno un metodo di pagamento')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const priceTotal = offerData.totalSessions * offerData.pricePerSession
      const installmentFee = offerData.installmentFeePercent / 100
      const priceTotalWithFee = priceTotal * (1 + installmentFee)
      const pricePerSessionWithFee = priceTotalWithFee / offerData.totalSessions
      
      // Crea installments (con eventuale sovrapprezzo)
      const installments: Installment[] = Array.from(
        { length: offerData.totalSessions },
        (_, i) => ({
          sessionNumber: i + 1,
          amount: Math.round(pricePerSessionWithFee * 100) / 100, // Arrotonda a 2 decimali
          status: 'pending' as const
        })
      )
      
      let offerRef
      let generatedLink = ''
      
      if (isCoachaMiClient && coacheeId) {
        // Cliente CoachaMi - salva in collection 'offers' (con commissione 30%)
        offerRef = await addDoc(collection(db, 'offers'), {
          coachId: user.id,
          coachName: user.name || 'Coach',
          coachEmail: user.email,
          coacheeId: coacheeId,
          coacheeName: client.name,
          coacheeEmail: client.email,
          title: offerData.title,
          description: offerData.description || null,
          totalSessions: offerData.totalSessions,
          sessionDuration: offerData.sessionDuration,
          pricePerSession: offerData.pricePerSession,
          priceTotal,
          // Opzioni pagamento
          allowSinglePayment: offerData.allowSinglePayment,
          allowInstallments: offerData.allowInstallments,
          installmentFeePercent: offerData.installmentFeePercent,
          priceTotalWithFee,
          pricePerSessionWithFee: Math.round(pricePerSessionWithFee * 100) / 100,
          installments,
          paidInstallments: 0,
          completedSessions: 0,
          paymentMethod: null,
          // Commissione CoachaMi
          commissionRate: COACHAMI_COMMISSION,
          commissionAmount: priceTotal * COACHAMI_COMMISSION,
          coachEarnings: priceTotal * (1 - COACHAMI_COMMISSION),
          // Validità
          status: 'pending', // Pending finché il coachee non accetta
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 giorni
          source: 'office', // Creata dall'ufficio virtuale
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        
        // Il coachee vedrà l'offerta nella sua pagina /offers
        generatedLink = '' // Non serve link esterno, il coachee lo vede in piattaforma
        
        // TODO: Invia notifica email al coachee
        if (sendEmail) {
          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'new_offer_from_coach',
                data: {
                  coacheeName: client.name,
                  coacheeEmail: client.email,
                  coachName: user.name || 'Coach',
                  offerTitle: offerData.title,
                  totalSessions: offerData.totalSessions,
                  priceTotal: priceTotal,
                  offersPageUrl: `${window.location.origin}/offers`
                }
              })
            })
          } catch (emailErr) {
            console.error('Errore invio email:', emailErr)
          }
        }
        
      } else {
        // Cliente esterno - salva in collection 'externalOffers'
        offerRef = await addDoc(collection(db, 'externalOffers'), {
          coachId: user.id,
          coachName: user.name || 'Coach',
          coachEmail: user.email,
          clientId: clientId,
          clientName: client.name,
          clientEmail: client.email,
          title: offerData.title,
          description: offerData.description || null,
          totalSessions: offerData.totalSessions,
          sessionDuration: offerData.sessionDuration,
          pricePerSession: offerData.pricePerSession,
          priceTotal, // Prezzo base senza sovrapprezzo
          // Opzioni pagamento
          allowSinglePayment: offerData.allowSinglePayment,
          allowInstallments: offerData.allowInstallments,
          installmentFeePercent: offerData.installmentFeePercent,
          priceTotalWithFee, // Prezzo con sovrapprezzo per rateale
          pricePerSessionWithFee: Math.round(pricePerSessionWithFee * 100) / 100,
          installments,
          paidInstallments: 0,
          completedSessions: 0,
          paymentMethod: null, // Sarà impostato quando il cliente sceglie
          // Contratto
          requireContract: includeContract && contractEnabled,
          contractAccepted: false,
          status: 'active',
          source: 'external',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        
        // Aggiorna il cliente con il numero di sessioni
        const clientRef = doc(db, 'coachClients', clientId)
        const clientDoc = await getDoc(clientRef)
        if (clientDoc.exists()) {
          const currentSessions = clientDoc.data().totalSessions || 0
          await updateDoc(clientRef, {
            totalSessions: currentSessions + offerData.totalSessions,
            updatedAt: serverTimestamp()
          })
        }
        
        // Genera il link
        generatedLink = `${window.location.origin}/external-offer/${offerRef.id}`
      }
      
      setOfferLink(generatedLink)
      
      // Invia email se richiesto
      if (sendEmail) {
        try {
          await fetch('/api/emails/external-offer-created', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientEmail: client.email,
              clientName: client.name,
              coachName: user.name || 'Coach',
              offerTitle: offerData.title,
              totalSessions: offerData.totalSessions,
              sessionDuration: offerData.sessionDuration,
              pricePerSession: offerData.pricePerSession,
              priceTotal,
              description: offerData.description,
              offerId: offerRef.id,
              // Opzioni pagamento
              allowSinglePayment: offerData.allowSinglePayment,
              allowInstallments: offerData.allowInstallments,
              installmentFeePercent: offerData.installmentFeePercent,
              priceTotalWithFee
            })
          })
        } catch (emailErr) {
          console.error('Errore invio email:', emailErr)
        }
      }
      
      setSuccess(true)
      
    } catch (err) {
      console.error('Errore:', err)
      setError('Errore durante il salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(offerLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/coach/office" className="text-primary-500 hover:underline">
            Torna all'Ufficio Virtuale
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-charcoal">Offerta Creata!</h1>
            <Logo size="sm" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-500" size={32} />
              </div>
              <h2 className="text-xl font-bold text-charcoal mb-2">
                {isCoachaMiClient ? 'Offerta inviata al coachee!' : 'Offerta inviata!'}
              </h2>
              <p className="text-gray-500">
                {isCoachaMiClient 
                  ? `${client?.name} riceverà l'offerta nella sua area personale CoachaMi`
                  : sendEmail 
                    ? `Abbiamo inviato l'offerta a ${client?.email}`
                    : 'Condividi il link con il tuo cliente'
                }
              </p>
            </div>

            {/* Link da condividere - solo per clienti esterni */}
            {!isCoachaMiClient && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link per il cliente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={offerLink}
                    readOnly
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-colors ${
                      linkCopied 
                        ? 'bg-green-500 text-white' 
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                    {linkCopied ? 'Copiato!' : 'Copia'}
                  </button>
                </div>
              </div>
            )}

            {/* Info per clienti CoachaMi */}
            {isCoachaMiClient && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Info className="text-primary-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-primary-800">Offerta visibile in piattaforma</p>
                  <p className="text-sm text-primary-600">
                    {client?.name} vedrà l'offerta nella sezione "Le mie offerte" e potrà accettarla direttamente
                  </p>
                </div>
              </div>
            )}

            {sendEmail && !isCoachaMiClient && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Mail className="text-green-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-green-800">Email inviata</p>
                  <p className="text-sm text-green-600">
                    {client?.name} ha ricevuto l'offerta all'indirizzo {client?.email}
                  </p>
                </div>
              </div>
            )}

            {/* Info commissione */}
            {isCoachaMiClient && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="text-orange-500" size={18} />
                  <span className="font-medium text-orange-800">Riepilogo guadagni</span>
                </div>
                <div className="text-sm text-orange-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Prezzo percorso:</span>
                    <span>€{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commissione CoachaMi (30%):</span>
                    <span>-€{((offerData.totalSessions * offerData.pricePerSession) * COACHAMI_COMMISSION).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-orange-200">
                    <span>Il tuo guadagno:</span>
                    <span className="text-green-600">€{((offerData.totalSessions * offerData.pricePerSession) * (1 - COACHAMI_COMMISSION)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href={`/coach/office/clients/${clientId}?source=${isCoachaMiClient ? 'coachami' : 'external'}`}
                className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 text-center font-medium"
              >
                Torna al cliente
              </Link>
              <Link
                href="/coach/office"
                className="flex-1 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-center font-medium"
              >
                Ufficio Virtuale
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/coach/office/clients/${clientId}?source=${isCoachaMiClient ? 'coachami' : 'external'}`} 
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Nuovo Percorso</h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Banner commissione CoachaMi */}
        {isCoachaMiClient && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3"
          >
            <Info className="text-orange-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-orange-800">Cliente CoachaMi - Commissione 30%</p>
              <p className="text-sm text-orange-600">
                Per i percorsi venduti a clienti della piattaforma, CoachaMi trattiene il 30% come commissione per il servizio di matching e gestione pagamenti.
              </p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Cliente */}
          {client && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isCoachaMiClient ? 'bg-primary-100' : 'bg-purple-100'
                }`}>
                  <User className={isCoachaMiClient ? 'text-primary-600' : 'text-purple-600'} size={24} />
                </div>
                <div>
                  <p className="font-medium text-charcoal">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.email}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                  isCoachaMiClient 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {isCoachaMiClient ? 'CoachaMi' : 'Cliente Esterno'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Dettagli Percorso */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Euro className="text-green-500" size={20} />
              Dettagli Percorso
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo percorso *
                </label>
                <input
                  type="text"
                  value={offerData.title}
                  onChange={(e) => setOfferData({ ...offerData, title: e.target.value })}
                  placeholder="Es: Percorso di Crescita Personale"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° Sessioni
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={offerData.totalSessions}
                    onChange={(e) => setOfferData({ ...offerData, totalSessions: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durata (min)
                  </label>
                  <select
                    value={offerData.sessionDuration}
                    onChange={(e) => setOfferData({ ...offerData, sessionDuration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    €/Sessione *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={offerData.pricePerSession}
                    onChange={(e) => setOfferData({ ...offerData, pricePerSession: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={offerData.description}
                  onChange={(e) => setOfferData({ ...offerData, description: e.target.value })}
                  placeholder="Descrivi il percorso..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
              
              {/* Riepilogo */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">
                    {offerData.totalSessions} sessioni × €{offerData.pricePerSession.toFixed(2)}
                  </span>
                  <span className="font-medium">
                    €{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Totale percorso</span>
                  <span className="text-primary-500">
                    €{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}
                  </span>
                </div>
                
                {/* Info commissione CoachaMi */}
                {isCoachaMiClient && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-2 text-sm">
                      <Info size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-orange-600 font-medium">Commissione CoachaMi 30%</p>
                        <div className="text-gray-500 mt-1 space-y-1">
                          <div className="flex justify-between">
                            <span>Commissione piattaforma:</span>
                            <span className="text-orange-600">
                              -€{((offerData.totalSessions * offerData.pricePerSession) * COACHAMI_COMMISSION).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium text-charcoal">
                            <span>Il tuo guadagno netto:</span>
                            <span className="text-green-600">
                              €{((offerData.totalSessions * offerData.pricePerSession) * (1 - COACHAMI_COMMISSION)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Opzioni Pagamento */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <CreditCard className="text-blue-500" size={20} />
              Opzioni di Pagamento
            </h2>
            
            <div className="space-y-4">
              {/* Pagamento unico */}
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                <input
                  type="checkbox"
                  checked={offerData.allowSinglePayment}
                  onChange={(e) => setOfferData({ ...offerData, allowSinglePayment: e.target.checked })}
                  className="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Pagamento unico</p>
                  <p className="text-sm text-gray-500">
                    Il cliente paga tutto subito: <strong>€{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}</strong>
                  </p>
                </div>
              </label>

              {/* Pagamento rateale */}
              <div className={`p-4 border rounded-xl transition-colors ${
                offerData.allowInstallments ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={offerData.allowInstallments}
                    onChange={(e) => setOfferData({ ...offerData, allowInstallments: e.target.checked })}
                    className="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-charcoal">Pagamento rateale</p>
                    <p className="text-sm text-gray-500">
                      Il cliente paga una sessione alla volta
                    </p>
                  </div>
                </label>

                {offerData.allowInstallments && (
                  <div className="mt-4 pl-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sovrapprezzo rateale (0-15%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="15"
                        step="1"
                        value={offerData.installmentFeePercent}
                        onChange={(e) => setOfferData({ ...offerData, installmentFeePercent: parseInt(e.target.value) })}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                      />
                      <div className="w-16 text-center">
                        <span className="text-lg font-bold text-primary-600">{offerData.installmentFeePercent}%</span>
                      </div>
                    </div>
                    
                    {offerData.installmentFeePercent > 0 && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>Totale rateale:</strong> €{((offerData.totalSessions * offerData.pricePerSession) * (1 + offerData.installmentFeePercent / 100)).toFixed(2)}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          {offerData.totalSessions} rate da €{((offerData.pricePerSession) * (1 + offerData.installmentFeePercent / 100)).toFixed(2)}
                        </p>
                      </div>
                    )}
                    
                    {offerData.installmentFeePercent === 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Nessun sovrapprezzo applicato
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!offerData.allowSinglePayment && !offerData.allowInstallments && (
                <p className="text-red-500 text-sm">
                  ⚠️ Devi selezionare almeno un metodo di pagamento
                </p>
              )}
            </div>
          </motion.div>

          {/* Sezione Contratto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-green-500" size={24} />
              <h2 className="font-semibold text-charcoal">Contratto di Coaching</h2>
            </div>
            
            {contractConfigured && contractEnabled ? (
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <FileText className="text-green-600" size={20} />
                    <div>
                      <p className="font-medium text-green-800">Richiedi accettazione contratto</p>
                      <p className="text-sm text-green-600">
                        Il cliente dovrà accettare il contratto prima di pagare
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={includeContract}
                      onChange={(e) => setIncludeContract(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${
                      includeContract ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                        includeContract ? 'translate-x-6' : 'translate-x-0.5'
                      } mt-0.5`} />
                    </div>
                  </div>
                </label>
                
                <Link
                  href="/coach/settings/contract"
                  className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  Modifica contratto
                  <ExternalLink size={14} />
                </Link>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-amber-800 text-sm mb-3">
                  {!contractConfigured 
                    ? "Non hai ancora configurato il tuo contratto di coaching."
                    : "Il contratto è disabilitato nelle impostazioni."
                  }
                </p>
                <Link
                  href="/coach/settings/contract"
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  <Shield size={16} />
                  Configura contratto
                  <ExternalLink size={14} />
                </Link>
              </div>
            )}
          </motion.div>

          {/* Opzione invio email */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Send className="text-blue-500" size={24} />
                <div>
                  <p className="font-medium text-charcoal">Invia email al cliente</p>
                  <p className="text-sm text-gray-500">
                    {client?.name} riceverà l'offerta a {client?.email}
                  </p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  sendEmail ? 'bg-primary-500' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    sendEmail ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
            </label>
          </motion.div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Creazione in corso...
              </>
            ) : (
              <>
                <Save size={20} />
                Crea e {sendEmail ? 'Invia' : 'Genera Link'}
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
