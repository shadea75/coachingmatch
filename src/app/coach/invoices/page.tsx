'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText,
  Plus,
  Download,
  Search,
  Calendar,
  Euro,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Settings,
  ChevronDown,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc,
  updateDoc,
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'

interface FiscalData {
  denominazione: string
  partitaIva: string
  codiceFiscale: string
  indirizzo: string
  cap: string
  comune: string
  provincia: string
  regimeFiscale: string
  iban?: string
  istitutoFinanziario?: string
}

interface ClientFiscalData {
  denominazione: string
  codiceFiscale: string
  partitaIva?: string
  indirizzo: string
  cap: string
  comune: string
  provincia: string
  codiceDestinatario?: string
  pec?: string
}

interface Invoice {
  id: string
  numero: string
  data: string
  clienteNome: string
  clienteCF: string
  descrizione: string
  imponibile: number
  iva: number
  totale: number
  stato: 'bozza' | 'generata' | 'inviata'
  xmlGenerato?: boolean
  createdAt: any
}

interface Session {
  id: string
  coacheeName: string
  coacheeEmail: string
  coacheeId: string
  scheduledAt: any
  duration: number
  type: string
  price?: number
  offerTitle?: string
}

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  codiceFiscale?: string
  partitaIva?: string
  indirizzo?: string
  cap?: string
  comune?: string
  provincia?: string
  codiceDestinatario?: string
  pec?: string
  source: 'coachClients' | 'externalClients'
}

const REGIMI_FISCALI = [
  { value: 'RF01', label: 'Ordinario' },
  { value: 'RF02', label: 'Contribuenti minimi' },
  { value: 'RF19', label: 'Forfettario' },
]

const NATURE_IVA = [
  { value: '', label: 'IVA 22%', aliquota: 22 },
  { value: 'N2.2', label: 'Non soggetto - altri casi', aliquota: 0 },
  { value: 'N4', label: 'Esente art.10', aliquota: 0 },
]

