'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Euro,
  Download,
  ShoppingBag,
  FileText,
  Video,
  Headphones,
  Image as ImageIcon,
  MoreVertical,
  ExternalLink,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Check
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc,
  updateDoc,
  orderBy 
} from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Product {
  id: string
  title: string
  description: string
  price: number
  category: 'ebook' | 'video' | 'audio' | 'template' | 'bundle'
  coverImage?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isActive: boolean
  salesCount: number
  totalRevenue: number
  createdAt: Date
  updatedAt: Date
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function CoachProductsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  })
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Carica prodotti del coach
        const productsQuery = query(
          collection(db, 'digitalProducts'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const productsSnap = await getDocs(productsQuery)
        
        const loadedProducts: Product[] = productsSnap.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title,
            description: data.description || '',
            price: data.price || 0,
            category: data.category || 'ebook',
            coverImage: data.coverImage,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            isActive: data.isActive ?? true,
            salesCount: data.salesCount || 0,
            totalRevenue: data.totalRevenue || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          }
        })
        
        setProducts(loadedProducts)
        
        // Calcola statistiche
        const activeProducts = loadedProducts.filter(p => p.isActive)
        const totalSales = loadedProducts.reduce((sum, p) => sum + p.salesCount, 0)
        const totalRevenue = loadedProducts.reduce((sum, p) => sum + p.totalRevenue, 0)
        
        setStats({
          totalProducts: loadedProducts.length,
          activeProducts: activeProducts.length,
          totalSales,
          totalRevenue
        })
        
      } catch (err) {
        console.error('Errore caricamento prodotti:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadProducts()
    }
  }, [user])

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id)
    try {
      await updateDoc(doc(db, 'digitalProducts', product.id), {
        isActive: !product.isActive
      })
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, isActive: !p.isActive } : p
      ))
    } catch (err) {
      console.error('Errore toggle:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return
    
    setDeletingId(productId)
    try {
      await deleteDoc(doc(db, 'digitalProducts', productId))
      setProducts(prev => prev.filter(p => p.id !== productId))
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

  // Filtra prodotti
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    return matchesSearch && matchesCategory
  })

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">I miei Prodotti Digitali</h1>
          <p className="text-gray-500 mt-1">Gestisci e vendi i tuoi contenuti</p>
        </div>
        <Link
          href="/coach/office/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
        >
          <Plus size={20} />
          Nuovo Prodotto
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500">Prodotti totali</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal">{stats.activeProducts}</p>
              <p className="text-xs text-gray-500">Attivi in vetrina</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <ShoppingBag className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal">{stats.totalSales}</p>
              <p className="text-xs text-gray-500">Vendite totali</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Euro className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-gray-500">Ricavi totali</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca prodotti..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tutte le categorie</option>
          <option value="ebook">eBook / PDF</option>
          <option value="video">Video Corso</option>
          <option value="audio">Audio</option>
          <option value="template">Template</option>
          <option value="bundle">Bundle</option>
        </select>
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl p-12 text-center shadow-sm"
        >
          <Package className="mx-auto mb-4 text-gray-300" size={48} />
          <h3 className="text-lg font-semibold text-charcoal mb-2">
            {products.length === 0 ? 'Nessun prodotto ancora' : 'Nessun prodotto trovato'}
          </h3>
          <p className="text-gray-500 mb-6">
            {products.length === 0 
              ? 'Crea il tuo primo prodotto digitale e inizia a vendere!'
              : 'Prova a modificare i filtri di ricerca'
            }
          </p>
          {products.length === 0 && (
            <Link
              href="/coach/office/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Plus size={20} />
              Crea il primo prodotto
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product, index) => {
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
                      onClick={() => handleToggleActive(product)}
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
                      onClick={() => handleDelete(product.id)}
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
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
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
  )
}
