'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  FileText,
  Video,
  Headphones,
  Package,
  Euro,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Image as ImageIcon,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db, storage } from '@/lib/firebase'
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const categories = [
  { id: 'ebook', label: 'eBook / PDF', icon: FileText, description: 'Documenti PDF, guide, manuali' },
  { id: 'video', label: 'Video Corso', icon: Video, description: 'Video lezioni, tutorial, corsi' },
  { id: 'audio', label: 'Audio', icon: Headphones, description: 'Podcast, meditazioni, audio guide' },
  { id: 'template', label: 'Template', icon: FileText, description: 'Fogli di lavoro, template, workbook' },
  { id: 'bundle', label: 'Bundle', icon: Package, description: 'Pacchetti combinati di contenuti' }
]

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const productId = params.productId as string
  const coverInputRef = useRef<HTMLInputElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [commission, setCommission] = useState(3.5)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'ebook',
    coverImage: '',
    fileUrl: '',
    fileName: ''
  })
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId || !user?.id) return
      
      setIsLoading(true)
      try {
        const productDoc = await getDoc(doc(db, 'digitalProducts', productId))
        if (!productDoc.exists()) {
          setError('Prodotto non trovato')
          return
        }
        
        const data = productDoc.data()
        
        // Verifica proprietà
        if (data.coachId !== user.id) {
          setError('Non hai i permessi per modificare questo prodotto')
          return
        }
        
        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          category: data.category || 'ebook',
          coverImage: data.coverImage || '',
          fileUrl: data.fileUrl || '',
          fileName: data.fileName || ''
        })
        
        // Carica commissione
        const settingsDoc = await getDoc(doc(db, 'settings', 'platform'))
        if (settingsDoc.exists()) {
          setCommission(settingsDoc.data().officeCommissionPercentage ?? 3.5)
        }
        
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadProduct()
    }
  }, [productId, user])

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setError('Seleziona un\'immagine valida')
      return
    }
    
    if (!user?.id) {
      setError('Devi essere autenticato per caricare file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'immagine è troppo grande. Massimo 5MB.')
      return
    }
    
    setUploadingCover(true)
    setError('')
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    try {
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `covers/${user.id}/${timestamp}_${safeName}`
      
      const storageRef = ref(storage, filePath)
      const uploadTask = uploadBytesResumable(storageRef, file)
      
      uploadTask.on('state_changed',
        () => {},
        (error) => {
          console.error('Errore upload cover:', error)
          setError('Errore durante il caricamento: ' + error.message)
          setUploadingCover(false)
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
          setFormData(prev => ({
            ...prev,
            coverImage: downloadUrl
          }))
          setUploadingCover(false)
        }
      )
    } catch (err: any) {
      console.error('Errore upload cover:', err)
      setError('Errore durante il caricamento dell\'immagine')
      setUploadingCover(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !productId) return
    
    if (!formData.title.trim()) {
      setError('Inserisci un titolo')
      return
    }
    if (formData.price === '' || parseFloat(formData.price) < 0) {
      setError('Inserisci un prezzo valido (0 per gratuito)')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const price = parseFloat(formData.price)
      const commissionRate = commission / 100
      
      await updateDoc(doc(db, 'digitalProducts', productId), {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: price,
        category: formData.category,
        coverImage: formData.coverImage || null,
        fileUrl: formData.fileUrl || null,
        fileName: formData.fileName || null,
        commissionRate: commissionRate,
        commissionAmount: price * commissionRate,
        coachEarnings: price * (1 - commissionRate),
        updatedAt: serverTimestamp()
      })
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/coach/office/products')
      }, 1500)
    } catch (err) {
      console.error('Errore aggiornamento:', err)
      setError('Errore durante il salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!productId) return
    
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, 'digitalProducts', productId))
      router.push('/coach/office/products')
    } catch (err) {
      console.error('Errore eliminazione:', err)
      setError('Errore durante l\'eliminazione')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const price = parseFloat(formData.price) || 0
  const commissionAmount = price * (commission / 100)
  const earnings = price - commissionAmount

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (error && !formData.title) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-md w-full text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h1 className="text-xl font-bold text-charcoal mb-2">Errore</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/coach/office/products" className="text-primary-500 hover:underline">
            Torna ai prodotti
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-md w-full text-center">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
          <h1 className="text-xl font-bold text-charcoal mb-2">Salvato!</h1>
          <p className="text-gray-500">Reindirizzamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/coach/office/products"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Modifica Prodotto</h1>
            <p className="text-gray-500">Aggiorna le informazioni</p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Elimina prodotto"
        >
          <Trash2 size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Categoria */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4">Tipo di prodotto</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map(cat => {
              const Icon = cat.icon
              const isSelected = formData.category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mb-2 ${isSelected ? 'text-primary-500' : 'text-gray-400'}`} size={24} />
                  <p className={`font-medium ${isSelected ? 'text-primary-700' : 'text-charcoal'}`}>
                    {cat.label}
                  </p>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Info base */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4">Informazioni prodotto</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo (€0 = gratuito)</label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Cover Image - Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4">Immagine di copertina (opzionale)</h2>
          
          <input
            type="file"
            ref={coverInputRef}
            onChange={handleCoverUpload}
            accept="image/*"
            className="hidden"
          />
          
          {coverPreview || formData.coverImage ? (
            <div className="relative">
              <img 
                src={coverPreview || formData.coverImage} 
                alt="Cover preview"
                className="w-full h-48 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setCoverPreview(null)
                  setFormData(prev => ({ ...prev, coverImage: '' }))
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              {uploadingCover ? (
                <div className="text-center">
                  <Loader2 className="animate-spin text-primary-500 mx-auto" size={32} />
                  <p className="text-primary-600 font-medium mt-2">Caricamento...</p>
                </div>
              ) : (
                <>
                  <ImageIcon className="text-gray-400" size={32} />
                  <span className="text-gray-500">Clicca per caricare</span>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP (max 5MB)</span>
                </>
              )}
            </button>
          )}
        </motion.div>

        {/* File del prodotto - Link esterno */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4">File del prodotto</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link al file *
              </label>
              <input
                type="url"
                value={formData.fileUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                placeholder="https://drive.google.com/... o https://dropbox.com/..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Inserisci il link diretto al file (Google Drive, Dropbox, WeTransfer, ecc.)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome del file (opzionale)
              </label>
              <input
                type="text"
                value={formData.fileName}
                onChange={(e) => setFormData(prev => ({ ...prev, fileName: e.target.value }))}
                placeholder="es. Guida-Completa.pdf"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Come ottenere il link:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li><strong>Google Drive:</strong> Tasto destro → "Ottieni link" → Condividi con "Chiunque abbia il link"</li>
                  <li><strong>Dropbox:</strong> Tasto destro → "Copia link Dropbox"</li>
                  <li><strong>WeTransfer:</strong> Carica e copia il link generato</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Riepilogo */}
        {price > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-primary-50 to-orange-50 rounded-2xl p-6 border border-primary-200"
          >
            <h2 className="font-semibold text-charcoal mb-4">Riepilogo guadagni</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Prezzo di vendita</span>
                <span className="font-medium">€{price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Commissione ({commission}%)</span>
                <span className="text-red-600">-€{commissionAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-primary-200 pt-3 flex justify-between">
                <span className="font-medium text-charcoal">Il tuo guadagno</span>
                <span className="text-xl font-bold text-green-600">€{earnings.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        ) : formData.price === '0' || formData.price === '0.00' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-charcoal">Prodotto gratuito</h2>
                <p className="text-sm text-gray-600">Gli utenti potranno scaricarlo senza pagamento.</p>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Link
            href="/coach/office/products"
            className="flex-1 py-4 border border-gray-200 rounded-xl text-center font-medium hover:bg-gray-50 transition-colors"
          >
            Annulla
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Save size={20} />
                Salva Modifiche
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-lg font-bold text-charcoal mb-2">Elimina prodotto</h3>
            <p className="text-gray-500 mb-6">
              Sei sicuro di voler eliminare questo prodotto? Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Trash2 size={18} />
                    Elimina
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
