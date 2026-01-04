'use client'

import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Loader2, 
  ExternalLink,
  Filter,
  Download,
  FileText,
  Upload,
  Euro,
  User,
  CheckCircle,
  Clock,
  Eye,
  X,
  AlertCircle,
  Send,
  XCircle,
  RefreshCw,
  Banknote,
  HourglassIcon
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Installment {
  sessionNumber: number
  amount: number
  coachPayout: number
  platformFee: number
  vatAmount: number
  status: string
  paidAt?: Date
}

interface Offer {
  id: string
  coachId: string
  coachName: string
  coachEmail: string
  coacheeId: string
  coacheeName: string
  title: string
  priceTotal: number
  platformFeeTotal: number
  coachPayoutTotal: number
  installments: Installment[]
  paidInstallments: number
  totalSessions: number
  status: string
  createdAt: Date
}

// Tipo per i payout (derivato dalle installments pagate)
interface PendingPayout {
  id: string
  offerId: string
  offerTitle: string
  coachId: string
  coachName: string
  coachEmail: string
  coacheeId: string
  coacheeName: string
  sessionNumber: number
  grossAmount: number // Importo coach (70%)
  netAmount: number // Imponibile
  vatAmount: number // IVA
  platformFee: number // Commissione piattaforma
  paidAt: Date
  coachInvoice: {
    required: boolean
    received: boolean
    number: string | null
    receivedAt?: Date
    verified: boolean
    verifiedBy?: string
    verifiedAt?: Date
    rejectedAt?: Date
    rejectionReason?: string
  }
  payoutStatus: 'awaiting_invoice' | 'invoice_received' | 'invoice_rejected' | 'ready_for_payout' | 'completed' | 'failed'
  scheduledPayoutDate: Date
  completedAt?: Date
}

interface Subscription {
  id: string
  userId: string
  userEmail: string
  userName: string
  status: string
  amount: number
  startDate: Date
  type: 'community'
}

