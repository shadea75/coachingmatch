'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Package,
  FileText,
  Video,
  Headphones,
  Euro,
  User,
  ShoppingBag,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  Clock,
  Shield,
  CreditCard,
  Star
} from 'lucide-react'
import Logo from '@/components/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'

interface Product {
  id: string
  coachId: string
  coachName: string
  coachEmail: string
  title: string
  description: string
  price: number
  category: string
  coverImage?: string
  fileName?: string
  fileUrl?: string
  fileSize?: number
  salesCount: number
  createdAt: Date
  commissionRate: number
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
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const productId = params.productId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [coach, setCoach] = useState<any>(null)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [alreadyPurchased, setAlreadyPurchased] = useState(false)
  
  // Form dati acquirente
  const [showBuyerForm, setShowBuyerForm] = useState(false)
  const [buyerData, setBuyerData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [buyerErrors, setBuyerErrors] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return
      
      setIsLoading(true)
      try {
        // Carica prodotto
        const productDoc = await getDoc(doc(db, 'digitalProducts', productId))
        if (!productDoc.exists()) {
          setError('Prodotto non trovato')
          return
        }
        
        const data = productDoc.data()
        
        // Verifica che sia attivo
        if (!data.isActive) {
          setError('Questo prodotto non è più disponibile')
          return
        }
        
        setProduct({
          id: productDoc.id,
          coachId: data.coachId,
          coachName: data.coachName || 'Coach',
          coachEmail: data.coachEmail || '',
          title: data.title,
          description: data.description || '',
          price: data.price || 0,
          category: data.category || 'ebook',
          coverImage: data.coverImage,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          salesCount: data.salesCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          commissionRate: data.commissionRate || 0.035
        })
        
        // Carica info coach
        const coachDoc = await getDoc(doc(db, 'coachApplications', data.coachId))
        if (coachDoc.exists()) {
          setCoach(coachDoc.data())
        }
        
        // Verifica se utente ha già acquistato
        if (user?.id) {
          const purchaseDoc = await getDoc(doc(db, 'productPurchases', `${user.id}_${productId}`))
          if (purchaseDoc.exists()) {
            setAlreadyPurchased(true)
          }
        }
        
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProduct()
  }, [productId, user?.id])

  // Valida email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Valida form acquirente
  const validateBuyerForm = () => {
    const errors = {
      firstName: '',
      lastName: '',
      email: ''
    }
    let isValid = true
    
    if (!buyerData.firstName.trim()) {
      errors.firstName = 'Inserisci il nome'
      isValid = false
    }
    if (!buyerData.lastName.trim()) {
      errors.lastName = 'Inserisci il cognome'
      isValid = false
    }
    if (!buyerData.email.trim()) {
      errors.email = 'Inserisci l\'email'
      isValid = false
    } else if (!isValidEmail(buyerData.email)) {
      errors.email = 'Email non valida'
      isValid = false
    }
    
    setBuyerErrors(errors)
    return isValid
  }

  // Click su Acquista - mostra form se non loggato
  const handleBuyClick = () => {
    if (user) {
      // Utente loggato, procedi direttamente
      handlePurchase(user.email || '', user.name || '')
    } else {
      // Mostra form per raccogliere dati
      setShowBuyerForm(true)
    }
  }

