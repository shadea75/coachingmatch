'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Check, 
  X, 
  Mail, 
  Eye,
  Edit,
  CreditCard,
  Calendar,
  Star,
  Users,
  Loader2,
  ChevronDown,
  Save,
  Euro
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, query, getDocs, doc, updateDoc, getDoc, where, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'

interface Coach {
  id: string
  name: string
  email: string
  photo: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  lifeArea: string
  lifeAreas: string[]
  createdAt: any
  approvedAt?: any
  // Abbonamento
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'free'
  subscriptionPrice: number // Prezzo personalizzato (null = usa default)
  subscriptionStartDate?: any
  subscriptionEndDate?: any
  trialEndDate?: any
  // Stats
  sessionsCount: number
  reviewsCount: number
  rating: number
}

const LIFE_AREAS_MAP: Record<string, string> = {
  'salute': 'Salute e Vitalità',
  'finanze': 'Finanze',
  'carriera': 'Carriera/Lavoro',
  'relazioni': 'Relazioni',
  'amore': 'Amore',
  'crescita': 'Crescita Personale',
  'spiritualita': 'Spiritualità',
  'divertimento': 'Divertimento'
}

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all')
  const [defaultPrice, setDefaultPrice] = useState(19)
  const [trialDays, setTrialDays] = useState(90)
  
  // Modal per modifica abbonamento
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null)
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editStatus, setEditStatus] = useState<'trial' | 'active' | 'expired' | 'free'>('trial')
  const [saving, setSaving] = useState(false)

  // Carica impostazioni default
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const communityDoc = await getDoc(doc(db, 'settings', 'community'))
        if (communityDoc.exists()) {
          const data = communityDoc.data()
          setDefaultPrice(data.coachMonthlyPrice ?? 19)
          setTrialDays(data.freeTrialDays ?? 90)
        }
      } catch (err) {
        console.error('Errore caricamento settings:', err)
      }
    }
    loadSettings()
  }, [])

  // Carica coach
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        const coachesQuery = query(
          collection(db, 'coachApplications'),
          orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(coachesQuery)
        
        const loadedCoaches: Coach[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data()
          
          // Calcola stato abbonamento
          let subscriptionStatus: 'trial' | 'active' | 'expired' | 'free' = 'trial'
          const now = new Date()
          
          if (data.subscriptionPrice === 0) {
            subscriptionStatus = 'free'
          } else if (data.subscriptionEndDate?.toDate?.() > now) {
            subscriptionStatus = 'active'
          } else if (data.trialEndDate?.toDate?.() > now || 
                     (data.createdAt?.toDate?.() && 
                      new Date(data.createdAt.toDate().getTime() + trialDays * 24 * 60 * 60 * 1000) > now)) {
            subscriptionStatus = 'trial'
          } else {
            subscriptionStatus = 'expired'
          }
          
          return {
            id: docSnap.id,
            name: data.name || 'N/A',
            email: data.email || 'N/A',
            photo: data.photo || null,
            status: data.status || 'pending',
            lifeArea: data.lifeArea || '',
            lifeAreas: data.lifeAreas || [],
            createdAt: data.createdAt,
            approvedAt: data.approvedAt,
            subscriptionStatus: data.subscriptionStatus || subscriptionStatus,
            subscriptionPrice: data.subscriptionPrice ?? defaultPrice,
            subscriptionStartDate: data.subscriptionStartDate,
            subscriptionEndDate: data.subscriptionEndDate,
            trialEndDate: data.trialEndDate,
            sessionsCount: data.sessionsCount || 0,
            reviewsCount: data.reviewsCount || 0,
            rating: data.rating || 0
          }
        })
        
        setCoaches(loadedCoaches)
      } catch (err) {
        console.error('Errore caricamento coach:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadCoaches()
  }, [defaultPrice, trialDays])

  // Filtra coach
  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coach.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || coach.status === statusFilter
    const matchesSubscription = subscriptionFilter === 'all' || coach.subscriptionStatus === subscriptionFilter
    return matchesSearch && matchesStatus && matchesSubscription
  })

  // Apri modal modifica abbonamento
  const openEditModal = (coach: Coach) => {
    setEditingCoach(coach)
    setEditPrice(coach.subscriptionPrice)
    setEditStatus(coach.subscriptionStatus)
  }

  // Salva modifiche abbonamento
  const saveSubscription = async () => {
    if (!editingCoach) return
    
    setSaving(true)
    try {
      const updateData: any = {
        subscriptionPrice: editPrice,
        subscriptionStatus: editPrice === 0 ? 'free' : editStatus,
        updatedAt: new Date()
      }
      
      // Se viene attivato l'abbonamento, imposta le date
      if (editStatus === 'active' && editPrice > 0) {
        const now = new Date()
        updateData.subscriptionStartDate = now
        updateData.subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 giorni
      }
      
      await updateDoc(doc(db, 'coachApplications', editingCoach.id), updateData)
      
      // Aggiorna stato locale
      setCoaches(prev => prev.map(c => 
        c.id === editingCoach.id 
          ? { ...c, subscriptionPrice: editPrice, subscriptionStatus: editPrice === 0 ? 'free' : editStatus }
          : c
      ))
      
      setEditingCoach(null)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      alert('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  // Approva coach
  const approveCoach = async (coachId: string) => {
    try {
      await updateDoc(doc(db, 'coachApplications', coachId), {
        status: 'approved',
        approvedAt: new Date(),
        trialEndDate: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      })
      setCoaches(prev => prev.map(c => 
        c.id === coachId ? { ...c, status: 'approved', subscriptionStatus: 'trial' } : c
      ))
    } catch (err) {
      console.error('Errore approvazione:', err)
    }
  }

  // Rifiuta coach
  const rejectCoach = async (coachId: string) => {
    try {
      await updateDoc(doc(db, 'coachApplications', coachId), {
        status: 'rejected',
        rejectedAt: new Date()
      })
      setCoaches(prev => prev.map(c => 
        c.id === coachId ? { ...c, status: 'rejected' } : c
      ))
    } catch (err) {
      console.error('Errore rifiuto:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      suspended: 'bg-gray-100 text-gray-700'
    }
    const labels: Record<string, string> = {
      pending: 'In attesa',
      approved: 'Approvato',
      rejected: 'Rifiutato',
      suspended: 'Sospeso'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getSubscriptionBadge = (status: string, price: number) => {
    if (price === 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          Gratuito
        </span>
      )
    }
    const styles: Record<string, string> = {
      trial: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      free: 'bg-purple-100 text-purple-700'
    }
    const labels: Record<string, string> = {
      trial: 'Prova',
      active: 'Attivo',
      expired: 'Scaduto',
      free: 'Gratuito'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.trial}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary-500" size={40} />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Gestione Coach</h1>
            <p className="text-gray-500">Gestisci coach e abbonamenti personalizzati</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Abbonamento default: <strong>€{defaultPrice}/mese</strong></span>
            <span>•</span>
            <span>Trial: <strong>{trialDays} giorni</strong></span>
          </div>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tutti gli stati</option>
              <option value="pending">In attesa</option>
              <option value="approved">Approvati</option>
              <option value="rejected">Rifiutati</option>
              <option value="suspended">Sospesi</option>
            </select>
            
            {/* Subscription Filter */}
            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tutti gli abbonamenti</option>
              <option value="free">Gratuiti</option>
              <option value="trial">In prova</option>
              <option value="active">Attivi</option>
              <option value="expired">Scaduti</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Totale</p>
            <p className="text-2xl font-bold text-charcoal">{coaches.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Approvati</p>
            <p className="text-2xl font-bold text-green-600">
              {coaches.filter(c => c.status === 'approved').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">In prova</p>
            <p className="text-2xl font-bold text-blue-600">
              {coaches.filter(c => c.subscriptionStatus === 'trial').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Gratuiti</p>
            <p className="text-2xl font-bold text-purple-600">
              {coaches.filter(c => c.subscriptionPrice === 0).length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Scaduti</p>
            <p className="text-2xl font-bold text-red-600">
              {coaches.filter(c => c.subscriptionStatus === 'expired').length}
            </p>
          </div>
        </div>

        {/* Lista Coach */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Coach</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Area</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Stato</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Abbonamento</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Prezzo</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Registrato</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCoaches.map(coach => (
                  <tr key={coach.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {coach.photo ? (
                          <img 
                            src={coach.photo} 
                            alt={coach.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {coach.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-charcoal">{coach.name}</p>
                          <p className="text-xs text-gray-500">{coach.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {LIFE_AREAS_MAP[coach.lifeArea] || coach.lifeArea || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(coach.status)}
                    </td>
                    <td className="px-4 py-3">
                      {getSubscriptionBadge(coach.subscriptionStatus, coach.subscriptionPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${coach.subscriptionPrice === 0 ? 'text-purple-600' : 'text-charcoal'}`}>
                        €{coach.subscriptionPrice}/mese
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {coach.createdAt?.toDate?.() 
                          ? format(coach.createdAt.toDate(), 'd MMM yyyy', { locale: it })
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Approva/Rifiuta per pending */}
                        {coach.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveCoach(coach.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Approva"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => rejectCoach(coach.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Rifiuta"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                        
                        {/* Modifica abbonamento */}
                        <button
                          onClick={() => openEditModal(coach)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="Modifica abbonamento"
                        >
                          <Euro size={18} />
                        </button>
                        
                        {/* Visualizza profilo */}
                        <Link
                          href={`/coaches/${coach.id}`}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Vedi profilo"
                        >
                          <Eye size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredCoaches.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nessun coach trovato</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Modifica Abbonamento */}
      {editingCoach && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Modifica Abbonamento</h3>
              <button
                onClick={() => setEditingCoach(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Info Coach */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
              {editingCoach.photo ? (
                <img 
                  src={editingCoach.photo} 
                  alt={editingCoach.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-semibold text-lg">
                    {editingCoach.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-charcoal">{editingCoach.name}</p>
                <p className="text-sm text-gray-500">{editingCoach.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Prezzo personalizzato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prezzo abbonamento (€/mese)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Imposta 0 per abbonamento gratuito. Default: €{defaultPrice}/mese
                </p>
              </div>
              
              {/* Stato abbonamento */}
              {editPrice > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato abbonamento
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'trial' | 'active' | 'expired' | 'free')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="trial">In prova ({trialDays} giorni)</option>
                    <option value="active">Attivo (pagante)</option>
                    <option value="expired">Scaduto</option>
                  </select>
                </div>
              )}
              
              {/* Preview */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  {editPrice === 0 ? (
                    <>
                      <strong>Abbonamento gratuito:</strong> Il coach avrà accesso completo alla piattaforma senza pagare.
                    </>
                  ) : (
                    <>
                      <strong>Abbonamento €{editPrice}/mese:</strong> Il coach pagherà questo importo mensile per accedere alla piattaforma.
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingCoach(null)}
                className="flex-1 btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={saveSubscription}
                disabled={saving}
                className="flex-1 btn btn-primary"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Save size={18} />
                    Salva
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
