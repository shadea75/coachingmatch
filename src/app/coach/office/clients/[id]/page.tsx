'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  Euro,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  MoreVertical,
  Save,
  X,
  MessageSquare,
  TrendingUp,
  Target,
  MapPin,
  Building
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface ClientData {
  id: string
  name: string
  email: string
  phone?: string
  notes?: string
  source: 'coachami' | 'external'
  coacheeId?: string
  createdAt: Date
  // Dati per contratto
  address?: string
  city?: string
  postalCode?: string
  province?: string
  fiscalCode?: string
  vatNumber?: string
}

interface Offer {
  id: string
  title: string
  totalSessions: number
  completedSessions: number
  paidInstallments: number
  pricePerSession: number
  priceTotal: number
  sessionDuration: number
  status: string
  createdAt: Date
  source: 'coachami' | 'external'
}

interface Session {
  id: string
  scheduledAt: Date
  duration: number
  status: string
  type: string
  offerId?: string
  offerTitle?: string
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const clientId = params.id as string
  const source = searchParams.get('source') || 'external'
  
  const [isLoading, setIsLoading] = useState(true)
  const [client, setClient] = useState<ClientData | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    notes: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    fiscalCode: '',
    vatNumber: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'offers' | 'sessions'>('info')
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalRevenue: 0,
    activeOffers: 0
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId || !user?.id) return
      
      setIsLoading(true)
      try {
        let clientData: ClientData | null = null
        let clientOffers: Offer[] = []
        let clientSessions: Session[] = []
        
        if (source === 'external') {
          // Cliente esterno
          const clientDoc = await getDoc(doc(db, 'coachClients', clientId))
          if (clientDoc.exists()) {
            const data = clientDoc.data()
            clientData = {
              id: clientDoc.id,
              name: data.name,
              email: data.email,
              phone: data.phone,
              notes: data.notes,
              source: 'external',
              createdAt: data.createdAt?.toDate() || new Date()
            }
            
            // Carica offerte esterne
            const externalOffersQuery = query(
              collection(db, 'externalOffers'),
              where('clientId', '==', clientId),
              where('coachId', '==', user.id)
            )
            const externalOffersSnap = await getDocs(externalOffersQuery)
            clientOffers = externalOffersSnap.docs.map(doc => {
              const d = doc.data()
              return {
                id: doc.id,
                title: d.title,
                totalSessions: d.totalSessions,
                completedSessions: d.completedSessions || 0,
                paidInstallments: d.paidInstallments || 0,
                pricePerSession: d.pricePerSession,
                priceTotal: d.priceTotal,
                sessionDuration: d.sessionDuration,
                status: d.status,
                createdAt: d.createdAt?.toDate() || new Date(),
                source: 'external'
              }
            })
            
            // Carica sessioni esterne
            const externalSessionsQuery = query(
              collection(db, 'externalSessions'),
              where('clientId', '==', clientId),
              where('coachId', '==', user.id)
            )
            const externalSessionsSnap = await getDocs(externalSessionsQuery)
            clientSessions = externalSessionsSnap.docs.map(doc => {
              const d = doc.data()
              return {
                id: doc.id,
                scheduledAt: d.scheduledAt?.toDate() || new Date(),
                duration: d.duration,
                status: d.status,
                type: 'external',
                offerId: d.offerId,
                offerTitle: d.offerTitle
              }
            })
          }
        } else {
          // Cliente CoachaMi (coacheeId)
          const offersQuery = query(
            collection(db, 'offers'),
            where('coacheeId', '==', clientId),
            where('coachId', '==', user.id)
          )
          const offersSnap = await getDocs(offersQuery)
          
          if (offersSnap.docs.length > 0) {
            const firstOffer = offersSnap.docs[0].data()
            clientData = {
              id: clientId,
              name: firstOffer.coacheeName || 'Cliente',
              email: firstOffer.coacheeEmail || '',
              source: 'coachami',
              coacheeId: clientId,
              createdAt: firstOffer.createdAt?.toDate() || new Date()
            }
            
            clientOffers = offersSnap.docs.map(doc => {
              const d = doc.data()
              return {
                id: doc.id,
                title: d.title,
                totalSessions: d.totalSessions,
                completedSessions: d.completedSessions || 0,
                paidInstallments: d.paidInstallments || 0,
                pricePerSession: d.pricePerSession,
                priceTotal: d.priceTotal || d.totalSessions * d.pricePerSession,
                sessionDuration: d.sessionDuration,
                status: d.status,
                createdAt: d.createdAt?.toDate() || new Date(),
                source: 'coachami'
              }
            })
            
            // Carica sessioni CoachaMi
            const sessionsQuery = query(
              collection(db, 'sessions'),
              where('coacheeId', '==', clientId),
              where('coachId', '==', user.id)
            )
            const sessionsSnap = await getDocs(sessionsQuery)
            clientSessions = sessionsSnap.docs.map(doc => {
              const d = doc.data()
              return {
                id: doc.id,
                scheduledAt: d.scheduledAt?.toDate() || new Date(),
                duration: d.duration,
                status: d.status,
                type: d.type,
                offerId: d.offerId,
                offerTitle: d.offerTitle
              }
            })
          }
        }
        
        setClient(clientData)
        setOffers(clientOffers)
        setSessions(clientSessions)
        
        if (clientData) {
          setEditData({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone || '',
            notes: clientData.notes || '',
            address: clientData.address || '',
            city: clientData.city || '',
            postalCode: clientData.postalCode || '',
            province: clientData.province || '',
            fiscalCode: clientData.fiscalCode || '',
            vatNumber: clientData.vatNumber || ''
          })
        }
        
        // Calcola statistiche
        const totalSessions = clientOffers.reduce((sum, o) => sum + o.totalSessions, 0)
        const completedSessions = clientOffers.reduce((sum, o) => sum + o.completedSessions, 0)
        const totalRevenue = clientOffers.reduce((sum, o) => sum + (o.paidInstallments * o.pricePerSession), 0)
        const activeOffers = clientOffers.filter(o => o.status === 'active' || o.status === 'accepted').length
        
        setStats({ totalSessions, completedSessions, totalRevenue, activeOffers })
        
      } catch (err) {
        console.error('Errore caricamento:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadClientData()
    }
  }, [clientId, source, user])

  const handleSave = async () => {
    if (!client || source === 'coachami') return
    
    setIsSaving(true)
    try {
      await updateDoc(doc(db, 'coachClients', clientId), {
        name: editData.name,
        email: editData.email,
        phone: editData.phone || null,
        notes: editData.notes || null,
        address: editData.address || null,
        city: editData.city || null,
        postalCode: editData.postalCode || null,
        province: editData.province || null,
        fiscalCode: editData.fiscalCode?.toUpperCase() || null,
        vatNumber: editData.vatNumber || null,
        updatedAt: serverTimestamp()
      })
      
      setClient({ ...client, ...editData })
      setIsEditing(false)
    } catch (err) {
      console.error('Errore salvataggio:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!client || source === 'coachami') return
    
    try {
      await deleteDoc(doc(db, 'coachClients', clientId))
      router.push('/coach/office')
    } catch (err) {
      console.error('Errore eliminazione:', err)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-gray-300" size={48} />
          <h2 className="text-xl font-semibold text-charcoal mb-2">Cliente non trovato</h2>
          <Link href="/coach/office" className="text-primary-500 hover:underline">
            Torna all'Ufficio Virtuale
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/coach/office" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-charcoal">{client.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                client.source === 'coachami' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {client.source === 'coachami' ? 'CoachaMi' : 'Esterno'}
              </span>
            </div>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Calendar size={16} />
              <span>Sessioni</span>
            </div>
            <p className="text-xl font-bold text-charcoal">
              {stats.completedSessions}/{stats.totalSessions}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Euro size={16} />
              <span>Fatturato</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              €{stats.totalRevenue.toLocaleString('it-IT')}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Target size={16} />
              <span>Percorsi Attivi</span>
            </div>
            <p className="text-xl font-bold text-charcoal">{stats.activeOffers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock size={16} />
              <span>Cliente dal</span>
            </div>
            <p className="text-lg font-semibold text-charcoal">
              {format(client.createdAt, 'MMM yyyy', { locale: it })}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Informazioni
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'offers'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Percorsi ({offers.length})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'sessions'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sessioni ({sessions.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    {/* Sezione Residenza */}
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <MapPin size={16} />
                        Residenza (per contratto)
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Indirizzo</label>
                          <input
                            type="text"
                            value={editData.address}
                            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                            placeholder="Via Roma 1"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">CAP</label>
                            <input
                              type="text"
                              value={editData.postalCode}
                              onChange={(e) => setEditData({ ...editData, postalCode: e.target.value })}
                              placeholder="00100"
                              maxLength={5}
                              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">Città</label>
                            <input
                              type="text"
                              value={editData.city}
                              onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                              placeholder="Roma"
                              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">Prov.</label>
                            <input
                              type="text"
                              value={editData.province}
                              onChange={(e) => setEditData({ ...editData, province: e.target.value.toUpperCase() })}
                              placeholder="RM"
                              maxLength={2}
                              className="w-full px-4 py-2 border border-gray-200 rounded-xl uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sezione Dati Fiscali */}
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Building size={16} />
                        Dati Fiscali (per contratto)
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Codice Fiscale</label>
                          <input
                            type="text"
                            value={editData.fiscalCode}
                            onChange={(e) => setEditData({ ...editData, fiscalCode: e.target.value.toUpperCase() })}
                            placeholder="RSSMRA80A01H501Z"
                            maxLength={16}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl uppercase font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">P.IVA (opzionale)</label>
                          <input
                            type="text"
                            value={editData.vatNumber}
                            onChange={(e) => setEditData({ ...editData, vatNumber: e.target.value })}
                            placeholder="IT12345678901"
                            maxLength={13}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                      <textarea
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Salva
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                        client.source === 'coachami' ? 'bg-primary-500' : 'bg-purple-500'
                      }`}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-charcoal">{client.name}</h3>
                        <p className="text-gray-500">{client.email}</p>
                      </div>
                    </div>
                    
                    {client.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Phone className="text-gray-400" size={18} />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    
                    {/* Dati Residenza */}
                    {(client.address || client.city) && (
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                          <MapPin size={16} />
                          <span>Residenza</span>
                        </div>
                        <p className="text-charcoal">
                          {client.address && <>{client.address}<br /></>}
                          {client.postalCode} {client.city} {client.province && `(${client.province})`}
                        </p>
                      </div>
                    )}
                    
                    {/* Dati Fiscali */}
                    {(client.fiscalCode || client.vatNumber) && (
                      <div className="p-4 bg-green-50 rounded-xl">
                        <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
                          <Building size={16} />
                          <span>Dati Fiscali</span>
                        </div>
                        <div className="space-y-1 text-charcoal">
                          {client.fiscalCode && (
                            <p><span className="text-gray-500 text-sm">C.F.:</span> <span className="font-mono">{client.fiscalCode}</span></p>
                          )}
                          {client.vatNumber && (
                            <p><span className="text-gray-500 text-sm">P.IVA:</span> <span className="font-mono">{client.vatNumber}</span></p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {client.notes && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                          <FileText size={16} />
                          <span>Note</span>
                        </div>
                        <p className="text-charcoal whitespace-pre-wrap">{client.notes}</p>
                      </div>
                    )}
                    
                    {source === 'external' && (
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"
                        >
                          <Edit size={18} />
                          Modifica
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="px-6 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 flex items-center justify-center gap-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-4">
                {/* Pulsante nuovo percorso - per tutti i clienti */}
                <Link
                  href={source === 'external' 
                    ? `/coach/office/clients/${clientId}/new-offer`
                    : `/coach/office/clients/${clientId}/new-offer?source=coachami&coacheeId=${client?.coacheeId}`
                  }
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary-300 hover:text-primary-500 transition-colors"
                >
                  <Plus size={20} />
                  Nuovo Percorso
                  {source === 'coachami' && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full ml-2">
                      con commissione
                    </span>
                  )}
                </Link>
                
                {offers.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="mx-auto mb-4 text-gray-300" size={40} />
                    <p className="text-gray-500">Nessun percorso ancora</p>
                  </div>
                ) : (
                  offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-charcoal">{offer.title}</h4>
                          <p className="text-sm text-gray-500">
                            {offer.sessionDuration} min • €{offer.pricePerSession}/sessione
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          offer.status === 'active' || offer.status === 'accepted'
                            ? 'bg-green-100 text-green-700'
                            : offer.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {offer.status === 'active' || offer.status === 'accepted' ? 'Attivo' : 
                           offer.status === 'completed' ? 'Completato' : offer.status}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Sessioni: {offer.completedSessions}/{offer.totalSessions}</span>
                          <span>Pagato: €{(offer.paidInstallments * offer.pricePerSession).toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${(offer.completedSessions / offer.totalSessions) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto mb-4 text-gray-300" size={40} />
                    <p className="text-gray-500">Nessuna sessione ancora</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        session.status === 'completed' ? 'bg-green-100' :
                        session.status === 'confirmed' ? 'bg-blue-100' :
                        session.status === 'pending' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        {session.status === 'completed' ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <Clock className={`${
                            session.status === 'confirmed' ? 'text-blue-600' :
                            session.status === 'pending' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`} size={20} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-charcoal">
                          {format(session.scheduledAt, "EEEE d MMMM", { locale: it })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(session.scheduledAt, "HH:mm")} • {session.duration} min
                          {session.offerTitle && ` • ${session.offerTitle}`}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        session.status === 'completed' ? 'bg-green-100 text-green-700' :
                        session.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        session.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {session.status === 'completed' ? 'Completata' :
                         session.status === 'confirmed' ? 'Confermata' :
                         session.status === 'pending' ? 'In attesa' :
                         session.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            <h3 className="text-lg font-semibold text-charcoal mb-2">Elimina Cliente</h3>
            <p className="text-gray-500 mb-6">
              Sei sicuro di voler eliminare {client.name}? Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600"
              >
                Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
