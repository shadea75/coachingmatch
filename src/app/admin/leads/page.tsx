'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Mail, 
  Calendar, 
  Target, 
  TrendingUp,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  X,
  UserPlus
} from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { LifeAreaId } from '@/types'

interface Lead {
  id: string
  email: string
  name: string
  scores: Record<LifeAreaId, number>
  archetypeId: string
  priorityArea: LifeAreaId
  lifeScore: number
  status: 'new' | 'reminded' | 'assigned' | 'booked' | 'converted'
  reminderCount: number
  assignedCoachId?: string
  assignedCoachName?: string
  suggestedCoachId?: string
  createdAt: any
  updatedAt: any
  assignedAt?: any
  lastReminderAt?: any
}

interface Coach {
  id: string
  name: string
  email: string
  lifeArea?: string
  lifeAreas?: string[]
  photo?: string
}

const AREA_LABELS: Record<string, string> = {
  salute: 'Salute',
  finanze: 'Finanze',
  carriera: 'Carriera',
  relazioni: 'Relazioni',
  amore: 'Amore',
  crescita: 'Crescita',
  spiritualita: 'Spiritualità',
  divertimento: 'Divertimento'
}

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  new: { label: 'Nuovo', color: 'bg-blue-100 text-blue-700', icon: Clock },
  reminded: { label: 'Contattato', color: 'bg-yellow-100 text-yellow-700', icon: Mail },
  assigned: { label: 'Assegnato', color: 'bg-purple-100 text-purple-700', icon: UserCheck },
  booked: { label: 'Prenotato', color: 'bg-green-100 text-green-700', icon: Calendar },
  converted: { label: 'Convertito', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle }
}

