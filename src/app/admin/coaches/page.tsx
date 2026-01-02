'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search,
  Eye,
  Check,
  X,
  ChevronRight,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'
import { LIFE_AREAS, CoachStatus } from '@/types'

// Mock data per le candidature
const MOCK_APPLICATIONS = [
  {
    id: '1',
    firstName: 'Laura',
    lastName: 'Bianchi',
    email: 'laura.bianchi@email.com',
    phone: '+39 333 1234567',
    city: 'Milano',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    status: 'pending' as CoachStatus,
    yearsAsCoach: '6-10',
    coachingSchool: 'ICF Italia',
    mainCertification: 'icf',
    certificationLevel: 'PCC',
    selectedAreas: ['carriera', 'fiducia', 'focus'] as const,
    submittedAt: new Date('2024-01-15'),
    bio: 'Executive coach con 12 anni di esperienza nel supportare professionisti e manager.',
  },
  {
    id: '2',
    firstName: 'Marco',
    lastName: 'Rossi',
    email: 'marco.rossi@email.com',
    phone: '+39 339 9876543',
    city: 'Roma',
    status: 'reviewing' as CoachStatus,
    yearsAsCoach: '3-5',
    coachingSchool: 'Scuola Italiana di Coaching',
    mainCertification: 'aicp',
    certificationLevel: '',
    selectedAreas: ['benessere', 'famiglia', 'scopo'] as const,
    submittedAt: new Date('2024-01-14'),
    bio: 'Life coach specializzato in benessere emotivo e gestione dello stress.',
  },
]

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
  const [applications, setApplications] = useState(MOCK_APPLICATIONS)
  const [selectedApplication, setSelectedApplication] = useState<typeof MOCK_APPLICATIONS[0] | null>(null)
  const [filterStatus, setFilterStatus] = useState<CoachStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus
    const matchesSearch = 
      app.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })
  
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }
  
  const updateStatus = (id: string, newStatus: CoachStatus) => {
    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ))
    if (selectedApplication?.id === id) {
      setSelectedApplication(prev => prev ? { ...prev, status: newStatus } : null)
    }
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
          <div className="flex items-center gap-4 text-sm">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">{stats.pending} in attesa</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{stats.approved} approvati</span>
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
        <div className="flex gap-6">
          {/* Applications List */}
          <div className="flex-1 space-y-4">
            {filteredApplications.map((app) => {
              const statusConfig = STATUS_CONFIG[app.status]
              
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
                    {app.photo ? (
                      <img src={app.photo} alt={app.firstName} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="font-medium text-gray-500">{app.firstName[0]}{app.lastName[0]}</span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-charcoal">{app.firstName} {app.lastName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{app.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {app.selectedAreas.map((areaId) => {
                          const area = LIFE_AREAS.find(a => a.id === areaId)
                          return (
                            <span key={areaId} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: area?.color }}>
                              {area?.label.split(' ')[0]}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    
                    <ChevronRight className="text-gray-300" />
                  </div>
                </motion.div>
              )
            })}
            
            {filteredApplications.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
                Nessuna candidatura trovata
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedApplication && (
            <aside className="w-96 bg-white rounded-xl border border-gray-200 p-6 h-fit sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-charcoal">Dettagli</h2>
                <button onClick={() => setSelectedApplication(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              {/* Profile */}
              <div className="text-center mb-6">
                {selectedApplication.photo ? (
                  <img src={selectedApplication.photo} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-medium text-gray-500">
                      {selectedApplication.firstName[0]}{selectedApplication.lastName[0]}
                    </span>
                  </div>
                )}
                <h3 className="font-semibold text-lg">{selectedApplication.firstName} {selectedApplication.lastName}</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${STATUS_CONFIG[selectedApplication.status].bgColor} ${STATUS_CONFIG[selectedApplication.status].color}`}>
                  {STATUS_CONFIG[selectedApplication.status].label}
                </span>
              </div>

              {/* Contact */}
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={16} /> {selectedApplication.email}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} /> {selectedApplication.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} /> {selectedApplication.city}
                </div>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Bio</h4>
                <p className="text-sm text-gray-700">{selectedApplication.bio}</p>
              </div>

              {/* Experience */}
              <div className="mb-6 bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Esperienza</span>
                  <span className="font-medium">{selectedApplication.yearsAsCoach} anni</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Certificazione</span>
                  <span className="font-medium">{selectedApplication.mainCertification.toUpperCase()} {selectedApplication.certificationLevel}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {selectedApplication.status === 'pending' && (
                  <button onClick={() => updateStatus(selectedApplication.id, 'reviewing')} className="w-full btn bg-blue-500 text-white hover:bg-blue-600">
                    <Eye size={18} /> Inizia revisione
                  </button>
                )}
                
                {selectedApplication.status === 'reviewing' && (
                  <>
                    <button onClick={() => updateStatus(selectedApplication.id, 'approved')} className="w-full btn bg-green-500 text-white hover:bg-green-600">
                      <Check size={18} /> Approva
                    </button>
                    <button onClick={() => updateStatus(selectedApplication.id, 'rejected')} className="w-full btn bg-red-100 text-red-700 hover:bg-red-200">
                      <X size={18} /> Rifiuta
                    </button>
                  </>
                )}
                
                {selectedApplication.status === 'approved' && (
                  <div className="text-center text-sm text-green-600 py-2">✓ Coach approvato</div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
