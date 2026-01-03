'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search,
  Eye,
  Check,
  X,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Loader2,
  RefreshCw,
  Award,
  GraduationCap,
  Clock,
  Users,
  Target,
  Heart
} from 'lucide-react'
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import AdminLayout from '@/components/AdminLayout'
import { LIFE_AREAS, CoachStatus } from '@/types'

interface CoachApplication {
  id: string
  userId?: string
  name: string
  email: string
  photo?: string
  bio?: string
  motivation?: string
  lifeArea?: string
  certifications?: { name: string; institution: string; year: number }[]
  education?: string[]
  yearsOfExperience?: number
  languages?: string[]
  sessionMode?: string[]
  location?: string
  averagePrice?: number
  freeCallAvailable?: boolean
  clientTypes?: string[]
  problemsAddressed?: string[]
  coachingMethod?: string[]
  style?: string[]
  status: CoachStatus
  submittedAt?: any
  createdAt?: any
}

const STATUS_CONFIG: Record<CoachStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'In attesa', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  reviewing: { label: 'In revisione', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  interview_scheduled: { label: 'Call programmata', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  interview_completed: { label: 'Call completata', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  approved: { label: 'Approvato', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rifiutato', color: 'text-red-700', bgColor: 'bg-red-100' },
  suspended: { label: 'Sospeso', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

export default function AdminCoachesPage() {
  const [applications, setApplications] = useState<CoachApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<CoachApplication | null>(null)
  const [filterStatus, setFilterStatus] = useState<CoachStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Carica candidature da Firebase
  const fetchApplications = async () => {
    try {
      const q = query(collection(db, 'coachApplications'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CoachApplication[]
      setApplications(apps)
    } catch (error) {
      console.error('Errore caricamento candidature:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchApplications()
  }
  
  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus
    const matchesSearch = 
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })
  
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }
  
  const updateStatus = async (id: string, newStatus: CoachStatus) => {
    setUpdating(true)
    try {
      // Aggiorna status in coachApplications
      await updateDoc(doc(db, 'coachApplications', id), {
        status: newStatus,
        updatedAt: new Date()
      })
      
      // Se approvato, aggiorna anche il ruolo in users da pending_coach a coach
      if (newStatus === 'approved') {
        const app = applications.find(a => a.id === id)
        const userId = app?.userId || id // userId o usa l'id stesso
        
        try {
          await updateDoc(doc(db, 'users', userId), {
            role: 'coach',
            updatedAt: new Date()
          })
          console.log('Ruolo utente aggiornato a coach')
        } catch (userError) {
          console.error('Errore aggiornamento ruolo utente:', userError)
        }
        
        // Invia email di approvazione
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'coach_approved',
              data: {
                name: app?.name,
                email: app?.email
              }
            })
          })
        } catch (emailError) {
          console.error('Errore invio email approvazione:', emailError)
        }
      }
      
      // Se rifiutato, mantieni pending_coach o imposta come coachee
      if (newStatus === 'rejected') {
        const app = applications.find(a => a.id === id)
        const userId = app?.userId || id
        
        try {
          await updateDoc(doc(db, 'users', userId), {
            role: 'coachee', // Downgrade a coachee
            updatedAt: new Date()
          })
        } catch (userError) {
          console.error('Errore aggiornamento ruolo utente:', userError)
        }
      }
      
      setApplications(prev => prev.map(app => 
        app.id === id ? { ...app, status: newStatus } : app
      ))
      if (selectedApplication?.id === id) {
        setSelectedApplication(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error('Errore aggiornamento status:', error)
      alert('Errore durante l\'aggiornamento')
    } finally {
      setUpdating(false)
    }
  }

  const getLifeAreaLabel = (areaId?: string) => {
    if (!areaId) return null
    const area = LIFE_AREAS.find(a => a.id === areaId)
    return area
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Candidature Coach</h1>
            <p className="text-gray-500">{stats.total} candidature totali</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">{stats.pending} in attesa</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{stats.approved} approvati</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as CoachStatus | 'all')}
          >
            <option value="all">Tutti gli stati</option>
            <option value="pending">In attesa</option>
            <option value="reviewing">In revisione</option>
            <option value="approved">Approvati</option>
            <option value="rejected">Rifiutati</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Applications List */}
            <div className="flex-1 space-y-4">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                  {applications.length === 0 
                    ? 'Nessuna candidatura ricevuta'
                    : 'Nessuna candidatura trovata con questi filtri'
                  }
                </div>
              ) : (
                filteredApplications.map((app) => {
                  const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
                  const area = getLifeAreaLabel(app.lifeArea)
                  
                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-xl border p-4 cursor-pointer transition-shadow hover:shadow-md ${
                        selectedApplication?.id === app.id ? 'ring-2 ring-primary-500' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedApplication(app)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {app.photo ? (
                            <img src={app.photo} alt={app.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-medium text-gray-500">
                              {app.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-charcoal">{app.name || 'Nome non fornito'}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{app.email}</p>
                          {area && (
                            <span 
                              className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs text-white"
                              style={{ backgroundColor: area.color }}
                            >
                              {area.label}
                            </span>
                          )}
                        </div>
                        
                        <ChevronRight className="text-gray-300" />
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>

            {/* Detail Panel */}
            {selectedApplication && (
              <aside className="w-[450px] bg-white rounded-xl border border-gray-200 p-6 h-fit sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-charcoal">Dettagli Candidatura</h2>
                  <button onClick={() => setSelectedApplication(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                
                {/* Profile */}
                <div className="text-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                    {selectedApplication.photo ? (
                      <img src={selectedApplication.photo} alt={selectedApplication.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-medium text-gray-500">
                        {selectedApplication.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">{selectedApplication.name}</h3>
                  {getLifeAreaLabel(selectedApplication.lifeArea) && (
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-sm text-white mt-1"
                      style={{ backgroundColor: getLifeAreaLabel(selectedApplication.lifeArea)?.color }}
                    >
                      {getLifeAreaLabel(selectedApplication.lifeArea)?.label}
                    </span>
                  )}
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedApplication.status]?.bgColor} ${STATUS_CONFIG[selectedApplication.status]?.color}`}>
                      {STATUS_CONFIG[selectedApplication.status]?.label}
                    </span>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} /> {selectedApplication.email}
                  </div>
                  {selectedApplication.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} /> {selectedApplication.location}
                    </div>
                  )}
                </div>

                {/* La mia storia */}
                {selectedApplication.bio && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <Heart size={14} /> La mia storia, la mia missione
                    </h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedApplication.bio}</p>
                  </div>
                )}

                {/* Il mio scopo */}
                {selectedApplication.motivation && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <Target size={14} /> Il mio scopo
                    </h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedApplication.motivation}</p>
                  </div>
                )}

                {/* Certificazioni */}
                {selectedApplication.certifications && selectedApplication.certifications.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <Award size={14} /> Certificazioni
                    </h4>
                    <div className="space-y-2">
                      {selectedApplication.certifications.map((cert, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded-lg text-sm">
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-gray-500 text-xs">{cert.institution} - {cert.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formazione */}
                {selectedApplication.education && selectedApplication.education.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <GraduationCap size={14} /> Formazione
                    </h4>
                    <ul className="space-y-1">
                      {selectedApplication.education.map((edu, idx) => (
                        <li key={idx} className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">{edu}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Info servizio */}
                <div className="mb-6 bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Esperienza</span>
                    <span className="font-medium">{selectedApplication.yearsOfExperience || 0} anni</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modalità</span>
                    <span className="font-medium">{selectedApplication.sessionMode?.join(', ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prezzo sessione</span>
                    <span className="font-medium">€{selectedApplication.averagePrice || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Call gratuita</span>
                    <span className="font-medium">{selectedApplication.freeCallAvailable ? 'Sì' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lingue</span>
                    <span className="font-medium">{selectedApplication.languages?.join(', ') || '-'}</span>
                  </div>
                </div>

                {/* Clienti target */}
                {selectedApplication.clientTypes && selectedApplication.clientTypes.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <Users size={14} /> Lavora con
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedApplication.clientTypes.map((type, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{type}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Problemi trattati */}
                {selectedApplication.problemsAddressed && selectedApplication.problemsAddressed.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Problemi trattati</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedApplication.problemsAddressed.map((problem, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{problem}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stile */}
                {selectedApplication.style && selectedApplication.style.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Stile di coaching</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedApplication.style.map((s, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs capitalize">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  {selectedApplication.status === 'pending' && (
                    <button 
                      onClick={() => updateStatus(selectedApplication.id, 'reviewing')} 
                      disabled={updating}
                      className="w-full btn bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      {updating ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                      Inizia revisione
                    </button>
                  )}
                  
                  {selectedApplication.status === 'reviewing' && (
                    <>
                      <button 
                        onClick={() => updateStatus(selectedApplication.id, 'approved')} 
                        disabled={updating}
                        className="w-full btn bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                      >
                        {updating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        Approva Coach
                      </button>
                      <button 
                        onClick={() => updateStatus(selectedApplication.id, 'rejected')} 
                        disabled={updating}
                        className="w-full btn bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        <X size={18} /> Rifiuta
                      </button>
                    </>
                  )}
                  
                  {selectedApplication.status === 'approved' && (
                    <div className="text-center py-3">
                      <div className="text-green-600 font-medium flex items-center justify-center gap-2">
                        <Check size={18} /> Coach approvato
                      </div>
                      <p className="text-xs text-gray-500 mt-1">L'utente può ora accedere come coach</p>
                    </div>
                  )}
                  
                  {selectedApplication.status === 'rejected' && (
                    <button 
                      onClick={() => updateStatus(selectedApplication.id, 'pending')} 
                      disabled={updating}
                      className="w-full btn bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      Riconsidera candidatura
                    </button>
                  )}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
