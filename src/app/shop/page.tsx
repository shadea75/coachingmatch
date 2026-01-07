'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Search,
  Filter,
  Package,
  FileText,
  Video,
  Headphones,
  Euro,
  User,
  Star,
  ShoppingBag,
  Loader2,
  ChevronDown,
  X
} from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'

interface Product {
  id: string
  coachId: string
  coachName: string
  title: string
  description: string
  price: number
  category: string
  coverImage?: string
  salesCount: number
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

function ShopContent() {
  const searchParams = useSearchParams()
  const coachIdParam = searchParams.get('coach')
  
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterCoachId, setFilterCoachId] = useState<string | null>(coachIdParam)
  const [filterCoachName, setFilterCoachName] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'popular'>('newest')

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true)
      try {
        // Carica solo prodotti attivi
        const productsQuery = query(
          collection(db, 'digitalProducts'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        )
        const productsSnap = await getDocs(productsQuery)
        
        const loadedProducts: Product[] = productsSnap.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            coachId: data.coachId,
            coachName: data.coachName || 'Coach',
            title: data.title,
            description: data.description || '',
            price: data.price || 0,
            category: data.category || 'ebook',
            coverImage: data.coverImage,
            salesCount: data.salesCount || 0
          }
        })
        
        setProducts(loadedProducts)
        
        // Se c'è un filtro coach, carica il nome
        if (coachIdParam) {
          const coachDoc = await getDoc(doc(db, 'coachApplications', coachIdParam))
          if (coachDoc.exists()) {
            setFilterCoachName(coachDoc.data().name || 'Coach')
          }
        }
      } catch (err) {
        console.error('Errore caricamento prodotti:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProducts()
  }, [coachIdParam])

  // Rimuovi filtro coach
  const clearCoachFilter = () => {
    setFilterCoachId(null)
    setFilterCoachName(null)
    window.history.pushState({}, '', '/shop')
  }

  // Filtra e ordina prodotti
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.coachName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory
      const matchesCoach = !filterCoachId || product.coachId === filterCoachId
      return matchesSearch && matchesCategory && matchesCoach
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.price - b.price
        case 'price_high':
          return b.price - a.price
        case 'popular':
          return b.salesCount - a.salesCount
        default:
          return 0 // newest è già ordinato dalla query
      }
    })

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-charcoal">
              Accedi
            </Link>
            <Link 
              href="/register"
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Registrati
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-500 to-orange-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Risorse per la tua Crescita
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/90 max-w-2xl mx-auto"
          >
            Scopri eBook, video corsi e strumenti creati dai nostri coach certificati
          </motion.p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-gray-100 py-4 sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca prodotti, coach..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tutte le categorie</option>
              <option value="ebook">eBook / PDF</option>
              <option value="video">Video Corso</option>
              <option value="audio">Audio</option>
              <option value="template">Template</option>
              <option value="bundle">Bundle</option>
            </select>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">Più recenti</option>
              <option value="popular">Più venduti</option>
              <option value="price_low">Prezzo: basso → alto</option>
              <option value="price_high">Prezzo: alto → basso</option>
            </select>
          </div>
          
          {/* Badge filtro coach */}
          {filterCoachName && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">Filtro attivo:</span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                <User size={14} />
                {filterCoachName}
                <button 
                  onClick={clearCoachFilter}
                  className="hover:bg-primary-200 rounded-full p-0.5"
                >
                  <X size={14} />
                </button>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary-500" size={40} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Package className="mx-auto mb-4 text-gray-300" size={64} />
            <h2 className="text-xl font-semibold text-charcoal mb-2">
              {products.length === 0 ? 'Nessun prodotto disponibile' : 'Nessun risultato'}
            </h2>
            <p className="text-gray-500">
              {products.length === 0 
                ? 'I nostri coach stanno preparando contenuti esclusivi per te!'
                : 'Prova a modificare i filtri di ricerca'
              }
            </p>
          </motion.div>
        ) : (
          <>
            <p className="text-gray-500 mb-6">{filteredProducts.length} prodotti trovati</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => {
                const CategoryIcon = categoryIcons[product.category] || Package
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/shop/${product.id}`}>
                      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                        {/* Cover */}
                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                          {product.coverImage ? (
                            <img 
                              src={product.coverImage} 
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <CategoryIcon className="text-gray-300" size={48} />
                            </div>
                          )}
                          {/* Category Badge */}
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1">
                              <CategoryIcon size={12} />
                              {categoryLabels[product.category]}
                            </span>
                          </div>
                        </div>
                        
                        {/* Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-charcoal mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
                            {product.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                            {product.description}
                          </p>
                          
                          {/* Coach */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                              <User className="text-primary-600" size={12} />
                            </div>
                            <span className="text-sm text-gray-600">{product.coachName}</span>
                          </div>
                          
                          {/* Price & Sales */}
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-primary-600">
                              {formatCurrency(product.price)}
                            </span>
                            {product.salesCount > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <ShoppingBag size={12} />
                                {product.salesCount} venduti
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Logo size="sm" />
          <p className="text-gray-500 mt-4">
            © 2026 CoachaMi. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    }>
      <ShopContent />
    </Suspense>
  )
}
