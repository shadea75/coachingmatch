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
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

// Funzione per renderizzare markdown semplice in HTML
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
    .replace(/^- /gm, '• ')
}

export default function CoacheeContractPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const offerId = params.offerId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [offer, setOffer] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [coachBilling, setCoachBilling] = useState<any>(null)
  const [coacheeData, setCoacheeData] = useState<any>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadData = async () => {
      if (!offerId || !user?.id) return
      
      setIsLoading(true)
      try {
        // Carica offerta
        const offerDoc = await getDoc(doc(db, 'offers', offerId))
        if (!offerDoc.exists()) {
          setError('Offerta non trovata')
          return
        }
        
        const offerData = offerDoc.data()
        
        // Verifica che l'offerta sia per questo coachee
        if (offerData.coacheeId !== user.id) {
          setError('Non hai accesso a questa offerta')
          return
        }
        
        setOffer(offerData)
        
        // Verifica se contratto già accettato
        if (offerData.contractAccepted) {
          router.push(`/pay/offer/${offerId}`)
          return
        }
        
        // Carica contratto del coach
        const contractDoc = await getDoc(doc(db, 'coachContracts', offerData.coachId))
        if (contractDoc.exists() && contractDoc.data().enabled) {
          setContract(contractDoc.data())
        } else {
          // Nessun contratto configurato, redirect diretto a pagamento
          await updateDoc(doc(db, 'offers', offerId), {
            status: 'accepted',
            respondedAt: serverTimestamp()
          })
          router.push(`/pay/offer/${offerId}`)
          return
        }
        
        // Carica dati fatturazione coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', offerData.coachId))
        if (coachDoc.exists()) {
          setCoachBilling(coachDoc.data().billing || {})
        }
        
        // Carica dati coachee (base)
        const coacheeDoc = await getDoc(doc(db, 'users', user.id))
        let baseCoacheeData: any = {}
        if (coacheeDoc.exists()) {
          baseCoacheeData = coacheeDoc.data()
        }
        
        // Carica dati fiscali coachee salvati dal coach
        const contractDataDoc = await getDoc(doc(db, 'coacheeContractData', `${offerData.coachId}_${user.id}`))
        let fiscalData: any = {}
        if (contractDataDoc.exists()) {
          fiscalData = contractDataDoc.data()
        }
        
        // Merge dei dati
        setCoacheeData({
          ...baseCoacheeData,
          ...fiscalData // I dati fiscali sovrascrivono quelli base
        })
        
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadData()
    }
  }, [offerId, user, router])

  // Genera il testo completo del contratto con header, data e parti
  const generateContractText = () => {
    if (!contract || !offer) return ''
    
    // Costruisci la sezione dati delle parti
    const coachInfo = coachBilling ? `
**COACH (Prestatore del servizio)**
${coachBilling.businessName || offer.coachName}
${coachBilling.address ? `${coachBilling.address}, ${coachBilling.postalCode} ${coachBilling.city} (${coachBilling.province})` : ''}
${coachBilling.fiscalCode ? `C.F.: ${coachBilling.fiscalCode}` : ''}
${coachBilling.vatNumber ? `P.IVA: ${coachBilling.vatNumber}` : ''}
Email: ${offer.coachEmail}
` : `
**COACH (Prestatore del servizio)**
${offer.coachName}
Email: ${offer.coachEmail}
`

    const coacheeName = coacheeData?.name || user?.name || offer.coacheeName
    const coacheeEmail = coacheeData?.email || user?.email || offer.coacheeEmail
    
    // Costruisci indirizzo coachee se disponibile
    const coacheeAddressLine = coacheeData?.address 
      ? `${coacheeData.address}, ${coacheeData.postalCode} ${coacheeData.city} (${coacheeData.province})`
      : ''
    
    const clientInfo = `
**CLIENTE (Committente)**
${coacheeName}
${coacheeAddressLine ? coacheeAddressLine : ''}
${coacheeData?.fiscalCode ? `C.F.: ${coacheeData.fiscalCode}` : ''}
${coacheeData?.vatNumber ? `P.IVA: ${coacheeData.vatNumber}` : ''}
Email: ${coacheeEmail}
`

    // Header contratto con dati parti
    let text = `**CONTRATTO DI COACHING**

Data: ${format(new Date(), "d MMMM yyyy", { locale: it })}

**TRA LE PARTI**
${coachInfo}
${clientInfo}

---

`
    
    // Aggiungi il template del coach
    text += contract.template
      .replace(/\{\{totalSessions\}\}/g, String(offer.totalSessions))
      .replace(/\{\{sessionDuration\}\}/g, String(offer.sessionDuration))
      .replace(/\{\{priceTotal\}\}/g, formatCurrency(offer.priceTotal))
      .replace(/\{\{pricePerSession\}\}/g, formatCurrency(offer.pricePerSession))
      .replace(/\{\{priceTotalWithFee\}\}/g, formatCurrency(offer.priceTotalWithFee || offer.priceTotal))
      .replace(/\{\{installmentFeePercent\}\}/g, String(offer.installmentFeePercent || 0))
      .replace(/\{\{coachCity\}\}/g, contract.coachCity || coachBilling?.city || 'Italia')
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

  const handleAcceptContract = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Devi accettare i termini e la privacy per continuare')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      // Genera il testo del contratto completo
      const contractText = generateContractText()
      
      // Salva il contratto firmato
      const signedContractRef = await addDoc(collection(db, 'signedContracts'), {
        offerId: offerId,
        offerCollection: 'offers',
        coachId: offer.coachId,
        coachName: offer.coachName,
        coachEmail: offer.coachEmail,
        coachBilling: coachBilling,
        coacheeId: user?.id,
        coacheeName: coacheeData?.name || user?.name || offer.coacheeName,
        coacheeEmail: coacheeData?.email || user?.email || offer.coacheeEmail,
        offerTitle: offer.title,
        contractText: contractText,
        acceptedTerms: true,
        acceptedPrivacy: true,
        signedAt: serverTimestamp(),
        signedAtISO: new Date().toISOString()
      })
      
      // Aggiorna l'offerta
      await updateDoc(doc(db, 'offers', offerId), {
        contractAccepted: true,
        contractSignedAt: serverTimestamp(),
        signedContractId: signedContractRef.id,
        status: 'accepted',
        respondedAt: serverTimestamp()
      })
      
      // Redirect al pagamento
      router.push(`/pay/offer/${offerId}`)
      
    } catch (err) {
      console.error('Errore firma contratto:', err)
      setError('Errore durante la firma del contratto')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-md w-full text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h1 className="text-xl font-bold text-charcoal mb-2">Errore</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/offers" className="text-primary-500 hover:underline">
            Torna alle offerte
          </Link>
        </div>
      </div>
    )
  }

  // Genera testo contratto per visualizzazione
  const displayContract = generateContractText()

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/offers" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Contratto di Coaching</h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Info Offerta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="text-primary-600" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal">{offer?.title}</h2>
              <p className="text-sm text-gray-500">Coach: {offer?.coachName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-xl">
              <Calendar className="mx-auto mb-1 text-gray-400" size={20} />
              <p className="text-lg font-bold text-charcoal">{offer?.totalSessions}</p>
              <p className="text-xs text-gray-500">Sessioni</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <Euro className="mx-auto mb-1 text-gray-400" size={20} />
              <p className="text-lg font-bold text-charcoal">{formatCurrency(offer?.priceTotal || 0)}</p>
              <p className="text-xs text-gray-500">Totale</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <FileText className="mx-auto mb-1 text-gray-400" size={20} />
              <p className="text-lg font-bold text-charcoal">{offer?.sessionDuration}</p>
              <p className="text-xs text-gray-500">min/sessione</p>
            </div>
          </div>
        </motion.div>

        {/* Testo Contratto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-6"
        >
          <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <FileText className="text-primary-500" size={20} />
            Termini del Contratto
          </h3>
          
          <div 
            className="prose prose-sm max-w-none text-gray-600 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContract) }}
          />
        </motion.div>

        {/* Accettazione */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-6"
        >
          <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <Lock className="text-green-500" size={20} />
            Accettazione
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">
                Ho letto e accetto i <strong>termini e condizioni</strong> del contratto di coaching sopra riportato.
              </span>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">
                Acconsento al trattamento dei miei dati personali secondo la <strong>normativa GDPR</strong> per le finalità descritte nel contratto.
              </span>
            </label>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </motion.div>

        {/* Pulsante Firma */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleAcceptContract}
            disabled={!acceptedTerms || !acceptedPrivacy || isSubmitting}
            className="w-full py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <CheckCircle size={20} />
                Firma e Procedi al Pagamento
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-gray-500 mt-3">
            Firmando questo contratto accetti i termini di servizio. Dopo la firma verrai reindirizzato al pagamento.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