// Formatta valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export default function AdminPaymentsPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'coaches' | 'subscriptions'>('overview')
  
  // Filtri
  const [selectedCoach, setSelectedCoach] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [payoutFilter, setPayoutFilter] = useState<string>('all')
  
  // Modal
  const [verifyModal, setVerifyModal] = useState<PendingPayout | null>(null)
  const [receiveInvoiceModal, setReceiveInvoiceModal] = useState<PendingPayout | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carica offerte con pagamenti
      const offersQuery = query(collection(db, 'offers'), orderBy('createdAt', 'desc'))
      const offersSnap = await getDocs(offersQuery)
      const loadedOffers: Offer[] = offersSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          coachId: data.coachId || '',
          coachName: data.coachName || 'Coach',
          coachEmail: data.coachEmail || '',
          coacheeId: data.coacheeId || '',
          coacheeName: data.coacheeName || 'Coachee',
          title: data.title || 'Offerta',
          priceTotal: data.priceTotal || 0,
          platformFeeTotal: data.platformFeeTotal || 0,
          coachPayoutTotal: data.coachPayoutTotal || 0,
          installments: (data.installments || []).map((inst: any) => ({
            ...inst,
            paidAt: inst.paidAt?.toDate?.() || null
          })),
          paidInstallments: data.paidInstallments || 0,
          totalSessions: data.totalSessions || 1,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date()
        }
      })
      setOffers(loadedOffers)

      // Carica utenti con membership attiva
      const usersQuery = query(
        collection(db, 'users'),
        where('membershipStatus', '==', 'active')
      )
      const usersSnap = await getDocs(usersQuery)
      const loadedSubs: Subscription[] = usersSnap.docs.map(doc => ({
        id: doc.id,
        userId: doc.id,
        userEmail: doc.data().email || '',
        userName: doc.data().name || '',
        status: 'active',
        amount: 29,
        startDate: doc.data().membershipStartDate?.toDate() || doc.data().createdAt?.toDate() || new Date(),
        type: 'community'
      }))
      setSubscriptions(loadedSubs)
      
      // Genera pending payouts dalle installments pagate
      // Cerca anche nella collection payoutTracking per lo stato
      let payoutTrackingMap: Record<string, any> = {}
      try {
        const trackingSnap = await getDocs(collection(db, 'payoutTracking'))
        trackingSnap.docs.forEach(doc => {
          payoutTrackingMap[doc.id] = doc.data()
        })
      } catch (e) {
        // Collection potrebbe non esistere ancora
      }
      
      const generatedPayouts: PendingPayout[] = []
      loadedOffers.forEach(offer => {
        offer.installments.forEach((inst, idx) => {
          if (inst.status === 'paid' && inst.paidAt) {
            const trackingId = `${offer.id}_${inst.sessionNumber}`
            const tracking = payoutTrackingMap[trackingId]
            
            // Calcola data payout (prossimo lunedì dopo il pagamento)
            const paidDate = new Date(inst.paidAt)
            const daysUntilMonday = (8 - paidDate.getDay()) % 7 || 7
            const scheduledDate = new Date(paidDate)
            scheduledDate.setDate(scheduledDate.getDate() + daysUntilMonday)
            
            // Calcoli corretti:
            // - coachPayout = 70% del pagato dal coachee (es. €70 su €100)
            // - Questo è l'importo LORDO che il coach fattura a CoachaMi
            // - Se il coach è forfettario: €70 sono tutti suoi
            // - Se il coach è ordinario: €70 = €57,38 + €12,62 IVA (lui versa l'IVA)
            // - platformFee = 30% = €30 (nostro incasso lordo)
            // - platformFee netto = €30 / 1.22 = €24,59 (nostro guadagno dopo IVA)
            
            generatedPayouts.push({
              id: trackingId,
              offerId: offer.id,
              offerTitle: offer.title,
              coachId: offer.coachId,
              coachName: offer.coachName,
              coachEmail: offer.coachEmail,
              coacheeId: offer.coacheeId,
              coacheeName: offer.coacheeName,
              sessionNumber: inst.sessionNumber,
              grossAmount: inst.coachPayout, // 70% - importo che paghiamo al coach
              netAmount: inst.platformFee / 1.22, // Nostro guadagno netto (30% scorporato IVA)
              vatAmount: inst.platformFee - (inst.platformFee / 1.22), // IVA su nostra commissione
              platformFee: inst.platformFee, // 30% lordo
              paidAt: inst.paidAt,
              coachInvoice: tracking?.coachInvoice || {
                required: true,
                received: false,
                number: null,
                verified: false
              },
              payoutStatus: tracking?.payoutStatus || 'awaiting_invoice',
              scheduledPayoutDate: tracking?.scheduledPayoutDate?.toDate?.() || scheduledDate,
              completedAt: tracking?.completedAt?.toDate?.() || null
            })
          }
        })
      })
      
      // Ordina per data pagamento (più recenti prima)
      generatedPayouts.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      setPendingPayouts(generatedPayouts)
    } catch (err) {
      console.error('Errore caricamento dati:', err)
    } finally {
      setLoading(false)
    }
  }

  // Lista coach unici
  const uniqueCoaches = useMemo(() => {
    const coaches = new Map<string, { id: string; name: string; email: string }>()
    offers.forEach(o => {
      if (o.coachId) coaches.set(o.coachId, { id: o.coachId, name: o.coachName, email: o.coachEmail })
    })
    pendingPayouts.forEach(p => {
      if (p.coachId) coaches.set(p.coachId, { id: p.coachId, name: p.coachName, email: p.coachEmail })
    })
    return Array.from(coaches.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [offers, pendingPayouts])

  // Lista mesi con pagamenti
  const getMonthsWithPayments = () => {
    const months = new Set<string>()
    offers.forEach(offer => {
      offer.installments.forEach(inst => {
        if (inst.status === 'paid' && inst.paidAt) {
          const date = new Date(inst.paidAt)
          months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
        }
      })
    })
    return Array.from(months).sort().reverse()
  }

  // Filtra pagamenti per coach e mese
  const getFilteredPayments = () => {
    let filtered = offers

    if (selectedCoach !== 'all') {
      filtered = filtered.filter(o => o.coachId === selectedCoach)
    }

    return filtered.flatMap(offer => 
      offer.installments
        .filter(inst => inst.status === 'paid' && inst.paidAt)
        .filter(inst => {
          if (selectedMonth === 'all') return true
          const date = new Date(inst.paidAt!)
          const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return monthStr === selectedMonth
        })
        .map(inst => ({
          ...inst,
          offerId: offer.id,
          offerTitle: offer.title,
          coachId: offer.coachId,
          coachName: offer.coachName,
          coachEmail: offer.coachEmail,
          coacheeName: offer.coacheeName
        }))
    ).sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
  }

  // Filtra pending payouts
  const filteredPayouts = useMemo(() => {
    return pendingPayouts.filter(p => {
      if (payoutFilter !== 'all' && p.payoutStatus !== payoutFilter) return false
      return true
    })
  }, [pendingPayouts, payoutFilter])

  // Stats payout
  const payoutStats = useMemo(() => {
    const awaitingInvoice = pendingPayouts.filter(p => p.payoutStatus === 'awaiting_invoice').length
    const invoiceReceived = pendingPayouts.filter(p => p.payoutStatus === 'invoice_received').length
    const readyForPayout = pendingPayouts.filter(p => p.payoutStatus === 'ready_for_payout' || (p.payoutStatus === 'invoice_received' && p.coachInvoice.verified)).length
    const completed = pendingPayouts.filter(p => p.payoutStatus === 'completed').length
    const rejected = pendingPayouts.filter(p => p.payoutStatus === 'invoice_rejected').length
    
    const totalPending = pendingPayouts
      .filter(p => p.payoutStatus !== 'completed')
      .reduce((sum, p) => sum + p.grossAmount, 0)
    
    const totalCompleted = pendingPayouts
      .filter(p => p.payoutStatus === 'completed')
      .reduce((sum, p) => sum + p.grossAmount, 0)
    
    return { awaitingInvoice, invoiceReceived, readyForPayout, completed, rejected, totalPending, totalCompleted }
  }, [pendingPayouts])

  // Calcola totali per coach
  const getCoachTotals = () => {
    const totals: Record<string, {
      coachId: string
      coachName: string
      coachEmail: string
      totalEarnings: number
      totalPlatformFee: number
      paidSessions: number
      pendingSessions: number
      pendingPayoutAmount: number
      monthlyBreakdown: Record<string, number>
    }> = {}

    offers.forEach(offer => {
      if (!totals[offer.coachId]) {
        totals[offer.coachId] = {
          coachId: offer.coachId,
          coachName: offer.coachName,
          coachEmail: offer.coachEmail,
          totalEarnings: 0,
          totalPlatformFee: 0,
          paidSessions: 0,
          pendingSessions: 0,
          pendingPayoutAmount: 0,
          monthlyBreakdown: {}
        }
      }

      offer.installments.forEach(inst => {
        if (inst.status === 'paid') {
          totals[offer.coachId].totalEarnings += inst.coachPayout
          totals[offer.coachId].totalPlatformFee += inst.platformFee
          totals[offer.coachId].paidSessions += 1

          if (inst.paidAt) {
            const date = new Date(inst.paidAt)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            totals[offer.coachId].monthlyBreakdown[monthKey] = 
              (totals[offer.coachId].monthlyBreakdown[monthKey] || 0) + inst.coachPayout
          }
        } else {
          totals[offer.coachId].pendingSessions += 1
        }
      })
    })

    // Aggiungi pending payout amounts
    pendingPayouts.forEach(payout => {
      if (payout.payoutStatus !== 'completed' && totals[payout.coachId]) {
        totals[payout.coachId].pendingPayoutAmount += payout.grossAmount
      }
    })

    return Object.values(totals).sort((a, b) => b.totalEarnings - a.totalEarnings)
  }

  // Stats globali
  const filteredPayments = getFilteredPayments()
  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
  const platformEarningsGross = filteredPayments.reduce((sum, p) => sum + p.platformFee, 0)
  const platformEarningsNet = platformEarningsGross / 1.22 // Scorporo IVA 22%
  const coachPayouts = filteredPayments.reduce((sum, p) => sum + p.coachPayout, 0)
  const subscriptionRevenue = subscriptions.length * 29

  // Verifica fattura coach
  const handleVerifyInvoice = async (payout: PendingPayout, approved: boolean) => {
    setProcessing(true)
    try {
      const trackingRef = doc(db, 'payoutTracking', payout.id)
      
      const updateData: any = {
        offerId: payout.offerId,
        coachId: payout.coachId,
        coachName: payout.coachName,
        sessionNumber: payout.sessionNumber,
        grossAmount: payout.grossAmount,
        updatedAt: serverTimestamp()
      }
      
      if (approved) {
        updateData.coachInvoice = {
          ...payout.coachInvoice,
          verified: true,
          verifiedAt: serverTimestamp(),
          verifiedBy: 'admin'
        }
        updateData.payoutStatus = 'ready_for_payout'
      } else {
        updateData.coachInvoice = {
          ...payout.coachInvoice,
          rejectedAt: serverTimestamp(),
          rejectionReason: rejectReason
        }
        updateData.payoutStatus = 'invoice_rejected'
      }
      
      // Usa setDoc con merge per creare o aggiornare
      const { setDoc } = await import('firebase/firestore')
      await setDoc(trackingRef, updateData, { merge: true })
      
      // Aggiorna stato locale
      setPendingPayouts(prev => prev.map(p => {
        if (p.id === payout.id) {
          return {
            ...p,
            payoutStatus: approved ? 'ready_for_payout' : 'invoice_rejected',
            coachInvoice: {
              ...p.coachInvoice,
              verified: approved,
              verifiedAt: approved ? new Date() : undefined,
              rejectedAt: !approved ? new Date() : undefined,
              rejectionReason: !approved ? rejectReason : undefined
            }
          }
        }
        return p
      }))
      
      setVerifyModal(null)
      setRejectReason('')
      
      // Invia email al coach
      await sendPayoutEmail(payout, approved ? 'invoice_verified' : 'invoice_rejected')
      
      if (!approved) {
        alert(`Fattura rifiutata. Il coach riceverà una notifica.`)
      } else {
        alert(`Fattura verificata! Pronta per il payout.`)
      }
    } catch (err) {
      console.error('Errore verifica fattura:', err)
      alert('Errore durante la verifica')
    } finally {
      setProcessing(false)
    }
  }

  // Esegui batch payout manuale
  const handleManualBatchPayout = async () => {
    if (!confirm('Vuoi eseguire il batch payout adesso? Verranno processati tutti i payout pronti.')) return
    
    setProcessing(true)
    try {
      const response = await fetch('/api/admin/batch-payout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'manual'}`
        }
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert(`Batch payout completato!\n\nProcessati: ${result.processed}\nCompletati: ${result.successful}\nFalliti: ${result.failed}`)
        loadData() // Ricarica dati
      } else {
        alert(`Errore: ${result.error}`)
      }
    } catch (err) {
      console.error('Errore batch payout:', err)
      alert('Errore durante il batch payout')
    } finally {
      setProcessing(false)
    }
  }

  const coachTotals = getCoachTotals()

  // Invia email al coach per cambio stato payout
  const sendPayoutEmail = async (payout: PendingPayout, type: 'invoice_received' | 'invoice_verified' | 'invoice_rejected' | 'payout_completed' | 'reset') => {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: `payout_${type}`,
          data: {
            coachEmail: payout.coachEmail,
            coachName: payout.coachName,
            offerTitle: payout.offerTitle,
            sessionNumber: payout.sessionNumber,
            amount: payout.grossAmount,
            invoiceNumber: payout.coachInvoice.number,
            rejectionReason: rejectReason || undefined
          }
        })
      })
    } catch (err) {
      console.error('Errore invio email:', err)
    }
  }

  // Segna fattura come ricevuta
  const handleReceiveInvoice = async (payout: PendingPayout) => {
    if (!invoiceNumber.trim()) {
      alert('Inserisci il numero fattura')
      return
    }
    
    setProcessing(true)
    try {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'payoutTracking', payout.id), {
        offerId: payout.offerId,
        coachId: payout.coachId,
        coachName: payout.coachName,
        sessionNumber: payout.sessionNumber,
        grossAmount: payout.grossAmount,
        coachInvoice: {
          required: true,
          received: true,
          number: invoiceNumber.trim(),
          receivedAt: serverTimestamp(),
          verified: false
        },
        payoutStatus: 'invoice_received',
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      // Aggiorna stato locale
      setPendingPayouts(prev => prev.map(p => {
        if (p.id === payout.id) {
          return {
            ...p,
            payoutStatus: 'invoice_received',
            coachInvoice: {
              ...p.coachInvoice,
              received: true,
              number: invoiceNumber.trim(),
              receivedAt: new Date()
            }
          }
        }
        return p
      }))
      
      // Invia email al coach
      await sendPayoutEmail({ ...payout, coachInvoice: { ...payout.coachInvoice, number: invoiceNumber.trim() } }, 'invoice_received')
      
      setReceiveInvoiceModal(null)
      setInvoiceNumber('')
      alert('Fattura registrata! Il coach riceverà una conferma.')
    } catch (err) {
      console.error('Errore registrazione fattura:', err)
      alert('Errore durante la registrazione')
    } finally {
      setProcessing(false)
    }
  }

  // Segna payout come completato (pagato)
  const handleMarkAsPaid = async (payout: PendingPayout) => {
    if (!confirm(`Confermi di aver pagato €${payout.grossAmount.toFixed(2)} a ${payout.coachName}?`)) return
    
    setProcessing(true)
    try {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'payoutTracking', payout.id), {
        offerId: payout.offerId,
        coachId: payout.coachId,
        coachName: payout.coachName,
        sessionNumber: payout.sessionNumber,
        grossAmount: payout.grossAmount,
        payoutStatus: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      // Aggiorna stato locale
      setPendingPayouts(prev => prev.map(p => {
        if (p.id === payout.id) {
          return {
            ...p,
            payoutStatus: 'completed',
            completedAt: new Date()
          }
        }
        return p
      }))
      
      // Invia email al coach
      await sendPayoutEmail(payout, 'payout_completed')
      
      alert(`Payout completato! ${payout.coachName} riceverà una conferma.`)
    } catch (err) {
      console.error('Errore completamento payout:', err)
      alert('Errore durante il completamento')
    } finally {
      setProcessing(false)
    }
  }

  // Status badge per payout
  const getPayoutStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      'awaiting_invoice': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'In attesa fattura' },
      'invoice_received': { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileText, label: 'Fattura ricevuta' },
      'invoice_rejected': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Fattura rifiutata' },
      'ready_for_payout': { bg: 'bg-purple-100', text: 'text-purple-700', icon: CheckCircle, label: 'Pronto per payout' },
      'completed': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Completato' },
      'failed': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'Fallito' }
    }
    
    const c = config[status] || config['awaiting_invoice']
    const Icon = c.icon
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${c.bg} ${c.text} flex items-center gap-1 justify-center w-fit`}>
        <Icon size={12} />
        {c.label}
      </span>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Pagamenti</h1>
          <p className="text-gray-500">Panoramica finanziaria e gestione payout coach</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Euro className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Totale incassato</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border bg-gradient-to-br from-primary-50 to-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-gray-500">Guadagno CoachaMi</span>
            </div>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(platformEarningsNet)}</p>
            <p className="text-xs text-gray-400 mt-1">30% commissione (netto IVA)</p>
          </div>
          <div className="bg-white p-5 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <HourglassIcon className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">Payout in sospeso</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(payoutStats.totalPending)}</p>
            <p className="text-xs text-gray-400 mt-1">{payoutStats.awaitingInvoice + payoutStats.invoiceReceived + payoutStats.readyForPayout} da processare</p>
          </div>
          <div className="bg-white p-5 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Abbonamenti</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">{subscriptions.length}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(subscriptionRevenue)}/mese</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Euro size={16} className="inline mr-2" />
            Panoramica
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'payouts' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Banknote size={16} className="inline mr-2" />
            Payout Coach
            {payoutStats.awaitingInvoice + payoutStats.invoiceReceived > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {payoutStats.awaitingInvoice + payoutStats.invoiceReceived}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('coaches')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'coaches' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Per Coach ({uniqueCoaches.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'subscriptions' ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Abbonamenti ({subscriptions.length})
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
            </div>
          ) : activeTab === 'overview' ? (
            <>
              {/* Filtri */}
              <div className="p-4 border-b bg-gray-50 flex gap-4 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Filtra:</span>
                </div>
                
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tutti i coach</option>
                  {uniqueCoaches.map(coach => (
                    <option key={coach.id} value={coach.id}>{coach.name}</option>
                  ))}
                </select>
                
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tutti i mesi</option>
                  {getMonthsWithPayments().map(month => {
                    const [year, m] = month.split('-')
                    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
                    return (
                      <option key={month} value={month}>
                        {monthNames[parseInt(m) - 1]} {year}
                      </option>
                    )
                  })}
                </select>

                {(selectedCoach !== 'all' || selectedMonth !== 'all') && (
                  <button
                    onClick={() => { setSelectedCoach('all'); setSelectedMonth('all'); }}
                    className="text-sm text-primary-500 hover:underline"
                  >
                    Resetta filtri
                  </button>
                )}
              </div>

              {/* Lista pagamenti */}
              {filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun pagamento trovato</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Offerta</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coachee</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">CoachaMi</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((payment, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">
                          {payment.paidAt && format(new Date(payment.paidAt), 'dd MMM yyyy', { locale: it })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-charcoal">{payment.offerTitle}</p>
                          <p className="text-xs text-gray-400">Sessione {payment.sessionNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{payment.coachName}</td>
                        <td className="px-6 py-4 text-gray-700">{payment.coacheeName}</td>
                        <td className="px-6 py-4 text-right font-medium">{formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4 text-right text-primary-600 font-medium">{formatCurrency(payment.platformFee)}</td>
                        <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(payment.coachPayout)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-right font-semibold text-gray-700">Totale:</td>
                      <td className="px-6 py-3 text-right font-bold text-charcoal">{formatCurrency(totalRevenue)}</td>
                      <td className="px-6 py-3 text-right font-bold text-primary-600">{formatCurrency(platformEarnings)}</td>
                      <td className="px-6 py-3 text-right font-bold text-green-600">{formatCurrency(coachPayouts)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          ) : activeTab === 'payouts' ? (
            /* Tab Payout Coach */
            <>
              {/* Stats payout */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{payoutStats.awaitingInvoice}</p>
                      <p className="text-xs text-gray-500">In attesa fattura</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{payoutStats.invoiceReceived}</p>
                      <p className="text-xs text-gray-500">Da verificare</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{payoutStats.readyForPayout}</p>
                      <p className="text-xs text-gray-500">Pronti per payout</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{payoutStats.completed}</p>
                      <p className="text-xs text-gray-500">Completati</p>
                    </div>
                    {payoutStats.rejected > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{payoutStats.rejected}</p>
                        <p className="text-xs text-gray-500">Rifiutati</p>
                      </div>
                    )}
                  </div>
                  
                  {payoutStats.readyForPayout > 0 && (
                    <button
                      onClick={handleManualBatchPayout}
                      disabled={processing}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 disabled:opacity-50"
                    >
                      {processing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Esegui Payout Ora
                    </button>
                  )}
                </div>
              </div>
              
              {/* Filtri payout */}
              <div className="p-4 border-b flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: 'Tutti' },
                  { value: 'awaiting_invoice', label: 'In attesa fattura' },
                  { value: 'invoice_received', label: 'Da verificare' },
                  { value: 'ready_for_payout', label: 'Pronti' },
                  { value: 'completed', label: 'Completati' },
                  { value: 'invoice_rejected', label: 'Rifiutati' },
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setPayoutFilter(filter.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      payoutFilter === filter.value
                        ? 'bg-charcoal text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {/* Lista payout */}
              {filteredPayouts.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Banknote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun payout {payoutFilter !== 'all' ? 'con questo stato' : ''}</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coach</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Offerta</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">N. Fattura</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Payout</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayouts.map(payout => (
                      <tr key={payout.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">
                          {format(payout.paidAt, 'dd MMM yyyy', { locale: it })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-charcoal">{payout.coachName}</p>
                          <p className="text-xs text-gray-400">{payout.coachEmail}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-700">{payout.offerTitle || `Offerta #${payout.offerId.slice(-6)}`}</p>
                          <p className="text-xs text-gray-400">Sessione {payout.sessionNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-bold text-charcoal">{formatCurrency(payout.grossAmount)}</p>
                          <p className="text-xs text-gray-400">da pagare al coach</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {payout.coachInvoice.number ? (
                            <span className="text-sm font-mono">{payout.coachInvoice.number}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getPayoutStatusBadge(payout.payoutStatus)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500">
                          {payout.completedAt ? (
                            format(payout.completedAt, 'dd/MM/yy', { locale: it })
                          ) : (
                            format(payout.scheduledPayoutDate, 'dd/MM/yy', { locale: it })
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Segna fattura ricevuta */}
                            {payout.payoutStatus === 'awaiting_invoice' && (
                              <button
                                onClick={() => setReceiveInvoiceModal(payout)}
                                className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                                title="Segna fattura ricevuta"
                              >
                                <FileText size={16} />
                              </button>
                            )}
                            
                            {/* Verifica fattura */}
                            {payout.payoutStatus === 'invoice_received' && !payout.coachInvoice.verified && (
                              <button
                                onClick={() => setVerifyModal(payout)}
                                className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200"
                                title="Verifica fattura"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            
                            {/* Segna come pagato */}
                            {(payout.payoutStatus === 'ready_for_payout' || (payout.payoutStatus === 'invoice_received' && payout.coachInvoice.verified)) && (
                              <button
                                onClick={() => handleMarkAsPaid(payout)}
                                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                                title="Segna come pagato"
                              >
                                <Banknote size={16} />
                              </button>
                            )}
                            
                            {/* Reset fattura rifiutata */}
                            {payout.payoutStatus === 'invoice_rejected' && (
                              <button
                                onClick={async () => {
                                  if (!confirm('Resettare lo stato? Il coach potrà reinviare la fattura.')) return
                                  const { setDoc } = await import('firebase/firestore')
                                  await setDoc(doc(db, 'payoutTracking', payout.id), {
                                    payoutStatus: 'awaiting_invoice',
                                    coachInvoice: {
                                      required: true,
                                      received: false,
                                      number: null,
                                      verified: false
                                    },
                                    updatedAt: serverTimestamp()
                                  }, { merge: true })
                                  // Invia email al coach
                                  await sendPayoutEmail(payout, 'reset')
                                  loadData()
                                }}
                                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                                title="Reset stato"
                              >
                                <RefreshCw size={16} />
                              </button>
                            )}
                            
                            {/* Badge completato */}
                            {payout.payoutStatus === 'completed' && (
                              <span className="p-2 rounded-lg bg-green-100 text-green-600">
                                <CheckCircle size={16} />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : activeTab === 'coaches' ? (
            /* Tab Coach */
            coachTotals.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun coach con pagamenti</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {coachTotals.map(coach => (
                  <div key={coach.coachId} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-charcoal text-lg">{coach.coachName}</h3>
                        <p className="text-sm text-gray-500">{coach.coachEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(coach.totalEarnings)}</p>
                        <p className="text-sm text-gray-500">Guadagno totale</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Sessioni pagate</p>
                        <p className="text-xl font-bold text-charcoal">{coach.paidSessions}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Sessioni in attesa</p>
                        <p className="text-xl font-bold text-charcoal">{coach.pendingSessions}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Payout pendenti</p>
                        <p className="text-xl font-bold text-amber-600">{formatCurrency(coach.pendingPayoutAmount)}</p>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Commissione CoachaMi</p>
                        <p className="text-xl font-bold text-primary-600">{formatCurrency(coach.totalPlatformFee)}</p>
                      </div>
                    </div>
                    
                    {/* Breakdown mensile */}
                    {Object.keys(coach.monthlyBreakdown).length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Guadagni per mese:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(coach.monthlyBreakdown)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([month, amount]) => {
                              const [year, m] = month.split('-')
                              const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
                              return (
                                <div key={month} className="px-3 py-2 bg-green-50 rounded-lg">
                                  <p className="text-xs text-gray-500">{monthNames[parseInt(m) - 1]} {year}</p>
                                  <p className="font-semibold text-green-600">{formatCurrency(amount)}</p>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Tab Abbonamenti */
            subscriptions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun abbonamento attivo</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Utente</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Importo</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data inizio</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-charcoal">{sub.userName || 'Utente'}</td>
                      <td className="px-6 py-4 text-gray-500">{sub.userEmail}</td>
                      <td className="px-6 py-4 text-center text-gray-500">Community</td>
                      <td className="px-6 py-4 text-center font-medium">{formatCurrency(sub.amount)}/mese</td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {format(sub.startDate, 'dd MMM yyyy', { locale: it })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          Attivo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Link a Stripe */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-charcoal">Dashboard Stripe</h3>
              <p className="text-sm text-gray-500">Gestisci pagamenti, rimborsi e payout direttamente su Stripe</p>
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#635BFF] text-white rounded-lg hover:bg-[#5851db] flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Apri Stripe Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Modal verifica fattura */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">Verifica Fattura Coach</h3>
              <button 
                onClick={() => { setVerifyModal(null); setRejectReason(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Info payout */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Coach</p>
                    <p className="font-medium text-charcoal">{verifyModal.coachName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Importo</p>
                    <p className="font-bold text-green-600">{formatCurrency(verifyModal.grossAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">N. Fattura</p>
                    <p className="font-mono">{verifyModal.coachInvoice.number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data payout</p>
                    <p className="font-medium">{format(verifyModal.scheduledPayoutDate, 'dd MMM yyyy', { locale: it })}</p>
                  </div>
                </div>
              </div>
              
              {/* Info verifica */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">Cosa verificare:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Intestatario: CoachaMi / Debora Carofiglio</li>
                  <li>• P.IVA: IT02411430685</li>
                  <li>• Importo fattura: <strong>{formatCurrency(verifyModal.grossAmount)}</strong></li>
                  <li>• Descrizione servizio coaching</li>
                </ul>
              </div>
              
              {/* Campo motivo rifiuto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo rifiuto (opzionale)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Es: Importo errato, dati intestatario non corretti..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleVerifyInvoice(verifyModal, false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle size={16} />
                Rifiuta
              </button>
              <button
                onClick={() => handleVerifyInvoice(verifyModal, true)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Approva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registra fattura ricevuta */}
      {receiveInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">Registra Fattura Ricevuta</h3>
              <button 
                onClick={() => { setReceiveInvoiceModal(null); setInvoiceNumber(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Info payout */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Coach</p>
                    <p className="font-medium text-charcoal">{receiveInvoiceModal.coachName}</p>
                    <p className="text-xs text-gray-400">{receiveInvoiceModal.coachEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Importo da pagare</p>
                    <p className="font-bold text-green-600">{formatCurrency(receiveInvoiceModal.grossAmount)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Offerta</p>
                  <p className="font-medium text-charcoal">{receiveInvoiceModal.offerTitle} - Sessione {receiveInvoiceModal.sessionNumber}</p>
                </div>
              </div>
              
              {/* Campo numero fattura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Fattura *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Es: FT-2026-001"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">Inserisci il numero fattura ricevuto dal coach</p>
              </div>
              
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-sm text-amber-700">
                  <strong>Nota:</strong> Dopo la registrazione, dovrai verificare che la fattura sia corretta prima di procedere al pagamento.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setReceiveInvoiceModal(null); setInvoiceNumber(''); }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={() => handleReceiveInvoice(receiveInvoiceModal)}
                disabled={processing || !invoiceNumber.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Registra Fattura
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
