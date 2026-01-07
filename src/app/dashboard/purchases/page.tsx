'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Package,
  Download,
  FileText,
  Video,
  Headphones,
  Calendar,
  Euro,
  Loader2,
  ShoppingBag,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Purchase {
  id: string
  productId: string
  productTitle: string
  coachId: string
  coachName?: string
  price: number
  fileUrl?: string
  fileName?: string
  category?: string
  purchasedAt: Date
}

const categoryIcons: Record<string, any> = {
  ebook: FileText,
  video: Video,
  audio: Headphones,
  template: FileText,
  bundle: Package
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function PurchasesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [purchases, setPurchases] = useState<Purchase[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadPurchases = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Carica acquisti dell'utente
        const purchasesQuery = query(
          collection(db, 'productPurchases'),
          where('userId', '==', user.id)
        )
        const purchasesSnap = await getDocs(purchasesQuery)
        
        const loadedPurchases: Purchase[] = purchasesSnap.docs
          .map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              productId: data.productId,
              productTitle: data.productTitle || 'Prodotto',
              coachId: data.coachId,
              coachName: data.coachName,
              price: data.price || 0,
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              category: data.category,
              purchasedAt: data.purchasedAt?.toDate() || new Date()
            }
          })
          .sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime())
        
        setPurchases(loadedPurchases)
      } catch (err) {
        console.error('Errore caricamento acquisti:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadPurchases()
    }
  }, [user])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-charcoal">I miei acquisti</h1>
          <p className="text-gray-500 mt-1">Tutti i prodotti digitali che hai acquistato</p>
        </div>

        {purchases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl p-12 text-center shadow-sm"
          >
            <ShoppingBag className="mx-auto mb-4 text-gray-300" size={48} />
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              Nessun acquisto ancora
            </h3>
            <p className="text-gray-500 mb-6">
              Esplora la vetrina per trovare contenuti interessanti!
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Package size={20} />
              Vai alla vetrina
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase, index) => {
              const CategoryIcon = categoryIcons[purchase.category || 'ebook'] || Package
              
              return (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="text-primary-600" size={24} />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-charcoal truncate">
                        {purchase.productTitle}
                      </h3>
                      {purchase.coachName && (
                        <p className="text-sm text-gray-500">di {purchase.coachName}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(purchase.purchasedAt, "d MMM yyyy", { locale: it })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro size={14} />
                          {formatCurrency(purchase.price)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {purchase.fileUrl && (
                        <a
                          href={purchase.fileUrl}
                          download
                          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                        >
                          <Download size={18} />
                          <span className="hidden sm:inline">Scarica</span>
                        </a>
                      )}
                      <Link
                        href={`/shop/${purchase.productId}`}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Vedi prodotto"
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

        {/* Link alla vetrina */}
        {purchases.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600"
            >
              <Package size={18} />
              Esplora altri prodotti
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
