'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Users,
  Plus,
  Search,
  Filter,
  ChevronRight,
  BarChart3,
  Briefcase,
  Calendar,
  Euro,
  TrendingUp,
  UserPlus,
  Building2,
  ArrowLeft,
  MoreVertical,
  Mail,
  Phone,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  source: 'coachami' | 'external'
  coacheeId?: string
  notes?: string
  createdAt: Date
  totalSessions: number
  completedSessions: number
  totalRevenue: number
  lastSessionDate?: Date
  activeOffer?: {
    id: string
    title: string
    totalSessions: number
    completedSessions: number
  }
}

export default function CoachOfficePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSource, setFilterSource] = useState<'all' | 'coachami' | 'external'>('all')
  const [stats, setStats] = useState({
    totalClients: 0,
    coachamiClients: 0,
    externalClients: 0,
    totalRevenue: 0,
    activeSessions: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadClients = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Carica clienti da coachClients (clienti esterni)
        const externalClientsQuery = query(
          collection(db, 'coachClients'),
          where('coachId', '==', user.id)
        )
        const externalSnap = await getDocs(externalClientsQuery)
        
        console.log('Clienti esterni trovati:', externalSnap.size)
        
        const externalClients: Client[] = externalSnap.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            source: 'external' as const,
            notes: data.notes,
            createdAt: data.createdAt?.toDate() || new Date(),
            totalSessions: data.totalSessions || 0,
            completedSessions: data.completedSessions || 0,
            totalRevenue: data.totalRevenue || 0,
            lastSessionDate: data.lastSessionDate?.toDate(),
            activeOffer: data.activeOffer
          }
        })

        // Carica coachee da CoachaMi (da offerte esistenti)
        const offersQuery = query(
          collection(db, 'offers'),
          where('coachId', '==', user.id)
        )
        const offersSnap = await getDocs(offersQuery)
        
        // Raggruppa per coacheeId per evitare duplicati
        const coacheeMap = new Map<string, Client>()
        
        for (const offerDoc of offersSnap.docs) {
          const offer = offerDoc.data()
          const coacheeId = offer.coacheeId
          
          if (!coacheeMap.has(coacheeId)) {
            // Calcola statistiche per questo coachee
            const coacheeOffersQuery = query(
              collection(db, 'offers'),
              where('coachId', '==', user.id),
              where('coacheeId', '==', coacheeId)
            )
            const coacheeOffersSnap = await getDocs(coacheeOffersQuery)
            
            let totalSessions = 0
            let completedSessions = 0
            let totalRevenue = 0
            let activeOffer = undefined
            
            coacheeOffersSnap.docs.forEach(o => {
              const od = o.data()
              totalSessions += od.totalSessions || 0
              completedSessions += od.completedSessions || 0
              totalRevenue += od.paidInstallments ? od.paidInstallments * (od.pricePerSession || 0) : 0
              
              if (od.status === 'active' || od.status === 'accepted') {
                activeOffer = {
                  id: o.id,
                  title: od.title,
                  totalSessions: od.totalSessions,
                  completedSessions: od.completedSessions || 0
                }
              }
            })
            
            coacheeMap.set(coacheeId, {
              id: coacheeId,
              name: offer.coacheeName || 'Cliente',
              email: offer.coacheeEmail || '',
              source: 'coachami',
              coacheeId: coacheeId,
              createdAt: offer.createdAt?.toDate() || new Date(),
              totalSessions,
              completedSessions,
              totalRevenue,
              activeOffer
            })
          }
        }
        
        const coachamiClients = Array.from(coacheeMap.values())
        
        // Combina tutti i clienti
        const allClients = [...coachamiClients, ...externalClients].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )
        
        setClients(allClients)
        
        // Calcola statistiche
        const totalRevenue = allClients.reduce((sum, c) => sum + c.totalRevenue, 0)
        const activeSessions = allClients.reduce((sum, c) => sum + (c.totalSessions - c.completedSessions), 0)
        
        setStats({
          totalClients: allClients.length,
          coachamiClients: coachamiClients.length,
          externalClients: externalClients.length,
          totalRevenue,
          activeSessions
        })
        
      } catch (err) {
        console.error('Errore caricamento clienti:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadClients()
    }
  }, [user])

  // Filtra clienti
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterSource === 'all' || client.source === filterSource
    return matchesSearch && matchesFilter
  })

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="text-primary-500" size={28} />
          <h1 className="text-xl font-bold text-charcoal">Ufficio Virtuale</h1>
        </div>
        <Link
          href="/coach/office/clients/new"
          className="btn btn-primary"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Nuovo Cliente</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
            <span className="text-gray-500 text-sm">Totale Clienti</span>
          </div>
          <p className="text-2xl font-bold text-charcoal">{stats.totalClients}</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-primary-500">{stats.coachamiClients} CoachaMi</span>
            <span className="text-gray-400">•</span>
            <span className="text-purple-500">{stats.externalClients} Esterni</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Euro className="text-green-600" size={20} />
            </div>
            <span className="text-gray-500 text-sm">Fatturato</span>
          </div>
          <p className="text-2xl font-bold text-charcoal">
            €{stats.totalRevenue.toLocaleString('it-IT')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="text-amber-600" size={20} />
            </div>
            <span className="text-gray-500 text-sm">Sessioni Attive</span>
          </div>
          <p className="text-2xl font-bold text-charcoal">{stats.activeSessions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <Link href="/coach/office/clients/new" className="block h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 rounded-lg">
                <UserPlus className="text-primary-600" size={20} />
              </div>
              <span className="text-gray-500 text-sm">Nuovo Cliente</span>
            </div>
            <p className="text-primary-500 font-medium flex items-center gap-1">
              Aggiungi <ChevronRight size={16} />
            </p>
          </Link>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca cliente per nome o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterSource('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filterSource === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tutti
              </button>
              <button
                onClick={() => setFilterSource('coachami')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filterSource === 'coachami'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                CoachaMi
              </button>
              <button
                onClick={() => setFilterSource('external')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filterSource === 'external'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Esterni
              </button>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-charcoal flex items-center gap-2">
              <Users size={20} />
              I Miei Clienti ({filteredClients.length})
            </h2>
            <Link
              href="/coach/office/clients/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden md:inline">Aggiungi Cliente</span>
            </Link>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto mb-4 text-gray-300" size={48} />
              <h3 className="text-lg font-medium text-charcoal mb-2">
                {searchQuery || filterSource !== 'all' 
                  ? 'Nessun cliente trovato' 
                  : 'Nessun cliente ancora'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || filterSource !== 'all'
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Aggiungi il tuo primo cliente esterno o attendi prenotazioni da CoachaMi'}
              </p>
              <Link
                href="/coach/office/clients/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
              >
                <UserPlus size={20} />
                Aggiungi Cliente Esterno
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/coach/office/clients/${client.id}?source=${client.source}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                      client.source === 'coachami' ? 'bg-primary-500' : 'bg-purple-500'
                    }`}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-charcoal truncate">{client.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          client.source === 'coachami' 
                            ? 'bg-primary-100 text-primary-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {client.source === 'coachami' ? 'CoachaMi' : 'Esterno'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{client.email}</p>
                      {client.activeOffer && (
                        <p className="text-xs text-amber-600 mt-1">
                          {client.activeOffer.title} • {client.activeOffer.completedSessions}/{client.activeOffer.totalSessions} sessioni
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-gray-400">Sessioni</p>
                        <p className="font-semibold text-charcoal">
                          {client.completedSessions}/{client.totalSessions}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400">Fatturato</p>
                        <p className="font-semibold text-green-600">
                          €{client.totalRevenue.toLocaleString('it-IT')}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="text-gray-400" size={20} />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
  )
}
