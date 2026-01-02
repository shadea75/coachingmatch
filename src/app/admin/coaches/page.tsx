'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Search,
  Filter,
  Eye,
  Check,
  X,
  Calendar,
  Clock,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  FileText,
  Download,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Star
} from 'lucide-react'
import Logo from '@/components/Logo'
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
    bio: 'Executive coach con 12 anni di esperienza nel supportare professionisti e manager nel raggiungimento dei loro obiettivi.',
  },
  {
    id: '2',
    firstName: 'Marco',
    lastName: 'Rossi',
    email: 'marco.rossi@email.com',
    phone: '+39 339 9876543',
    city: 'Roma',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    status: 'reviewing' as CoachStatus,
    yearsAsCoach: '3-5',
    coachingSchool: 'Scuola Italiana di Coaching',
    mainCertification: 'aicp',
    certificationLevel: '',
    selectedAreas: ['benessere', 'famiglia', 'scopo'] as const,
    submittedAt: new Date('2024-01-14'),
    bio: 'Life coach specializzato in benessere emotivo e gestione dello stress.',
  },
  {
    id: '3',
    firstName: 'Giulia',
    lastName: 'Verdi',
    email: 'giulia.verdi@email.com',
    phone: '+39 347 5555555',
    city: 'Torino',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    status: 'interview_scheduled' as CoachStatus,
    yearsAsCoach: '10+',
    coachingSchool: 'CoachU',
    mainCertification: 'icf',
    certificationLevel: 'MCC',
    selectedAreas: ['carriera', 'denaro', 'focus'] as const,
    submittedAt: new Date('2024-01-10'),
    interviewDate: new Date('2024-01-20T10:00:00'),
    bio: 'Business coach e formatrice con esperienza nel mondo startup.',
  },
  {
    id: '4',
    firstName: 'Alessandro',
    lastName: 'Neri',
    email: 'alessandro.neri@email.com',
    phone: '+39 320 1111111',
    city: 'Bologna',
    status: 'approved' as CoachStatus,
    yearsAsCoach: '6-10',
    coachingSchool: 'Fedro Training',
    mainCertification: 'icf',
    certificationLevel: 'ACC',
    selectedAreas: ['amore', 'famiglia', 'fiducia'] as const,
    submittedAt: new Date('2024-01-05'),
    approvedAt: new Date('2024-01-12'),
    bio: 'Relationship coach specializzato in comunicazione di coppia.',
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

export default function AdminDashboardPage() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-charcoal">Admin Dashboard</h1>
          </div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Torna al sito →
          </Link>
        </div>
      </header>
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium">
              <Users size={20} />
              Candidature Coach
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
              <UserCheck size={20} />
              Coach Attivi
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
              <Calendar size={20} />
              Call Programmate
            </a>
          </nav>
          
          {/* Stats */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Statistiche</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Totale candidature</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-600">In attesa</span>
                <span className="font-medium">{stats.pending}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Approvati</span>
                <span className="font-medium">{stats.approved}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Rifiutati</span>
                <span className="font-medium">{stats.rejected}</span>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <option value="interview_scheduled">Call programmata</option>
              <option value="approved">Approvati</option>
              <option value="rejected">Rifiutati</option>
            </select>
          </div>
          
          {/* Applications Grid */}
          <div className="grid lg:grid-cols-2 gap-4">
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
                  <div className="flex items-start gap-4">
                    {app.photo ? (
                      <img
                        src={app.photo}
                        alt={`${app.firstName} ${app.lastName}`}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xl font-medium text-gray-500">
                          {app.firstName[0]}{app.lastName[0]}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-charcoal">
                          {app.firstName} {app.lastName}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">{app.email}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                        <MapPin size={12} />
                        <span>{app.city}</span>
                        <span>•</span>
                        <span>{app.yearsAsCoach} anni exp.</span>
                        <span>•</span>
                        <span>{app.certificationLevel || app.mainCertification.toUpperCase()}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {app.selectedAreas.map((areaId) => {
                          const area = LIFE_AREAS.find(a => a.id === areaId)
                          return (
                            <span
                              key={areaId}
                              className="px-2 py-0.5 rounded-full text-xs text-white"
                              style={{ backgroundColor: area?.color }}
                            >
                              {area?.label.split(' ')[0]}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    
                    <ChevronRight className="text-gray-300 flex-shrink-0" />
                  </div>
                </motion.div>
              )
            })}
          </div>
          
          {filteredApplications.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Nessuna candidatura trovata
            </div>
          )}
        </main>
        
        {/* Detail Panel */}
        {selectedApplication && (
          <aside className="w-96 bg-white border-l border-gray-200 min-h-[calc(100vh-73px)] p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-charcoal">Dettagli Candidatura</h2>
              <button 
                onClick={() => setSelectedApplication(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Profile header */}
            <div className="text-center mb-6">
              {selectedApplication.photo ? (
                <img
                  src={selectedApplication.photo}
                  alt={`${selectedApplication.firstName} ${selectedApplication.lastName}`}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-medium text-gray-500">
                    {selectedApplication.firstName[0]}{selectedApplication.lastName[0]}
                  </span>
                </div>
              )}
              
              <h3 className="font-semibold text-lg text-charcoal">
                {selectedApplication.firstName} {selectedApplication.lastName}
              </h3>
              
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                STATUS_CONFIG[selectedApplication.status].bgColor
              } ${STATUS_CONFIG[selectedApplication.status].color}`}>
                {STATUS_CONFIG[selectedApplication.status].label}
              </span>
            </div>
            
            {/* Contact info */}
            <div className="space-y-2 mb-6">
              <a 
                href={`mailto:${selectedApplication.email}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
              >
                <Mail size={16} />
                {selectedApplication.email}
              </a>
              <a 
                href={`tel:${selectedApplication.phone}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
              >
                <Phone size={16} />
                {selectedApplication.phone}
              </a>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} />
                {selectedApplication.city}
              </div>
            </div>
            
            {/* Bio */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Bio</h4>
              <p className="text-sm text-gray-700">{selectedApplication.bio}</p>
            </div>
            
            {/* Experience */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Esperienza</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Anni di esperienza</span>
                  <span className="font-medium">{selectedApplication.yearsAsCoach}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Scuola</span>
                  <span className="font-medium">{selectedApplication.coachingSchool}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Certificazione</span>
                  <span className="font-medium">
                    {selectedApplication.mainCertification.toUpperCase()}
                    {selectedApplication.certificationLevel && ` - ${selectedApplication.certificationLevel}`}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Areas */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Aree di specializzazione</h4>
              <div className="flex flex-wrap gap-2">
                {selectedApplication.selectedAreas.map((areaId) => {
                  const area = LIFE_AREAS.find(a => a.id === areaId)
                  return (
                    <span
                      key={areaId}
                      className="px-3 py-1 rounded-full text-sm text-white"
                      style={{ backgroundColor: area?.color }}
                    >
                      {area?.label}
                    </span>
                  )
                })}
              </div>
            </div>
            
            {/* Documents */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Documenti</h4>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                  <FileText size={18} />
                  <span className="flex-1 text-left">Certificato coaching</span>
                  <Download size={16} className="text-gray-400" />
                </button>
                <button className="w-full flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                  <FileText size={18} />
                  <span className="flex-1 text-left">CV</span>
                  <Download size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Timeline */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Timeline</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} />
                  <span>Candidatura: {selectedApplication.submittedAt.toLocaleDateString('it-IT')}</span>
                </div>
                {selectedApplication.interviewDate && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <Calendar size={14} />
                    <span>Call: {selectedApplication.interviewDate.toLocaleString('it-IT')}</span>
                  </div>
                )}
                {selectedApplication.approvedAt && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check size={14} />
                    <span>Approvato: {selectedApplication.approvedAt.toLocaleDateString('it-IT')}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-2">
              {selectedApplication.status === 'pending' && (
                <>
                  <button 
                    onClick={() => updateStatus(selectedApplication.id, 'reviewing')}
                    className="w-full btn bg-blue-500 text-white hover:bg-blue-600"
                  >
                    <Eye size={18} />
                    Inizia revisione
                  </button>
                </>
              )}
              
              {selectedApplication.status === 'reviewing' && (
                <>
                  <button 
                    onClick={() => updateStatus(selectedApplication.id, 'interview_scheduled')}
                    className="w-full btn bg-purple-500 text-white hover:bg-purple-600"
                  >
                    <Calendar size={18} />
                    Programma call
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedApplication.id, 'rejected')}
                    className="w-full btn bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    <X size={18} />
                    Rifiuta
                  </button>
                </>
              )}
              
              {(selectedApplication.status === 'interview_scheduled' || selectedApplication.status === 'interview_completed') && (
                <>
                  <button 
                    onClick={() => updateStatus(selectedApplication.id, 'approved')}
                    className="w-full btn bg-green-500 text-white hover:bg-green-600"
                  >
                    <Check size={18} />
                    Approva coach
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedApplication.id, 'rejected')}
                    className="w-full btn bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    <X size={18} />
                    Rifiuta
                  </button>
                </>
              )}
              
              {selectedApplication.status === 'approved' && (
                <div className="text-center text-sm text-green-600 py-2">
                  ✓ Coach approvato e attivo sulla piattaforma
                </div>
              )}
              
              {selectedApplication.status === 'rejected' && (
                <button 
                  onClick={() => updateStatus(selectedApplication.id, 'pending')}
                  className="w-full btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Riconsidera candidatura
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
