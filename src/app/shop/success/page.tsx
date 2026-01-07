'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  CheckCircle,
  Download,
  ArrowRight,
  Loader2,
  Package,
  Mail,
  AlertCircle
} from 'lucide-react'
import Logo from '@/components/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'

function SuccessContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const productId = searchParams.get('productId')
  const sessionId = searchParams.get('session_id')
  
  const [isLoading, setIsLoading] = useState(true)
  const [product, setProduct] = useState<any>(null)
  const [error, setError] = useState('')
  const [purchaseRecorded, setPurchaseRecorded] = useState(false)

  useEffect(() => {
    const processSuccess = async () => {
      if (!productId) {
        setError('Prodotto non trovato')
        setIsLoading(false)
        return
      }
      
      try {
        // Carica prodotto
        const productDoc = await getDoc(doc(db, 'digitalProducts', productId))
        if (!productDoc.exists()) {
          setError('Prodotto non trovato')
          return
        }
        
        const productData = productDoc.data()
        setProduct({
          id: productDoc.id,
          ...productData
        })
        
        // Registra acquisto (solo una volta)
        if (!purchaseRecorded && sessionId) {
          // Verifica se acquisto già registrato
          const purchaseRef = doc(db, 'productPurchases', sessionId)
          const existingPurchase = await getDoc(purchaseRef)
          
          if (!existingPurchase.exists()) {
            // Registra nuovo acquisto
            await setDoc(purchaseRef, {
              productId,
              productTitle: productData.title,
              coachId: productData.coachId,
              coachName: productData.coachName,
              userId: user?.id || 'guest',
              userEmail: user?.email || null,
              price: productData.price,
              commissionRate: productData.commissionRate || 0.035,
              commissionAmount: productData.price * (productData.commissionRate || 0.035),
              coachEarnings: productData.price * (1 - (productData.commissionRate || 0.035)),
              fileUrl: productData.fileUrl,
              fileName: productData.fileName,
              stripeSessionId: sessionId,
              purchasedAt: serverTimestamp()
            })
            
            // Aggiorna statistiche prodotto
            await updateDoc(doc(db, 'digitalProducts', productId), {
              salesCount: increment(1),
              totalRevenue: increment(productData.price * (1 - (productData.commissionRate || 0.035)))
            })
            
            // Se utente loggato, salva anche nel suo profilo
            if (user?.id) {
              await setDoc(doc(db, 'productPurchases', `${user.id}_${productId}`), {
                productId,
                productTitle: productData.title,
                coachId: productData.coachId,
                price: productData.price,
                fileUrl: productData.fileUrl,
                fileName: productData.fileName,
                purchasedAt: serverTimestamp()
              })
            }
            
            // Invia email di conferma
            try {
              const commissionRate = productData.commissionRate || 0.035
              const commissionAmount = productData.price * commissionRate
              const coachEarnings = productData.price - commissionAmount
              
              await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'product_purchase',
                  data: {
                    customerEmail: user?.email || 'guest@example.com',
                    coachEmail: productData.coachEmail,
                    productTitle: productData.title,
                    coachName: productData.coachName,
                    price: productData.price,
                    commissionAmount,
                    coachEarnings,
                    downloadUrl: `${window.location.origin}/shop/success?productId=${productId}&session_id=${sessionId}`
                  }
                })
              })
            } catch (emailErr) {
              console.error('Errore invio email:', emailErr)
            }
            
            setPurchaseRecorded(true)
          }
        }
        
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    processSuccess()
  }, [productId, sessionId, user?.id, purchaseRecorded])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Elaborazione acquisto...</p>
        </div>
      </div>
    )
  }

  if (error) {
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

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-center">
          <Logo size="md" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-sm text-center"
        >
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-500" size={40} />
          </div>

          <h1 className="text-2xl font-bold text-charcoal mb-2">
            Acquisto completato! 🎉
          </h1>
          <p className="text-gray-500 mb-8">
            Grazie per il tuo acquisto. Il tuo contenuto è pronto per il download.
          </p>

          {/* Product Info */}
          {product && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Package className="text-primary-500" size={28} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">{product.title}</h3>
                  <p className="text-sm text-gray-500">di {product.coachName}</p>
                  {product.fileName && (
                    <p className="text-sm text-gray-400 mt-1">{product.fileName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Download Button */}
          {product?.fileUrl && (
            <a
              href={product.fileUrl}
              download
              className="w-full py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <Download size={20} />
              Scarica il tuo contenuto
            </a>
          )}

          {/* Email Notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
            <Mail size={16} />
            <span>Riceverai anche una email con il link per il download</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/shop"
              className="flex-1 py-3 border border-gray-200 rounded-xl text-center font-medium hover:bg-gray-50 transition-colors"
            >
              Continua a esplorare
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="flex-1 py-3 bg-charcoal text-white rounded-xl text-center font-medium hover:bg-charcoal/90 transition-colors flex items-center justify-center gap-2"
              >
                Vai alla Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                href="/register"
                className="flex-1 py-3 bg-charcoal text-white rounded-xl text-center font-medium hover:bg-charcoal/90 transition-colors flex items-center justify-center gap-2"
              >
                Crea un account
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </motion.div>

        {/* Tip */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Conserva questo link per accedere nuovamente al download
        </p>
      </main>
    </div>
  )
}

export default function ShopSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
