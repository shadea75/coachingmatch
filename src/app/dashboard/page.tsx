'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  BarChart3,
  Settings,
  LogOut,
  Video,
  Clock,
  ChevronRight,
  Crown,
  MessageCircle,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LIFE_AREAS } from '@/types'
import RadarChart from '@/components/RadarChart'
import Logo from '@/components/Logo'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// Mock data
const UPCOMING_CALLS = [
  {
    id: '1',
    coachName: 'Laura Bianchi',
    coachPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    time: '10:00',
    type: 'free_orientation'
  }
]

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'community'>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Mock area scores
  const mockScores = user?.areaScores || {
    carriera: 6,
    benessere: 5,
    famiglia: 8,
    denaro: 4,
    amore: 7,
    fiducia: 5,
    scopo: 6,
    focus: 4
  }

  const NavItems = () => (
    <>
      <button
        onClick={() => setActiveTab('overview')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          activeTab === 'overview' 
            ? 'bg-primary-50 text-primary-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <BarChart3 size={20} />
        <span className="font-medium">Panoramica</span>
      </button>
      
      <button
        onClick={() => setActiveTab('calls')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          activeTab === 'calls' 
            ? 'bg-primary-50 text-primary-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Calendar size={20} />
        <span className="font-medium">Le mie call</span>
      </button>
      
      <button
        onClick={() => setActiveTab('community')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          activeTab === 'community' 
            ? 'bg-primary-50 text-primary-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Users size={20} />
        <span className="font-medium">Community</span>
        {user?.membershipStatus !== 'active' && (
          <Crown size={16} className="text-amber-500 ml-auto" />
        )}
      </button>
      
      <div className="border-t border-gray-100 my-4" />
      
      <Link
        href="/settings"
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Settings size={20} />
        <span className="font-medium">Impostazioni</span>
      </Link>
      
      <button
        onClick={() => signOut()}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-medium">Esci</span>
      </button>
    </>
  )
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-6">
              <p className="text-sm text-gray-500">Ciao,</p>
              <p className="font-semibold text-charcoal">{user?.name || 'Utente'}</p>
            </div>
            <nav className="space-y-2">
              <NavItems />
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 hidden lg:block">
        <Link href="/" className="block mb-8">
          <Logo size="md" />
        </Link>
        
        <div className="mb-6">
          <p className="text-sm text-gray-500">Ciao,</p>
          <p className="font-semibold text-charcoal">{user?.name || 'Utente'}</p>
        </div>
        
        <nav className="space-y-2">
          <NavItems />
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h1 className="text-2xl font-display font-bold text-charcoal">
              La tua panoramica
            </h1>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Radar Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6">
                <h2 className="font-semibold text-charcoal mb-4">Le tue aree della vita</h2>
                <div className="flex justify-center">
                  <RadarChart scores={mockScores} size={300} />
                </div>
                
                {/* Area scores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  {LIFE_AREAS.map(area => (
                    <div 
                      key={area.id}
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${area.color}10` }}
                    >
                      <div className="text-xs text-gray-500 mb-1">{area.label.split(' ')[0]}</div>
                      <div className="text-xl font-bold" style={{ color: area.color }}>
                        {mockScores[area.id as keyof typeof mockScores] || 0}/10
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Upcoming call */}
              <div className="bg-white rounded-2xl p-6">
                <h2 className="font-semibold text-charcoal mb-4">Prossima call</h2>
                
                {UPCOMING_CALLS.length > 0 ? (
                  <div className="space-y-4">
                    {UPCOMING_CALLS.map(call => (
                      <div key={call.id} className="bg-cream rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={call.coachPhoto}
                            alt={call.coachName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-charcoal">{call.coachName}</p>
                            <p className="text-xs text-gray-500">
                              {call.type === 'free_orientation' ? 'Call gratuita' : 'Sessione'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{format(call.date, "EEEE d MMMM", { locale: it })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span>{call.time} • 30 min</span>
                          </div>
                        </div>
                        
                        <button className="w-full mt-4 btn btn-primary text-sm py-2">
                          <Video size={16} />
                          Partecipa
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">Nessuna call in programma</p>
                    <Link href="/matching" className="btn btn-primary text-sm">
                      Trova un coach
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Link 
                href="/matching"
                className="bg-white rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Trova coach</p>
                  <p className="text-sm text-gray-500">Scopri nuovi match</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
              
              <Link 
                href="/onboarding"
                className="bg-white rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Rivaluta aree</p>
                  <p className="text-sm text-gray-500">Aggiorna il profilo</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
              
              <button 
                onClick={() => setActiveTab('community')}
                className="bg-white rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-charcoal">Community</p>
                  <p className="text-sm text-gray-500">Unisciti alla chat</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Le mie call
            </h1>
            
            <div className="bg-white rounded-2xl p-6">
              <h2 className="font-semibold text-charcoal mb-4">Prossime call</h2>
              
              {UPCOMING_CALLS.length > 0 ? (
                <div className="space-y-3">
                  {UPCOMING_CALLS.map(call => (
                    <div key={call.id} className="flex items-center gap-4 p-4 bg-cream rounded-xl">
                      <img 
                        src={call.coachPhoto}
                        alt={call.coachName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-charcoal">{call.coachName}</p>
                        <p className="text-sm text-gray-500">
                          {format(call.date, "d MMMM", { locale: it })} alle {call.time}
                        </p>
                      </div>
                      <button className="btn btn-primary text-sm py-2">
                        <Video size={16} />
                        Partecipa
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nessuna call in programma
                </p>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Community Tab */}
        {activeTab === 'community' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Community
            </h1>
            
            {user?.membershipStatus === 'active' ? (
              <div className="bg-white rounded-2xl p-6">
                <p>Contenuto community per membri...</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-display font-bold text-charcoal mb-2">
                  Unisciti alla Community
                </h2>
                <p className="text-gray-500 mb-6">
                  Accedi a contenuti esclusivi, eventi con i coach, 
                  e connettiti con altri membri del percorso.
                </p>
                
                <div className="bg-cream rounded-xl p-4 mb-6 text-left">
                  <p className="font-medium text-charcoal mb-2">Cosa include:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Canali per area della vita
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Domande guidate settimanali
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Eventi online con coach
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Priorità nel matching
                    </li>
                  </ul>
                </div>
                
                <button className="btn btn-primary w-full">
                  Abbonati a €29/mese
                </button>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
