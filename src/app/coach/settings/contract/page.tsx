'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  FileText,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Eye,
  HelpCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const DEFAULT_CONTRACT_TEMPLATE = `**CONDIZIONI GENERALI DEL PERCORSO DI COACHING**

**1. OGGETTO**
Il presente contratto regola la fornitura di servizi di coaching personalizzato tra il Coach e il Cliente, secondo le modalità indicate nell'offerta accettata.

**2. DURATA E SESSIONI**
Il percorso si compone di {{totalSessions}} sessioni della durata di {{sessionDuration}} minuti ciascuna. Il calendario delle sessioni verrà concordato tra le parti.

**3. PAGAMENTO**
La quota di partecipazione è pari a €{{priceTotal}}. 
{{#if allowInstallments}}
È possibile il pagamento rateale in {{totalSessions}} rate da €{{pricePerSession}} ciascuna{{#if installmentFeePercent}}, con una maggiorazione del {{installmentFeePercent}}% (totale rateale: €{{priceTotalWithFee}}){{/if}}.
{{/if}}
I pagamenti avverranno tramite la piattaforma CoachaMi.

**4. RECESSO E RIMBORSI**
In caso di recesso da parte del Cliente, le sessioni già pagate non saranno rimborsate. Il Cliente può riprogrammare una sessione con almeno 24 ore di preavviso.

**5. RISERVATEZZA**
Entrambe le parti si impegnano a mantenere la massima riservatezza su quanto emerso durante le sessioni di coaching.

**6. PROPRIETÀ INTELLETTUALE**
Il materiale didattico eventualmente fornito rimane di proprietà esclusiva del Coach e non può essere riprodotto o distribuito senza autorizzazione scritta.

**7. LIMITAZIONE DI RESPONSABILITÀ**
Il coaching non sostituisce terapie mediche, psicologiche o psichiatriche. Il Cliente dichiara di essere consapevole della natura del servizio di coaching.

**8. FORO COMPETENTE**
Per qualsiasi controversia sarà competente il Foro di {{coachCity}}.

**9. ACCETTAZIONE**
Il Cliente dichiara di aver letto, compreso e accettato integralmente le presenti condizioni generali.`

