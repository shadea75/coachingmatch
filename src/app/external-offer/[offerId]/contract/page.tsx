'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  FileText,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  User,
  Calendar,
  Euro,
  Lock,
  Download
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function AcceptContractPage() {
  const params = useParams()
  const router = useRouter()
  const offerId = params.offerId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [offer, setOffer] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form
  const [clientName, setClientName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!offerId) return
      
      setIsLoading(true)
      try {
        // Carica offerta
        const offerDoc = await getDoc(doc(db, 'externalOffers', offerId))
        if (!offerDoc.exists()) {
          setError('Offerta non trovata')
          return
        }
        
        const offerData = offerDoc.data()
        setOffer(offerData)
        setClientName(offerData.clientName || '')
        
        // Verifica se contratto già accettato
        if (offerData.contractAccepted) {
          // Contratto già accettato, redirect a pagamento
          router.push(`/external-offer/${offerId}`)
          return
        }
        
        // Carica contratto del coach
        const contractDoc = await getDoc(doc(db, 'coachContracts', offerData.coachId))
        if (contractDoc.exists() && contractDoc.data().enabled) {
          setContract(contractDoc.data())
        } else {
          // Nessun contratto configurato, redirect diretto a pagamento
          router.push(`/external-offer/${offerId}`)
        }
        
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [offerId, router])

  // Genera il testo del contratto con le variabili sostituite
  const generateContractText = () => {
    if (!contract || !offer) return ''
    
    let text = contract.template
      .replace(/\{\{totalSessions\}\}/g, offer.totalSessions)
      .replace(/\{\{sessionDuration\}\}/g, offer.sessionDuration)
      .replace(/\{\{priceTotal\}\}/g, offer.priceTotal?.toFixed(2))
      .replace(/\{\{pricePerSession\}\}/g, offer.pricePerSession?.toFixed(2))
      .replace(/\{\{priceTotalWithFee\}\}/g, offer.priceTotalWithFee?.toFixed(2) || offer.priceTotal?.toFixed(2))
      .replace(/\{\{installmentFeePercent\}\}/g, offer.installmentFeePercent || '0')
      .replace(/\{\{coachCity\}\}/g, contract.coachCity || '')
      .replace(/\{\{coachName\}\}/g, offer.coachName || '')
    
    // Gestisci condizioni
    if (offer.allowInstallments) {
      text = text.replace(/\{\{#if allowInstallments\}\}/g, '').replace(/\{\{\/if\}\}/g, '')
      if (offer.installmentFeePercent > 0) {
        text = text.replace(/\{\{#if installmentFeePercent\}\}/g, '').replace(/\{\{\/if\}\}/g, '')
      } else {
        text = text.replace(/\{\{#if installmentFeePercent\}\}[\s\S]*?\{\{\/if\}\}/g, '')
      }
    } else {
      text = text.replace(/\{\{#if allowInstallments\}\}[\s\S]*?\{\{\/if\}\}/g, '')
    }
    
    if (contract.customClauses) {
      text += '\n\n**CLAUSOLE AGGIUNTIVE**\n' + contract.customClauses
    }
    
    return text
  }

  const handleAccept = async () => {
    if (!acceptedTerms || !acceptedPrivacy || !clientName.trim()) {
      setError('Compila tutti i campi obbligatori')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const contractText = generateContractText()
      const signedAt = new Date()
      
      // Salva contratto firmato
      const signedContractRef = await addDoc(collection(db, 'signedContracts'), {
        offerId,
        coachId: offer.coachId,
        coachName: offer.coachName,
        coachEmail: offer.coachEmail,
        clientId: offer.clientId,
        clientName: clientName.trim(),
        clientEmail: offer.clientEmail,
        offerTitle: offer.title,
        contractText,
        acceptedTerms: true,
        acceptedPrivacy: true,
        signedAt: serverTimestamp(),
        signedAtISO: signedAt.toISOString(),
        ipAddress: null, // Potrebbe essere aggiunto lato server
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      })
      
      // Aggiorna offerta con riferimento al contratto
      await updateDoc(doc(db, 'externalOffers', offerId), {
        contractAccepted: true,
        contractSignedAt: serverTimestamp(),
        signedContractId: signedContractRef.id,
        clientNameConfirmed: clientName.trim(),
        updatedAt: serverTimestamp()
      })
      
      // Redirect a pagamento
      router.push(`/external-offer/${offerId}`)
      
    } catch (err) {
      console.error('Errore:', err)
      setError('Errore durante l\'accettazione')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold text-charcoal mb-2">Errore</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!contract) return null

  const contractText = generateContractText()

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-center">
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Info Offerta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="text-primary-600" size={28} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Percorso offerto da</p>
              <h2 className="text-lg font-semibold text-charcoal">{offer?.coachName}</h2>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h1 className="text-xl font-bold text-charcoal mb-2">{offer?.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {offer?.totalSessions} sessioni
              </span>
              <span className="flex items-center gap-1">
                <Euro size={16} />
                {formatCurrency(offer?.priceTotal)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Contratto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-charcoal flex items-center gap-2">
              <FileText className="text-primary-500" size={20} />
              Contratto di Coaching
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Leggi attentamente e accetta per procedere
            </p>
          </div>
          
          <div className="p-6 bg-gray-50 max-h-96 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-transparent p-0 m-0">
                {contractText}
              </pre>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Nome Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome e Cognome (come firma) *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Inserisci il tuo nome completo"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Checkbox Termini */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">
                Dichiaro di aver letto, compreso e accettato integralmente le condizioni contrattuali sopra riportate. *
              </span>
            </label>
            
            {/* Checkbox Privacy */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">
                Autorizzo il trattamento dei miei dati personali ai sensi del GDPR per le finalità connesse al servizio di coaching. *
              </span>
            </label>
          </div>
        </motion.div>

        {/* Info Legale */}
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1 flex items-center gap-1">
            <Lock size={14} />
            Contratto con valore legale
          </p>
          <p className="text-blue-600">
            Accettando questo contratto, stai creando un accordo vincolante con {offer?.coachName}. 
            Una copia firmata sarà salvata e disponibile per entrambe le parti.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Pulsante Accetta */}
        <button
          onClick={handleAccept}
          disabled={isSubmitting || !acceptedTerms || !acceptedPrivacy || !clientName.trim()}
          className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Elaborazione...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Accetto e procedo al pagamento
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Data e ora di accettazione: {format(new Date(), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
        </p>
      </main>
    </div>
  )
}