  // Submit form acquirente
  const handleBuyerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateBuyerForm()) {
      handlePurchase(buyerData.email, `${buyerData.firstName} ${buyerData.lastName}`)
    }
  }

  // Download gratuito senza Stripe
  const handleFreeDownload = async (email: string, name: string) => {
    if (!product) return
    
    setIsProcessing(true)
    setError('')
    
    try {
      const downloadId = `free_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      
      // Registra il download in Firebase
      await setDoc(doc(db, 'productPurchases', downloadId), {
        productId: product.id,
        productTitle: product.title,
        coachId: product.coachId,
        coachName: product.coachName,
        userId: user?.id || 'guest',
        userEmail: email,
        userName: name,
        price: 0,
        commissionRate: 0,
        commissionAmount: 0,
        coachEarnings: 0,
        fileUrl: product.fileUrl || null,
        fileName: product.fileName || null,
        stripeSessionId: null,
        isFreeDownload: true,
        purchasedAt: serverTimestamp()
      })
      
      // Aggiorna contatore vendite/download
      await updateDoc(doc(db, 'digitalProducts', product.id), {
        salesCount: increment(1)
      })
      
      // Se utente loggato, salva nel suo profilo
      if (user?.id) {
        await setDoc(doc(db, 'productPurchases', `${user.id}_${product.id}`), {
          productId: product.id,
          productTitle: product.title,
          coachId: product.coachId,
          price: 0,
          fileUrl: product.fileUrl || null,
          fileName: product.fileName || null,
          isFreeDownload: true,
          purchasedAt: serverTimestamp()
        })
      }
      
      // Invia email di conferma
      try {
        if (email && email !== 'guest@example.com') {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'product_purchase',
              data: {
                customerEmail: email,
                customerName: name || 'Cliente',
                coachEmail: product.coachEmail,
                productTitle: product.title,
                coachName: product.coachName,
                price: 0,
                commissionAmount: 0,
                coachEarnings: 0,
                downloadUrl: product.fileUrl || window.location.href,
                isFree: true
              }
            })
          })
        }
      } catch (emailErr) {
        console.error('Errore invio email:', emailErr)
      }
      
      // Redirect alla pagina success
      window.location.href = `/shop/success?productId=${product.id}&free=true`
      
    } catch (err: any) {
      console.error('Errore download gratuito:', err)
      setError(err.message || 'Errore durante il download')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePurchase = async (email: string, name: string) => {
    if (!product) return
    
    setIsProcessing(true)
    setError('')
    
    try {
      // Carica account Stripe del coach
      let coachStripeAccountId = null
      try {
        const stripeDoc = await getDoc(doc(db, 'coachStripeAccounts', product.coachId))
        if (stripeDoc.exists()) {
          coachStripeAccountId = stripeDoc.data().stripeAccountId
        }
      } catch (e) {
        console.log('Coach senza Stripe Connect')
      }
      
      const response = await fetch('/api/payments/create-product-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productTitle: product.title,
          price: product.price,
          coachId: product.coachId,
          coachName: product.coachName,
          coachEmail: product.coachEmail,
          coachStripeAccountId,
          commissionRate: product.commissionRate,
          userId: user?.id || null,
          userEmail: email,
          userName: name
        })
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Errore nel pagamento')
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante il pagamento')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-md w-full text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h1 className="text-xl font-bold text-charcoal mb-2">Errore</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/shop" className="text-primary-500 hover:underline">
            Torna alla vetrina
          </Link>
        </div>
      </div>
    )
  }

  if (!product) return null

  const CategoryIcon = categoryIcons[product.category] || Package

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/shop" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <Logo size="sm" />
          </div>
          {user ? (
            <Link href="/dashboard" className="text-gray-600 hover:text-charcoal">
              Dashboard
            </Link>
          ) : (
            <Link 
              href="/login"
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Accedi
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left - Image & Info */}
          <div>
            {/* Cover Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="aspect-[4/3] bg-white rounded-2xl overflow-hidden shadow-sm mb-6"
            >
              {product.coverImage ? (
                <img 
                  src={product.coverImage} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <CategoryIcon className="text-gray-300" size={80} />
                </div>
              )}
            </motion.div>

            {/* Coach Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h3 className="font-semibold text-charcoal mb-4">Il Coach</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                  {coach?.profileImage ? (
                    <img 
                      src={coach.profileImage} 
                      alt={product.coachName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="text-primary-600" size={24} />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-charcoal">{product.coachName}</p>
                  {coach?.title && (
                    <p className="text-sm text-gray-500">{coach.title}</p>
                  )}
                </div>
              </div>
              {coach?.bio && (
                <p className="text-sm text-gray-600 mt-4 line-clamp-3">{coach.bio}</p>
              )}
            </motion.div>
          </div>

          {/* Right - Details & Purchase */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm mb-6"
            >
              {/* Category */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium flex items-center gap-1">
                  <CategoryIcon size={14} />
                  {categoryLabels[product.category]}
                </span>
                {product.salesCount > 0 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm flex items-center gap-1">
                    <ShoppingBag size={14} />
                    {product.salesCount} venduti
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-charcoal mb-4">{product.title}</h1>

              {/* Description */}
              <p className="text-gray-600 mb-6 whitespace-pre-wrap">{product.description}</p>

              {/* File info */}
              {product.fileName && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
                  <Download className="text-gray-400" size={24} />
                  <div>
                    <p className="font-medium text-charcoal">{product.fileName}</p>
                    {product.fileSize && (
                      <p className="text-sm text-gray-500">{formatFileSize(product.fileSize)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600">Prezzo</span>
                  <span className="text-3xl font-bold text-primary-600">
                    {product.price === 0 ? 'Gratis' : formatCurrency(product.price)}
                  </span>
                </div>

                {/* Already Purchased/Downloaded */}
                {alreadyPurchased ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500" size={24} />
                      <div>
                        <p className="font-medium text-green-800">
                          {product.price === 0 ? 'Hai già scaricato questo prodotto' : 'Hai già acquistato questo prodotto'}
                        </p>
                        <Link 
                          href="/dashboard/purchases"
                          className="text-sm text-green-600 hover:underline"
                        >
                          Vai ai tuoi acquisti →
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : product.price === 0 ? (
                  /* Prodotto gratuito - download diretto */
                  showBuyerForm ? (
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <h3 className="font-semibold text-charcoal">Inserisci i tuoi dati</h3>
                        <p className="text-sm text-gray-500">Per ricevere il prodotto</p>
                      </div>
                      
                      <form onSubmit={(e) => { e.preventDefault(); if (validateBuyerForm()) handleFreeDownload(buyerData.email, `${buyerData.firstName} ${buyerData.lastName}`) }} className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Nome *"
                            value={buyerData.firstName}
                            onChange={(e) => setBuyerData(prev => ({ ...prev, firstName: e.target.value }))}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                              buyerErrors.firstName ? 'border-red-300' : 'border-gray-200'
                            }`}
                          />
                          {buyerErrors.firstName && (
                            <p className="text-xs text-red-500 mt-1">{buyerErrors.firstName}</p>
                          )}
                        </div>
                        
                        <div>
                          <input
                            type="text"
                            placeholder="Cognome *"
                            value={buyerData.lastName}
                            onChange={(e) => setBuyerData(prev => ({ ...prev, lastName: e.target.value }))}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                              buyerErrors.lastName ? 'border-red-300' : 'border-gray-200'
                            }`}
                          />
                          {buyerErrors.lastName && (
                            <p className="text-xs text-red-500 mt-1">{buyerErrors.lastName}</p>
                          )}
                        </div>
                        
                        <div>
                          <input
                            type="email"
                            placeholder="Email *"
                            value={buyerData.email}
                            onChange={(e) => setBuyerData(prev => ({ ...prev, email: e.target.value }))}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                              buyerErrors.email ? 'border-red-300' : 'border-gray-200'
                            }`}
                          />
                          {buyerErrors.email && (
                            <p className="text-xs text-red-500 mt-1">{buyerErrors.email}</p>
                          )}
                        </div>
                        
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <>
                              <Download size={20} />
                              Scarica gratis
                            </>
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setShowBuyerForm(false)}
                          className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Annulla
                        </button>
                      </form>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (user) {
                          handleFreeDownload(user.email || '', user.name || '')
                        } else {
                          setShowBuyerForm(true)
                        }
                      }}
                      disabled={isProcessing}
                      className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Download size={20} />
                          Scarica gratis
                        </>
                      )}
                    </button>
                  )
                ) : showBuyerForm ? (
                  /* Form dati acquirente */
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-charcoal">Inserisci i tuoi dati</h3>
                      <p className="text-sm text-gray-500">Per ricevere il prodotto</p>
                    </div>
                    
                    <form onSubmit={handleBuyerFormSubmit} className="space-y-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Nome *"
                          value={buyerData.firstName}
                          onChange={(e) => setBuyerData(prev => ({ ...prev, firstName: e.target.value }))}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            buyerErrors.firstName ? 'border-red-300' : 'border-gray-200'
                          }`}
                        />
                        {buyerErrors.firstName && (
                          <p className="text-xs text-red-500 mt-1">{buyerErrors.firstName}</p>
                        )}
                      </div>
                      
                      <div>
                        <input
                          type="text"
                          placeholder="Cognome *"
                          value={buyerData.lastName}
                          onChange={(e) => setBuyerData(prev => ({ ...prev, lastName: e.target.value }))}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            buyerErrors.lastName ? 'border-red-300' : 'border-gray-200'
                          }`}
                        />
                        {buyerErrors.lastName && (
                          <p className="text-xs text-red-500 mt-1">{buyerErrors.lastName}</p>
                        )}
                      </div>
                      
                      <div>
                        <input
                          type="email"
                          placeholder="Email *"
                          value={buyerData.email}
                          onChange={(e) => setBuyerData(prev => ({ ...prev, email: e.target.value }))}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            buyerErrors.email ? 'border-red-300' : 'border-gray-200'
                          }`}
                        />
                        {buyerErrors.email && (
                          <p className="text-xs text-red-500 mt-1">{buyerErrors.email}</p>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        Il prodotto verrà inviato a questa email
                      </p>
                      
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <>
                            <CreditCard size={20} />
                            Procedi al pagamento
                          </>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowBuyerForm(false)}
                        className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Annulla
                      </button>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={handleBuyClick}
                    disabled={isProcessing}
                    className="w-full py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={20} />
                        Acquista ora
                      </>
                    )}
                  </button>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <Download className="mx-auto mb-2 text-primary-500" size={24} />
                <p className="text-sm font-medium text-charcoal">Download immediato</p>
                <p className="text-xs text-gray-500">{product.price === 0 ? 'Gratis, senza carta' : 'Dopo il pagamento'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <Shield className="mx-auto mb-2 text-green-500" size={24} />
                <p className="text-sm font-medium text-charcoal">{product.price === 0 ? 'Nessun costo' : 'Pagamento sicuro'}</p>
                <p className="text-xs text-gray-500">{product.price === 0 ? '100% gratuito' : 'Con Stripe'}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