export default function CoachInvoicesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [fiscalData, setFiscalData] = useState<FiscalData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal nuova fattura
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [showFiscalSettings, setShowFiscalSettings] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // Form nuova fattura
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clientData, setClientData] = useState<ClientFiscalData>({
    denominazione: '',
    codiceFiscale: '',
    partitaIva: '',
    indirizzo: '',
    cap: '',
    comune: '',
    provincia: '',
    codiceDestinatario: '0000000',
    pec: ''
  })
  const [invoiceLines, setInvoiceLines] = useState([{
    descrizione: '',
    quantita: 1,
    prezzoUnitario: 0,
    naturaIva: '' // vuoto = 22%, altrimenti codice natura
  }])
  
  // Form dati fiscali coach
  const [editFiscalData, setEditFiscalData] = useState<FiscalData>({
    denominazione: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    cap: '',
    comune: '',
    provincia: '',
    regimeFiscale: 'RF19',
    iban: '',
    istitutoFinanziario: ''
  })

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    
    try {
      // Carica dati fiscali coach
      const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
      if (coachDoc.exists()) {
        const data = coachDoc.data()
        if (data.fiscalData) {
          setFiscalData(data.fiscalData)
          setEditFiscalData(data.fiscalData)
        }
      }
      
      // Carica fatture esistenti
      try {
        const invoicesQuery = query(
          collection(db, 'invoices'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const invoicesSnap = await getDocs(invoicesQuery)
        setInvoices(invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)))
      } catch (e) {
        console.log('No invoices yet or index needed')
        setInvoices([])
      }
      
      // Carica clienti da coachClients
      const loadedClients: Client[] = []
      try {
        const coachClientsQuery = query(
          collection(db, 'coachClients'),
          where('coachId', '==', user.id)
        )
        const coachClientsSnap = await getDocs(coachClientsQuery)
        coachClientsSnap.docs.forEach(d => {
          const data = d.data()
          loadedClients.push({
            id: d.id,
            name: data.coacheeName || data.name || 'Cliente',
            email: data.coacheeEmail || data.email || '',
            phone: data.phone,
            codiceFiscale: data.codiceFiscale,
            partitaIva: data.partitaIva,
            indirizzo: data.indirizzo,
            cap: data.cap,
            comune: data.comune,
            provincia: data.provincia,
            codiceDestinatario: data.codiceDestinatario,
            pec: data.pec,
            source: 'coachClients'
          })
        })
      } catch (e) {
        console.log('Error loading coachClients:', e)
      }
      
      // Carica clienti da externalClients
      try {
        const externalClientsQuery = query(
          collection(db, 'externalClients'),
          where('coachId', '==', user.id)
        )
        const externalClientsSnap = await getDocs(externalClientsQuery)
        externalClientsSnap.docs.forEach(d => {
          const data = d.data()
          loadedClients.push({
            id: d.id,
            name: data.name || 'Cliente',
            email: data.email || '',
            phone: data.phone,
            codiceFiscale: data.codiceFiscale,
            partitaIva: data.partitaIva,
            indirizzo: data.indirizzo,
            cap: data.cap,
            comune: data.comune,
            provincia: data.provincia,
            codiceDestinatario: data.codiceDestinatario,
            pec: data.pec,
            source: 'externalClients'
          })
        })
      } catch (e) {
        console.log('Error loading externalClients:', e)
      }
      
      setClients(loadedClients)
      
      // Carica sessioni completate (per creare fatture)
      try {
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id),
          where('status', '==', 'completed')
        )
        const sessionsSnap = await getDocs(sessionsQuery)
        setSessions(sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session)))
      } catch (e) {
        console.log('Error loading sessions:', e)
        setSessions([])
      }
      
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveFiscalData = async () => {
    if (!user?.id) return
    
    try {
      await updateDoc(doc(db, 'coachApplications', user.id), {
        fiscalData: editFiscalData,
        updatedAt: serverTimestamp()
      })
      setFiscalData(editFiscalData)
      setShowFiscalSettings(false)
      alert('Dati fiscali salvati!')
    } catch (err) {
      console.error('Error saving fiscal data:', err)
      alert('Errore nel salvataggio')
    }
  }

  const getNextInvoiceNumber = () => {
    const year = new Date().getFullYear()
    const existingThisYear = invoices.filter(i => i.numero.includes(`${year}`)).length
    return `${year}/${String(existingThisYear + 1).padStart(4, '0')}`
  }

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setClientData({
        denominazione: client.name || '',
        codiceFiscale: client.codiceFiscale || '',
        partitaIva: client.partitaIva || '',
        indirizzo: client.indirizzo || '',
        cap: client.cap || '',
        comune: client.comune || '',
        provincia: client.provincia || '',
        codiceDestinatario: client.codiceDestinatario || '0000000',
        pec: client.pec || ''
      })
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId)
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setClientData(prev => ({
        ...prev,
        denominazione: session.coacheeName || ''
      }))
      setInvoiceLines([{
        descrizione: session.offerTitle || `Sessione di coaching (${session.duration} min)`,
        quantita: 1,
        prezzoUnitario: session.price || 0,
        naturaIva: fiscalData?.regimeFiscale === 'RF19' ? 'N2.2' : ''
      }])
    }
  }

  const generateInvoice = async () => {
    if (!fiscalData) {
      alert('Configura prima i tuoi dati fiscali')
      setShowFiscalSettings(true)
      return
    }
    
    if (!clientData.codiceFiscale || !clientData.denominazione) {
      alert('Inserisci i dati del cliente (nome e codice fiscale)')
      return
    }
    
    if (invoiceLines.some(l => !l.descrizione || l.prezzoUnitario <= 0)) {
      alert('Compila correttamente le righe della fattura')
      return
    }
    
    setGenerating(true)
    
    try {
      const invoiceNumber = getNextInvoiceNumber()
      const today = new Date().toISOString().split('T')[0]
      
      // Calcola totali
      let imponibile = 0
      let iva = 0
      invoiceLines.forEach(linea => {
        const lineTotal = linea.quantita * linea.prezzoUnitario
        imponibile += lineTotal
        if (!linea.naturaIva) {
          iva += lineTotal * 0.22
        }
      })
      const totale = imponibile + iva
      
      // Prepara dati per XML
      const xmlData = {
        numero: invoiceNumber,
        data: today,
        cedente: {
          denominazione: fiscalData.denominazione,
          partitaIva: fiscalData.partitaIva,
          codiceFiscale: fiscalData.codiceFiscale,
          indirizzo: fiscalData.indirizzo,
          cap: fiscalData.cap,
          comune: fiscalData.comune,
          provincia: fiscalData.provincia,
          regimeFiscale: fiscalData.regimeFiscale
        },
        cessionario: {
          denominazione: clientData.denominazione,
          codiceFiscale: clientData.codiceFiscale,
          partitaIva: clientData.partitaIva || undefined,
          indirizzo: clientData.indirizzo || 'Via non specificata',
          cap: clientData.cap || '00000',
          comune: clientData.comune || 'Non specificato',
          provincia: clientData.provincia || 'XX',
          codiceDestinatario: clientData.codiceDestinatario || '0000000',
          pec: clientData.pec || undefined
        },
        linee: invoiceLines.map(l => ({
          descrizione: l.descrizione,
          quantita: l.quantita,
          prezzoUnitario: l.prezzoUnitario,
          aliquotaIva: l.naturaIva ? 0 : 22,
          natura: l.naturaIva || undefined
        })),
        pagamento: {
          modalita: 'MP05', // Bonifico
          iban: fiscalData.iban,
          istituto: fiscalData.istitutoFinanziario
        }
      }
      
      // Genera XML
      const response = await fetch('/api/invoices/generate-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xmlData)
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Errore generazione XML')
      }
      
      // Salva fattura in Firebase
      const invoiceDoc = await addDoc(collection(db, 'invoices'), {
        coachId: user?.id,
        numero: invoiceNumber,
        data: today,
        clienteNome: clientData.denominazione,
        clienteCF: clientData.codiceFiscale,
        clienteData: clientData,
        descrizione: invoiceLines.map(l => l.descrizione).join(', '),
        linee: invoiceLines,
        imponibile,
        iva,
        totale,
        stato: 'generata',
        xmlGenerato: true,
        xmlFilename: result.filename,
        sessionId: selectedSession || null,
        createdAt: serverTimestamp()
      })
      
      // Download XML
      const blob = new Blob([result.xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Aggiorna lista
      setInvoices(prev => [{
        id: invoiceDoc.id,
        numero: invoiceNumber,
        data: today,
        clienteNome: clientData.denominazione,
        clienteCF: clientData.codiceFiscale,
        descrizione: invoiceLines.map(l => l.descrizione).join(', '),
        imponibile,
        iva,
        totale,
        stato: 'generata',
        xmlGenerato: true,
        createdAt: Timestamp.now()
      }, ...prev])
      
      // Reset form
      setShowNewInvoice(false)
      setSelectedSession('')
      setSelectedClientId('')
      setClientData({
        denominazione: '',
        codiceFiscale: '',
        partitaIva: '',
        indirizzo: '',
        cap: '',
        comune: '',
        provincia: '',
        codiceDestinatario: '0000000',
        pec: ''
      })
      setInvoiceLines([{
        descrizione: '',
        quantita: 1,
        prezzoUnitario: 0,
        naturaIva: ''
      }])
      
      alert('Fattura generata e scaricata!')
      
    } catch (err: any) {
      console.error('Error generating invoice:', err)
      alert('Errore: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const filteredInvoices = invoices.filter(inv =>
    inv.clienteNome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.numero.includes(searchQuery)
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/coach/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <Logo size="md" />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFiscalSettings(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Settings size={18} />
              Dati Fiscali
            </button>
            <button
              onClick={() => setShowNewInvoice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Plus size={18} />
              Nuova Fattura
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
            Fatturazione Elettronica
          </h1>
          <p className="text-gray-500">
            Genera fatture XML per il Sistema di Interscambio (SDI)
          </p>
        </div>

        {/* Alert se mancano dati fiscali */}
        {!fiscalData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-amber-800 font-medium">Configura i tuoi dati fiscali</p>
              <p className="text-amber-600 text-sm">
                Prima di generare fatture, devi inserire la tua Partita IVA e i dati aziendali.
              </p>
              <button
                onClick={() => setShowFiscalSettings(true)}
                className="mt-2 text-sm text-amber-700 font-medium hover:underline"
              >
                Configura ora →
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per cliente o numero fattura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna fattura</p>
              <button
                onClick={() => setShowNewInvoice(true)}
                className="mt-4 text-primary-500 hover:underline"
              >
                Crea la tua prima fattura
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Numero</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Descrizione</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Totale</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{inv.numero}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{inv.data}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{inv.clienteNome}</p>
                      <p className="text-xs text-gray-400">{inv.clienteCF}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {inv.descrizione}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      €{inv.totale.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        inv.stato === 'generata' ? 'bg-green-100 text-green-700' :
                        inv.stato === 'inviata' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {inv.xmlGenerato && <CheckCircle size={12} />}
                        {inv.stato === 'generata' ? 'XML Generato' : 
                         inv.stato === 'inviata' ? 'Inviata' : 'Bozza'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal Dati Fiscali */}
      <AnimatePresence>
        {showFiscalSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFiscalSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-charcoal">I tuoi Dati Fiscali</h2>
                <button onClick={() => setShowFiscalSettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denominazione / Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    value={editFiscalData.denominazione}
                    onChange={e => setEditFiscalData(prev => ({ ...prev, denominazione: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Mario Rossi / Studio Rossi SRL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA *</label>
                    <input
                      type="text"
                      value={editFiscalData.partitaIva}
                      onChange={e => setEditFiscalData(prev => ({ ...prev, partitaIva: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="12345678901"
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale *</label>
                    <input
                      type="text"
                      value={editFiscalData.codiceFiscale}
                      onChange={e => setEditFiscalData(prev => ({ ...prev, codiceFiscale: e.target.value.toUpperCase().slice(0, 16) }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="RSSMRA80A01H501U"
                      maxLength={16}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regime Fiscale *</label>
                  <select
                    value={editFiscalData.regimeFiscale}
                    onChange={e => setEditFiscalData(prev => ({ ...prev, regimeFiscale: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {REGIMI_FISCALI.map(r => (
                      <option key={r.value} value={r.value}>{r.label} ({r.value})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo *</label>
                  <input
                    type="text"
                    value={editFiscalData.indirizzo}
                    onChange={e => setEditFiscalData(prev => ({ ...prev, indirizzo: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Via Roma 123"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CAP *</label>
                    <input
                      type="text"
                      value={editFiscalData.cap}
                      onChange={e => setEditFiscalData(prev => ({ ...prev, cap: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="00100"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comune *</label>
                    <input
                      type="text"
                      value={editFiscalData.comune}
                      onChange={e => setEditFiscalData(prev => ({ ...prev, comune: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Roma"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prov. *</label>
                    <input
                      type="text"
                      value={editFiscalData.provincia}
                      onChange={e => setEditFiscalData(prev => ({ ...prev, provincia: e.target.value.toUpperCase().slice(0, 2) }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="RM"
                      maxLength={2}
                    />
                  </div>
                </div>

                <hr className="my-4" />
                <p className="text-sm text-gray-500">Dati bancari (opzionali, per pagamento)</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                  <input
                    type="text"
                    value={editFiscalData.iban || ''}
                    onChange={e => setEditFiscalData(prev => ({ ...prev, iban: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="IT60X0542811101000000123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Istituto Finanziario</label>
                  <input
                    type="text"
                    value={editFiscalData.istitutoFinanziario || ''}
                    onChange={e => setEditFiscalData(prev => ({ ...prev, istitutoFinanziario: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Banca Intesa"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFiscalSettings(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={saveFiscalData}
                  className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
                >
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Nuova Fattura */}
      <AnimatePresence>
        {showNewInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewInvoice(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-charcoal">Nuova Fattura</h2>
                <button onClick={() => setShowNewInvoice(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* Da sessione esistente */}
              {sessions.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Da sessione completata (opzionale)
                  </label>
                  <select
                    value={selectedSession}
                    onChange={e => handleSessionSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Seleziona sessione --</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.coacheeName} - {s.offerTitle || `${s.duration}min`} - €{s.price || 0}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seleziona cliente esistente */}
              {clients.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📋 Seleziona cliente dall'Ufficio Virtuale
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={e => handleClientSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Seleziona cliente esistente --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ''} {c.codiceFiscale ? `- CF: ${c.codiceFiscale}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    I dati verranno compilati automaticamente
                  </p>
                </div>
              )}

              {/* Dati Cliente */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                  <User size={18} />
                  Dati Cliente
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Ragione Sociale *</label>
                    <input
                      type="text"
                      value={clientData.denominazione}
                      onChange={e => setClientData(prev => ({ ...prev, denominazione: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale *</label>
                      <input
                        type="text"
                        value={clientData.codiceFiscale}
                        onChange={e => setClientData(prev => ({ ...prev, codiceFiscale: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        maxLength={16}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">P.IVA (se ha)</label>
                      <input
                        type="text"
                        value={clientData.partitaIva || ''}
                        onChange={e => setClientData(prev => ({ ...prev, partitaIva: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        maxLength={11}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                    <input
                      type="text"
                      value={clientData.indirizzo}
                      onChange={e => setClientData(prev => ({ ...prev, indirizzo: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="CAP"
                      value={clientData.cap}
                      onChange={e => setClientData(prev => ({ ...prev, cap: e.target.value }))}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      maxLength={5}
                    />
                    <input
                      type="text"
                      placeholder="Comune"
                      value={clientData.comune}
                      onChange={e => setClientData(prev => ({ ...prev, comune: e.target.value }))}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Prov"
                      value={clientData.provincia}
                      onChange={e => setClientData(prev => ({ ...prev, provincia: e.target.value.toUpperCase() }))}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      maxLength={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Codice SDI</label>
                      <input
                        type="text"
                        value={clientData.codiceDestinatario || '0000000'}
                        onChange={e => setClientData(prev => ({ ...prev, codiceDestinatario: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        maxLength={7}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PEC (alternativa)</label>
                      <input
                        type="email"
                        value={clientData.pec || ''}
                        onChange={e => setClientData(prev => ({ ...prev, pec: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Righe Fattura */}
              <div className="mb-6">
                <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                  <FileText size={18} />
                  Righe Fattura
                </h3>
                {invoiceLines.map((line, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4 mb-3">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5">
                        <label className="block text-xs text-gray-500 mb-1">Descrizione</label>
                        <input
                          type="text"
                          value={line.descrizione}
                          onChange={e => {
                            const newLines = [...invoiceLines]
                            newLines[idx].descrizione = e.target.value
                            setInvoiceLines(newLines)
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Sessione di coaching"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Qtà</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantita}
                          onChange={e => {
                            const newLines = [...invoiceLines]
                            newLines[idx].quantita = parseInt(e.target.value) || 1
                            setInvoiceLines(newLines)
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Prezzo €</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.prezzoUnitario}
                          onChange={e => {
                            const newLines = [...invoiceLines]
                            newLines[idx].prezzoUnitario = parseFloat(e.target.value) || 0
                            setInvoiceLines(newLines)
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">IVA</label>
                        <select
                          value={line.naturaIva}
                          onChange={e => {
                            const newLines = [...invoiceLines]
                            newLines[idx].naturaIva = e.target.value
                            setInvoiceLines(newLines)
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          {NATURE_IVA.map(n => (
                            <option key={n.value} value={n.value}>{n.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => setInvoiceLines(prev => [...prev, { descrizione: '', quantita: 1, prezzoUnitario: 0, naturaIva: '' }])}
                  className="text-sm text-primary-500 hover:underline"
                >
                  + Aggiungi riga
                </button>
              </div>

              {/* Totale */}
              <div className="bg-primary-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Imponibile:</span>
                  <span className="font-medium">
                    €{invoiceLines.reduce((sum, l) => sum + l.quantita * l.prezzoUnitario, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600">IVA:</span>
                  <span className="font-medium">
                    €{invoiceLines.reduce((sum, l) => sum + (l.naturaIva ? 0 : l.quantita * l.prezzoUnitario * 0.22), 0).toFixed(2)}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-charcoal">Totale:</span>
                  <span className="font-bold text-xl text-primary-600">
                    €{invoiceLines.reduce((sum, l) => {
                      const base = l.quantita * l.prezzoUnitario
                      const iva = l.naturaIva ? 0 : base * 0.22
                      return sum + base + iva
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Bottoni */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewInvoice(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={generateInvoice}
                  disabled={generating}
                  className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Genera e Scarica XML
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
