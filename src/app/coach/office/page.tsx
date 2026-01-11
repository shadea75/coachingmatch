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
  ChevronLeft,
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
  AlertCircle,
  Package,
  Video,
  Headphones,
  ShoppingBag,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore'
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

interface Product {
  id: string
  title: string
  description: string
  price: number
  category: 'ebook' | 'video' | 'audio' | 'template' | 'bundle'
  coverImage?: string
  isActive: boolean
  salesCount: number
  totalRevenue: number
  createdAt: Date
}

const categoryIcons: Record<string, any> = {
  ebook: FileText,
  video: Video,
  audio: Headphones,
  template: FileText,
  bundle: Package
}

const categoryLabels: Record<string, string> = {
  ebook: 'eBook / PDF',
  video: 'Video Corso',
  audio: 'Audio',
  template: 'Template',
  bundle: 'Bundle'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function CoachOfficePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'clients' | 'products'>('clients')
  const [isLoading, setIsLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSource, setFilterSource] = useState<'all' | 'coachami' | 'external'>('all')
  const [stats, setStats] = useState({
    totalClients: 0,
    coachamiClients: 0,
    externalClients: 0,
    totalRevenue: 0,
    confirmedSessions: 0, // Sessioni confermate future
    pendingToBook: 0, // Sessioni pagate da prenotare
    hourlyRate: 0 // Tariffa oraria coach
  })
  const [productStats, setProductStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  })
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Stato per disponibilità mensile
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyStats, setMonthlyStats] = useState({
    availableSlots: 0,
    potentialRevenue: 0
  })
  const [weeklySlots, setWeeklySlots] = useState<Record<string | number, string[]>>({})
  const [hourlyRate, setHourlyRate] = useState(80)

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
        
        // Calcola sessioni confermate future (da sessions + externalSessions)
        const now = new Date()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        
        // Query sessioni confermate (CoachaMi)
        const confirmedQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id),
          where('status', '==', 'confirmed')
        )
        const confirmedSnap = await getDocs(confirmedQuery)
        const confirmedFuture = confirmedSnap.docs.filter(d => {
          const scheduledAt = d.data().scheduledAt?.toDate?.() || new Date(d.data().scheduledAt)
          return scheduledAt > now
        })
        
        // Query sessioni confermate esterne
        const confirmedExtQuery = query(
          collection(db, 'externalSessions'),
          where('coachId', '==', user.id),
          where('status', '==', 'confirmed')
        )
        const confirmedExtSnap = await getDocs(confirmedExtQuery)
        const confirmedExtFuture = confirmedExtSnap.docs.filter(d => {
          const scheduledAt = d.data().scheduledAt?.toDate?.() || new Date(d.data().scheduledAt)
          return scheduledAt > now
        })
        
        const confirmedSessions = confirmedFuture.length + confirmedExtFuture.length
        
        // Calcola sessioni nel mese corrente (pending + confirmed)
        const pendingQuery = query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const pendingSnap = await getDocs(pendingQuery)
        const sessionsThisMonth = pendingSnap.docs.filter(d => {
          const scheduledAt = d.data().scheduledAt?.toDate?.() || new Date(d.data().scheduledAt)
          return scheduledAt > now && scheduledAt <= endOfMonth
        }).length
        
        const pendingExtQuery = query(
          collection(db, 'externalSessions'),
          where('coachId', '==', user.id),
          where('status', 'in', ['pending', 'confirmed'])
        )
        const pendingExtSnap = await getDocs(pendingExtQuery)
        const extSessionsThisMonth = pendingExtSnap.docs.filter(d => {
          const scheduledAt = d.data().scheduledAt?.toDate?.() || new Date(d.data().scheduledAt)
          return scheduledAt > now && scheduledAt <= endOfMonth
        }).length
        
        const totalSessionsThisMonth = sessionsThisMonth + extSessionsThisMonth
        
        // Carica disponibilità settimanale
        let loadedWeeklySlots: Record<number | string, string[]> = {}
        
        // Prima prova a caricare con userId come document ID
        const availDoc = await getDoc(doc(db, 'coachAvailability', user.id))
        
        if (availDoc.exists()) {
          const data = availDoc.data()
          loadedWeeklySlots = data.weeklySlots || data.slots || {}
          console.log('Disponibilità caricata (by docId):', loadedWeeklySlots)
        } else {
          // Se non esiste, cerca per coachId
          const availQuery = query(
            collection(db, 'coachAvailability'),
            where('coachId', '==', user.id)
          )
          const availSnap = await getDocs(availQuery)
          if (!availSnap.empty) {
            const data = availSnap.docs[0].data()
            loadedWeeklySlots = data.weeklySlots || data.slots || {}
            console.log('Disponibilità caricata (by coachId):', loadedWeeklySlots)
          } else {
            console.log('Nessuna disponibilità trovata per coach:', user.id)
          }
        }
        setWeeklySlots(loadedWeeklySlots)
        
        // Sessioni pagate da prenotare (potrebbero prenotare nel mese)
        let pendingToBook = 0
        // Da offerte CoachaMi
        offersSnap.docs.forEach(d => {
          const od = d.data()
          if (od.status === 'active' || od.status === 'accepted') {
            pendingToBook += (od.paidInstallments || 0) - (od.completedSessions || 0)
          }
        })
        // Da offerte esterne
        const extOffersQuery = query(
          collection(db, 'externalOffers'),
          where('coachId', '==', user.id),
          where('status', '==', 'active')
        )
        const extOffersSnap = await getDocs(extOffersQuery)
        extOffersSnap.docs.forEach(d => {
          const od = d.data()
          pendingToBook += (od.paidInstallments || 0) - (od.completedSessions || 0)
        })
        
        // Carica tariffa oraria del coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        let loadedHourlyRate = 80 // Default
        if (coachDoc.exists()) {
          loadedHourlyRate = coachDoc.data().hourlyRate || coachDoc.data().averagePrice || 80
        }
        setHourlyRate(loadedHourlyRate)
        
        setStats({
          totalClients: allClients.length,
          coachamiClients: coachamiClients.length,
          externalClients: externalClients.length,
          totalRevenue,
          confirmedSessions,
          pendingToBook,
          hourlyRate: loadedHourlyRate
        })
        
      } catch (err) {
        console.error('Errore caricamento clienti:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Funzione separata per caricare i prodotti
    const loadProducts = async () => {
      if (!user?.id) return
      
      try {
        const productsQuery = query(
          collection(db, 'digitalProducts'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const productsSnap = await getDocs(productsQuery)
        
        console.log('Prodotti trovati:', productsSnap.size)
        
        const loadedProducts: Product[] = productsSnap.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title,
            description: data.description || '',
            price: data.price || 0,
            category: data.category || 'ebook',
            coverImage: data.coverImage,
            isActive: data.isActive ?? true,
            salesCount: data.salesCount || 0,
            totalRevenue: data.totalRevenue || 0,
            createdAt: data.createdAt?.toDate() || new Date()
          }
        })
        
        setProducts(loadedProducts)
        
        const activeProducts = loadedProducts.filter(p => p.isActive)
        const totalSales = loadedProducts.reduce((sum, p) => sum + p.salesCount, 0)
        const productRevenue = loadedProducts.reduce((sum, p) => sum + p.totalRevenue, 0)
        
        setProductStats({
          totalProducts: loadedProducts.length,
          activeProducts: activeProducts.length,
          totalSales,
          totalRevenue: productRevenue
        })
      } catch (err) {
        console.error('Errore caricamento prodotti:', err)
      }
    }
    
    if (user) {
      loadClients()
      loadProducts()
    }
  }, [user])

  // Calcola disponibilità per il mese selezionato
  useEffect(() => {
    const calculateMonthlyAvailability = () => {
      const now = new Date()
      const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
      
      // Data di inizio: oggi se mese corrente, altrimenti primo del mese
      const startDate = isCurrentMonth 
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(selectedYear, selectedMonth, 1)
      
      // Data di fine: ultimo giorno del mese selezionato
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
      
      // Conta gli slot disponibili
      let totalSlots = 0
      let currentDate = new Date(startDate)
      currentDate.setHours(0, 0, 0, 0)
      
      // Debug: log delle chiavi presenti in weeklySlots
      console.log('weeklySlots keys:', Object.keys(weeklySlots))
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()
        // Prova sia con numero che con stringa
        const slotsForDay = weeklySlots[dayOfWeek] || weeklySlots[dayOfWeek.toString()] || weeklySlots[String(dayOfWeek)] || []
        totalSlots += slotsForDay.length
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      console.log('Slot totali calcolati per il mese:', totalSlots)
      
      // Per il mese corrente, sottrai sessioni confermate e da prenotare
      // Per mesi futuri, mostra tutti gli slot (non ci sono ancora prenotazioni)
      let availableSlots = totalSlots
      if (isCurrentMonth) {
        availableSlots = Math.max(0, totalSlots - stats.confirmedSessions - stats.pendingToBook)
      }
      
      setMonthlyStats({
        availableSlots,
        potentialRevenue: availableSlots * hourlyRate
      })
    }
    
    calculateMonthlyAvailability()
  }, [selectedMonth, selectedYear, weeklySlots, hourlyRate, stats.confirmedSessions, stats.pendingToBook])

  // Genera lista mesi per il selettore (mese corrente + prossimi 5)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() + i)
    return {
      month: date.getMonth(),
      year: date.getFullYear(),
      label: date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    }
  })

  // Filtra clienti
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterSource === 'all' || client.source === filterSource
    return matchesSearch && matchesFilter
  })

  // Funzioni per gestire i prodotti
  const handleToggleProduct = async (product: Product) => {
    setTogglingId(product.id)
    try {
      await updateDoc(doc(db, 'digitalProducts', product.id), {
        isActive: !product.isActive
      })
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, isActive: !p.isActive } : p
      ))
      // Aggiorna stats
      setProductStats(prev => ({
        ...prev,
        activeProducts: product.isActive ? prev.activeProducts - 1 : prev.activeProducts + 1
      }))
    } catch (err) {
      console.error('Errore toggle:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return
    
    setDeletingId(productId)
    try {
      await deleteDoc(doc(db, 'digitalProducts', productId))
      const deletedProduct = products.find(p => p.id === productId)
      setProducts(prev => prev.filter(p => p.id !== productId))
      // Aggiorna stats
      setProductStats(prev => ({
        ...prev,
        totalProducts: prev.totalProducts - 1,
        activeProducts: deletedProduct?.isActive ? prev.activeProducts - 1 : prev.activeProducts
      }))
    } catch (err) {
      console.error('Errore eliminazione:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const copyProductLink = (productId: string) => {
    const link = `${window.location.origin}/shop/${productId}`
    navigator.clipboard.writeText(link)
    setCopiedLink(productId)
    setTimeout(() => setCopiedLink(null), 2000)
  }

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
            <span className="text-gray-500 text-sm">Sessioni Confermate</span>
          </div>
          <p className="text-2xl font-bold text-charcoal">{stats.confirmedSessions}</p>
          {stats.pendingToBook > 0 && (
            <p className="text-xs text-orange-500 mt-1">
              +{stats.pendingToBook} da prenotare
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="text-purple-600" size={20} />
              </div>
              <span className="text-gray-500 text-sm">Disponibilità</span>
            </div>
            {/* Selettore Mese */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const currentIndex = monthOptions.findIndex(
                    m => m.month === selectedMonth && m.year === selectedYear
                  )
                  if (currentIndex > 0) {
                    setSelectedMonth(monthOptions[currentIndex - 1].month)
                    setSelectedYear(monthOptions[currentIndex - 1].year)
                  }
                }}
                disabled={selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <span className="text-xs font-medium text-purple-600 min-w-[60px] text-center capitalize">
                {new Date(selectedYear, selectedMonth).toLocaleDateString('it-IT', { month: 'short' })}
              </span>
              <button
                onClick={() => {
                  const currentIndex = monthOptions.findIndex(
                    m => m.month === selectedMonth && m.year === selectedYear
                  )
                  if (currentIndex < monthOptions.length - 1) {
                    setSelectedMonth(monthOptions[currentIndex + 1].month)
                    setSelectedYear(monthOptions[currentIndex + 1].year)
                  }
                }}
                disabled={monthOptions.findIndex(m => m.month === selectedMonth && m.year === selectedYear) === monthOptions.length - 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>
          </div>
          <p className="text-2xl font-bold text-charcoal">{monthlyStats.availableSlots}</p>
          <p className="text-xs text-gray-500">
            slot liberi
          </p>
          {monthlyStats.potentialRevenue > 0 && (
            <p className="text-sm text-green-600 font-medium mt-2">
              €{monthlyStats.potentialRevenue.toLocaleString('it-IT')} potenziali
            </p>
          )}
        </motion.div>
      </div>

      {/* Tabs Clienti / Prodotti */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'clients'
              ? 'bg-primary-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
          }`}
        >
          <Users size={20} />
          I Miei Clienti
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'clients' ? 'bg-white/20' : 'bg-gray-100'
          }`}>
            {stats.totalClients}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'products'
              ? 'bg-primary-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
          }`}
        >
          <Package size={20} />
          Prodotti Digitali
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'products' ? 'bg-white/20' : 'bg-gray-100'
          }`}>
            {productStats.totalProducts}
          </span>
        </button>
      </div>


      {/* TAB CLIENTI */}
      {activeTab === 'clients' && (
        <>
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
                  Aggiungi Cliente
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/coach/office/clients/${client.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        client.source === 'coachami' ? 'bg-primary-500' : 'bg-purple-500'
                      }`}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-charcoal truncate">{client.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            client.source === 'coachami' 
                              ? 'bg-primary-100 text-primary-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {client.source === 'coachami' ? 'CoachaMi' : 'Esterno'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{client.email}</p>
                      </div>

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
        </>
      )}

      {/* TAB PRODOTTI */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Stats Prodotti */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Package className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-charcoal">{productStats.totalProducts}</p>
                  <p className="text-xs text-gray-500">Prodotti totali</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-charcoal">{productStats.activeProducts}</p>
                  <p className="text-xs text-gray-500">Attivi in vetrina</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ShoppingBag className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-charcoal">{productStats.totalSales}</p>
                  <p className="text-xs text-gray-500">Vendite totali</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Euro className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-charcoal">{formatCurrency(productStats.totalRevenue)}</p>
                  <p className="text-xs text-gray-500">Ricavi prodotti</p>
                </div>
              </div>
            </div>
          </div>

          {/* Header Prodotti */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">I tuoi prodotti digitali</h2>
            <Link
              href="/coach/office/products/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Plus size={20} />
              Nuovo Prodotto
            </Link>
          </div>

          {/* Lista Prodotti */}
          {products.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <Package className="mx-auto mb-4 text-gray-300" size={48} />
              <h3 className="text-lg font-semibold text-charcoal mb-2">
                Nessun prodotto ancora
              </h3>
              <p className="text-gray-500 mb-6">
                Crea il tuo primo prodotto digitale e inizia a vendere!
              </p>
              <Link
                href="/coach/office/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
              >
                <Plus size={20} />
                Crea il primo prodotto
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product, index) => {
                const CategoryIcon = categoryIcons[product.category] || Package
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${
                      product.isActive ? 'border-transparent' : 'border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Cover Image */}
                      <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.coverImage ? (
                          <img 
                            src={product.coverImage} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <CategoryIcon className="text-gray-400" size={32} />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-charcoal truncate">{product.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            product.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {product.isActive ? 'Attivo' : 'Disattivo'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mb-2">{product.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-gray-500">
                            <CategoryIcon size={14} />
                            {categoryLabels[product.category]}
                          </span>
                          <span className="font-semibold text-primary-600">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <ShoppingBag size={14} />
                            {product.salesCount} vendite
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyProductLink(product.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copia link"
                        >
                          {copiedLink === product.id ? (
                            <Check size={18} className="text-green-500" />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleProduct(product)}
                          disabled={togglingId === product.id}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={product.isActive ? 'Disattiva' : 'Attiva'}
                        >
                          {togglingId === product.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : product.isActive ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                        <Link
                          href={`/coach/office/products/${product.id}/edit`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifica"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deletingId === product.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          {deletingId === product.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                        <Link
                          href={`/shop/${product.id}`}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Vedi in vetrina"
                        >
                          <ExternalLink size={18} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Info commissione */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="text-blue-500 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-blue-800">Commissione sulla vendita</p>
                <p className="text-sm text-blue-600 mt-1">
                  Per ogni vendita, CoachaMi trattiene una piccola commissione per la gestione dei pagamenti. 
                  Il resto viene accreditato direttamente sul tuo account Stripe.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