export default function ContractSettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  
  const [contractData, setContractData] = useState({
    enabled: true,
    template: DEFAULT_CONTRACT_TEMPLATE,
    coachCity: '',
    customClauses: '',
    requireSignature: true
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadContract = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        const contractDoc = await getDoc(doc(db, 'coachContracts', user.id))
        if (contractDoc.exists()) {
          const data = contractDoc.data()
          setContractData({
            enabled: data.enabled ?? true,
            template: data.template || DEFAULT_CONTRACT_TEMPLATE,
            coachCity: data.coachCity || '',
            customClauses: data.customClauses || '',
            requireSignature: data.requireSignature ?? true
          })
        }
      } catch (err) {
        console.error('Errore caricamento:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadContract()
    }
  }, [user])

  const handleSave = async () => {
    if (!user?.id) return
    
    setIsSaving(true)
    setError('')
    setSaveSuccess(false)
    
    try {
      await setDoc(doc(db, 'coachContracts', user.id), {
        ...contractData,
        coachId: user.id,
        coachName: user.name,
        coachEmail: user.email,
        updatedAt: serverTimestamp()
      })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      setError('Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefault = () => {
    if (confirm('Vuoi ripristinare il template predefinito? Le tue modifiche andranno perse.')) {
      setContractData(prev => ({
        ...prev,
        template: DEFAULT_CONTRACT_TEMPLATE
      }))
    }
  }

  // Genera preview con dati di esempio
  const generatePreview = () => {
    let preview = contractData.template
      .replace(/\{\{totalSessions\}\}/g, '6')
      .replace(/\{\{sessionDuration\}\}/g, '60')
      .replace(/\{\{priceTotal\}\}/g, '600,00')
      .replace(/\{\{pricePerSession\}\}/g, '100,00')
      .replace(/\{\{priceTotalWithFee\}\}/g, '660,00')
      .replace(/\{\{installmentFeePercent\}\}/g, '10')
      .replace(/\{\{coachCity\}\}/g, contractData.coachCity || '[Città]')
      .replace(/\{\{coachName\}\}/g, user?.name || '[Nome Coach]')
    
    // Rimuovi le condizioni handlebars per la preview
    preview = preview
      .replace(/\{\{#if allowInstallments\}\}/g, '')
      .replace(/\{\{#if installmentFeePercent\}\}/g, '')
      .replace(/\{\{\/if\}\}/g, '')
    
    if (contractData.customClauses) {
      preview += '\n\n**CLAUSOLE AGGIUNTIVE**\n' + contractData.customClauses
    }
    
    return preview
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/coach/settings" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="text-primary-500" size={24} />
              <h1 className="text-xl font-bold text-charcoal">Contratto di Coaching</h1>
            </div>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Come funziona il contratto</p>
            <p>Quando crei un'offerta, il cliente dovrà accettare questo contratto prima di poter procedere al pagamento. Il contratto firmato verrà salvato e sarà disponibile per entrambi.</p>
          </div>
        </div>

        {/* Abilita/Disabilita */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <FileText className="text-primary-500" size={24} />
              <div>
                <p className="font-medium text-charcoal">Richiedi accettazione contratto</p>
                <p className="text-sm text-gray-500">Il cliente deve accettare prima di pagare</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={contractData.enabled}
                onChange={(e) => setContractData({ ...contractData, enabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${
                contractData.enabled ? 'bg-primary-500' : 'bg-gray-200'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  contractData.enabled ? 'translate-x-6' : 'translate-x-0.5'
                } mt-0.5`} />
              </div>
            </div>
          </label>
        </div>

        {contractData.enabled && (
          <>
            {/* Città Foro Competente */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Città per Foro Competente *
              </label>
              <input
                type="text"
                value={contractData.coachCity}
                onChange={(e) => setContractData({ ...contractData, coachCity: e.target.value })}
                placeholder="Es: Milano"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                La città del tribunale competente in caso di controversie
              </p>
            </div>

            {/* Template Contratto */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-charcoal">Template Contratto</h2>
                <div className="flex gap-2">
                  <button
                    onClick={resetToDefault}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Ripristina default
                  </button>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    <Eye size={16} />
                    {showPreview ? 'Modifica' : 'Anteprima'}
                  </button>
                </div>
              </div>

              {/* Variabili disponibili */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <HelpCircle size={14} />
                  Variabili disponibili (verranno sostituite automaticamente):
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    '{{totalSessions}}',
                    '{{sessionDuration}}',
                    '{{priceTotal}}',
                    '{{pricePerSession}}',
                    '{{coachCity}}',
                    '{{coachName}}'
                  ].map(v => (
                    <code key={v} className="text-xs bg-white px-2 py-1 rounded border">
                      {v}
                    </code>
                  ))}
                </div>
              </div>

              {showPreview ? (
                <div className="bg-gray-50 rounded-xl p-6 prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-gray-700">
                    {generatePreview()}
                  </div>
                </div>
              ) : (
                <textarea
                  value={contractData.template}
                  onChange={(e) => setContractData({ ...contractData, template: e.target.value })}
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                />
              )}
            </div>

            {/* Clausole Aggiuntive */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clausole Aggiuntive Personalizzate (opzionale)
              </label>
              <textarea
                value={contractData.customClauses}
                onChange={(e) => setContractData({ ...contractData, customClauses: e.target.value })}
                placeholder="Aggiungi qui eventuali clausole specifiche per la tua attività..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700"
          >
            <CheckCircle size={20} />
            <span>Contratto salvato con successo!</span>
          </motion.div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || (contractData.enabled && !contractData.coachCity)}
          className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Salvataggio...
            </>
          ) : (
            <>
              <Save size={20} />
              Salva Contratto
            </>
          )}
        </button>
      </main>
    </div>
  )
}
