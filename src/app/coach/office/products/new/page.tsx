'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  FileText,
  Video,
  Headphones,
  Package,
  Euro,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Info
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const categories = [
  { id: 'ebook', label: 'eBook / PDF', icon: FileText, description: 'Documenti PDF, guide, manuali' },
  { id: 'video', label: 'Video Corso', icon: Video, description: 'Video lezioni, tutorial, corsi' },
  { id: 'audio', label: 'Audio', icon: Headphones, description: 'Podcast, meditazioni, audio guide' },
  { id: 'template', label: 'Template', icon: FileText, description: 'Fogli di lavoro, template, workbook' },
  { id: 'bundle', label: 'Bundle', icon: Package, description: 'Pacchetti combinati di contenuti' }
]

export default function NewProductPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [commission, setCommission] = useState(3.5) // Default
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'ebook',
    coverImage: '',
    fileUrl: '',
    fileName: '',
    fileSize: 0
  })
  
  // Stati per upload (simulato - in produzione useresti Firebase Storage o altro)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  // Carica commissione da settings
  useEffect(() => {
    const loadCommission = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'platform'))
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setCommission(data.officeCommissionPercentage ?? 3.5)
        }
      } catch (err) {
        console.error('Errore caricamento commissione:', err)
      }
    }
    loadCommission()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!user?.id) {
      setError('Devi essere autenticato per caricare file')
      return
    }
    
    setUploadingFile(true)
    setError('')
    
    try {
      // Genera nome file unico
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `products/${user.id}/${timestamp}_${safeName}`
      
      // Carica su Firebase Storage
      const storageRef = ref(storage, filePath)
      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)
      
      setFormData(prev => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: downloadUrl
      }))
      setFilePreview(file.name)
    } catch (err: any) {
      console.error('Errore upload file:', err)
      setError('Errore durante il caricamento del file: ' + (err.message || 'Riprova'))
    } finally {
      setUploadingFile(false)
    }
  }

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
    
    setUploadingCover(true)
    setError('')
    
    try {
      // Crea preview locale
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Genera nome file unico
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `covers/${user.id}/${timestamp}_${safeName}`
      
      // Carica su Firebase Storage
      const storageRef = ref(storage, filePath)
      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)
      
      setFormData(prev => ({
        ...prev,
        coverImage: downloadUrl
      }))
    } catch (err: any) {
      console.error('Errore upload cover:', err)
      setError('Errore durante il caricamento dell\'immagine: ' + (err.message || 'Riprova'))
    } finally {
      setUploadingCover(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return
    
    // Validazione
    if (!formData.title.trim()) {
      setError('Inserisci un titolo')
      return
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Inserisci un prezzo valido')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const price = parseFloat(formData.price)
      const commissionRate = commission / 100
      
      await addDoc(collection(db, 'digitalProducts'), {
        coachId: user.id,
        coachName: user.name || 'Coach',
        coachEmail: user.email,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: price,
        category: formData.category,
        coverImage: formData.coverImage || null,
        fileUrl: formData.fileUrl || null,
        fileName: formData.fileName || null,
        fileSize: formData.fileSize || 0,
        // Commissione
        commissionRate: commissionRate,
        commissionAmount: price * commissionRate,
        coachEarnings: price * (1 - commissionRate),
        // Stati
        isActive: true,
        salesCount: 0,
        totalRevenue: 0,
        // Timestamp
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      router.push('/coach/office/products?success=created')
    } catch (err) {
      console.error('Errore creazione prodotto:', err)
      setError('Errore durante la creazione del prodotto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const price = parseFloat(formData.price) || 0
  const commissionAmount = price * (commission / 100)
  const earnings = price - commissionAmount

  const CategoryIcon = categories.find(c => c.id === formData.category)?.icon || Package

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/coach/office/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Nuovo Prodotto Digitale</h1>
          <p className="text-gray-500">Crea e vendi i tuoi contenuti</p>
        </div>
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
                  <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titolo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Es. Guida al Life Coaching"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrivi il contenuto del tuo prodotto..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prezzo *
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Cover Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4">Immagine di copertina</h2>
          
          <input
            type="file"
            ref={coverInputRef}
            onChange={handleCoverUpload}
            accept="image/*"
            className="hidden"
          />
          
          {coverPreview ? (
            <div className="relative">
              <img 
                src={coverPreview} 
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
                <Loader2 className="animate-spin text-primary-500" size={32} />
              ) : (
                <>
                  <ImageIcon className="text-gray-400" size={32} />
                  <span className="text-gray-500">Clicca per caricare un'immagine</span>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP (max 5MB)</span>
                </>
              )}
            </button>
          )}
        </motion.div>

        {/* File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4">File del prodotto</h2>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {filePreview ? (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-500" size={24} />
                <div>
                  <p className="font-medium text-green-800">{formData.fileName}</p>
                  <p className="text-sm text-green-600">
                    {formData.fileSize > 0 && `${(formData.fileSize / (1024 * 1024)).toFixed(2)} MB`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilePreview(null)
                  setFormData(prev => ({ ...prev, fileUrl: '', fileName: '', fileSize: 0 }))
                }}
                className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              {uploadingFile ? (
                <Loader2 className="animate-spin text-primary-500" size={32} />
              ) : (
                <>
                  <Upload className="text-gray-400" size={32} />
                  <span className="text-gray-500">Clicca per caricare il file</span>
                  <span className="text-xs text-gray-400">PDF, Video, Audio, ZIP (max 500MB)</span>
                </>
              )}
            </button>
          )}
          
          <p className="text-xs text-gray-500 mt-3 flex items-start gap-2">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            Il file sarà disponibile per il download solo dopo l'acquisto
          </p>
        </motion.div>

        {/* Riepilogo guadagni */}
        {price > 0 && (
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
                <span className="text-gray-600">Commissione CoachaMi ({commission}%)</span>
                <span className="text-red-600">-€{commissionAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-primary-200 pt-3 flex justify-between">
                <span className="font-medium text-charcoal">Il tuo guadagno</span>
                <span className="text-xl font-bold text-green-600">€{earnings.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        )}

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
            className="flex-1 py-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Save size={20} />
                Pubblica Prodotto
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