const ARCHETYPE_LABELS: Record<string, string> = {
  achiever: '🏆 Conquistatore',
  nurturer: '💝 Custode',
  seeker: '🧭 Esploratore',
  philosopher: '🦉 Saggio',
  phoenix: '🔥 Fenice',
  harmonizer: '☯️ Armonizzatore'
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  
  // Modal assegnazione
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    loadLeads()
    loadCoaches()
  }, [])

  const loadCoaches = async () => {
    try {
      const coachesQuery = query(
        collection(db, 'coachApplications'),
        orderBy('name')
      )
      const snapshot = await getDocs(coachesQuery)
      const loadedCoaches: Coach[] = snapshot.docs
        .filter(doc => doc.data().status === 'approved')
        .map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Coach',
          email: doc.data().email || '',
          lifeArea: doc.data().lifeArea,
          lifeAreas: doc.data().lifeAreas || [],
          photo: doc.data().photo
        }))
      setCoaches(loadedCoaches)
    } catch (err) {
      console.error('Error loading coaches:', err)
    }
  }

  const loadLeads = async () => {
    setLoading(true)
    try {
      const leadsQuery = query(
        collection(db, 'leads'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(leadsQuery)
      
      const loadedLeads: Lead[] = []
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        let assignedCoachName = undefined
        
        // Carica nome coach se assegnato
        if (data.assignedCoachId) {
          try {
            const coachDoc = await getDoc(doc(db, 'coachApplications', data.assignedCoachId))
            if (coachDoc.exists()) {
              assignedCoachName = coachDoc.data().name
            }
          } catch (e) {
            console.error('Error loading coach:', e)
          }
        }
        
        loadedLeads.push({
          id: docSnap.id,
          ...data,
          assignedCoachName
        } as Lead)
      }
      
      setLeads(loadedLeads)
    } catch (err) {
      console.error('Error loading leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAssignModal = (lead: Lead) => {
    setSelectedLead(lead)
    setSelectedCoachId(lead.assignedCoachId || '')
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (!selectedLead || !selectedCoachId) return
    
    setAssigning(true)
    try {
      const coach = coaches.find(c => c.id === selectedCoachId)
      
      await updateDoc(doc(db, 'leads', selectedLead.id), {
        assignedCoachId: selectedCoachId,
        status: 'assigned',
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      // Aggiorna lista locale
      setLeads(prev => prev.map(l => 
        l.id === selectedLead.id 
          ? { ...l, assignedCoachId: selectedCoachId, assignedCoachName: coach?.name, status: 'assigned' as const }
          : l
      ))
      
      setShowAssignModal(false)
      setSelectedLead(null)
      setSelectedCoachId('')
      
      alert(`Lead assegnato a ${coach?.name}!`)
    } catch (err) {
      console.error('Error assigning lead:', err)
      alert('Errore durante l\'assegnazione')
    } finally {
      setAssigning(false)
    }
  }

  // Statistiche
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    reminded: leads.filter(l => l.status === 'reminded').length,
    assigned: leads.filter(l => l.status === 'assigned').length,
    booked: leads.filter(l => l.status === 'booked').length,
    converted: leads.filter(l => l.status === 'converted').length,
    conversionRate: leads.length > 0 
      ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1)
      : '0'
  }

  // Filtra leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesArea = areaFilter === 'all' || lead.priorityArea === areaFilter
    
    return matchesSearch && matchesStatus && matchesArea
  })

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const daysSince = (timestamp: any) => {
    if (!timestamp) return 0
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Coach consigliati per un lead (basati sull'area prioritaria)
  const getRecommendedCoaches = (lead: Lead) => {
    return coaches.filter(coach => {
      const coachAreas = coach.lifeAreas?.length ? coach.lifeAreas : (coach.lifeArea ? [coach.lifeArea] : [])
      return coachAreas.includes(lead.priorityArea)
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Lead Management
            </h1>
            <p className="text-gray-500 text-sm">
              Gestisci i lead dal test gratuito
            </p>
          </div>
          
          <button
            onClick={loadLeads}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <RefreshCw size={18} />
            Aggiorna
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Users size={16} />
              Totali
            </div>
            <p className="text-2xl font-bold text-charcoal">{stats.total}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <Clock size={16} />
              Nuovi
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
              <Mail size={16} />
              Contattati
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.reminded}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-purple-500 text-sm mb-1">
              <UserCheck size={16} />
              Assegnati
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.assigned}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
              <Calendar size={16} />
              Prenotati
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.booked}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500 text-sm mb-1">
              <CheckCircle size={16} />
              Convertiti
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.converted}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-primary-500 text-sm mb-1">
              <TrendingUp size={16} />
              Conversion
            </div>
            <p className="text-2xl font-bold text-primary-600">{stats.conversionRate}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Tutti gli stati</option>
              <option value="new">Nuovi</option>
              <option value="reminded">Contattati</option>
              <option value="assigned">Assegnati</option>
              <option value="booked">Prenotati</option>
              <option value="converted">Convertiti</option>
            </select>
            
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Tutte le aree</option>
              {Object.entries(AREA_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessun lead trovato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Lead</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Area Priorità</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Life Score</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Archetipo</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Stato</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Coach</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Creato</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Giorni</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map((lead) => {
                    const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                    const StatusIcon = statusConfig.icon
                    const days = daysSince(lead.createdAt)
                    
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-charcoal">{lead.name}</p>
                            <p className="text-sm text-gray-500">{lead.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-100 text-primary-700 text-sm">
                            <Target size={14} />
                            {AREA_LABELS[lead.priorityArea] || lead.priorityArea}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            lead.lifeScore >= 7 ? 'text-green-600' :
                            lead.lifeScore >= 5 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {lead.lifeScore?.toFixed(1) || '-'}/10
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {ARCHETYPE_LABELS[lead.archetypeId] || lead.archetypeId}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${statusConfig.color}`}>
                            <StatusIcon size={14} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {lead.assignedCoachName ? (
                            <span className="text-purple-600 font-medium">
                              {lead.assignedCoachName}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            days >= 10 ? 'text-red-600' :
                            days >= 7 ? 'text-yellow-600' :
                            'text-gray-500'
                          }`}>
                            {days}g
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openAssignModal(lead)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          >
                            <UserPlus size={14} />
                            {lead.assignedCoachId ? 'Riassegna' : 'Assegna'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Assegnazione */}
      <AnimatePresence>
        {showAssignModal && selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-charcoal">Assegna Lead</h2>
                <button 
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Info Lead */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="font-semibold text-charcoal">{selectedLead.name}</p>
                <p className="text-sm text-gray-500">{selectedLead.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-100 text-primary-700 text-xs">
                    <Target size={12} />
                    {AREA_LABELS[selectedLead.priorityArea] || selectedLead.priorityArea}
                  </span>
                  <span className="text-xs text-gray-500">
                    Life Score: {selectedLead.lifeScore?.toFixed(1) || '-'}/10
                  </span>
                </div>
              </div>

              {/* Coach consigliati */}
              {getRecommendedCoaches(selectedLead).length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    ⭐ Coach consigliati per {AREA_LABELS[selectedLead.priorityArea]}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getRecommendedCoaches(selectedLead).map(coach => (
                      <button
                        key={coach.id}
                        onClick={() => setSelectedCoachId(coach.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          selectedCoachId === coach.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                        }`}
                      >
                        {coach.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleziona Coach */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seleziona Coach
                </label>
                <select
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">-- Seleziona un coach --</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name} {coach.lifeArea ? `(${AREA_LABELS[coach.lifeArea] || coach.lifeArea})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bottoni */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedCoachId || assigning}
                  className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {assigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Assegnando...
                    </>
                  ) : (
                    <>
                      <UserCheck size={18} />
                      Assegna
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
