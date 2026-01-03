'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Bell, 
  Shield,
  CreditCard,
  LogOut,
  ChevronRight,
  Loader2,
  Save,
  CheckCircle,
  Camera,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Handler logout con redirect
  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    photo: ''
  })
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false
  })
  
  // Carica dati utente
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        photo: user.photo || ''
      })
    }
  }, [user])
  
  // Upload foto
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    
    // Verifica tipo file
    if (!file.type.startsWith('image/')) {
      alert('Per favore seleziona un\'immagine')
      return
    }
    
    // Verifica dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'immagine deve essere inferiore a 5MB')
      return
    }
    
    setIsUploadingPhoto(true)
    
    try {
      // Metodo 1: Firebase Storage (preferito)
      try {
        const storage = getStorage()
        const storageRef = ref(storage, `profile-photos/${user.id}`)
        
        await uploadBytes(storageRef, file)
        const downloadURL = await getDownloadURL(storageRef)
        
        // Salva URL nel profilo
        await updateDoc(doc(db, 'users', user.id), {
          photo: downloadURL,
          updatedAt: serverTimestamp()
        })
        
        setFormData(prev => ({ ...prev, photo: downloadURL }))
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (storageError: any) {
        console.log('Firebase Storage non disponibile, uso Base64:', storageError.message)
        
        // Metodo 2: Fallback a Base64 (per immagini piccole)
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          
          // Comprimi l'immagine se troppo grande per Firestore (max ~1MB)
          let finalImage = base64
          if (base64.length > 900000) {
            // Comprimi usando canvas
            finalImage = await compressImage(file, 400, 0.7)
          }
          
          await updateDoc(doc(db, 'users', user.id), {
            photo: finalImage,
            updatedAt: serverTimestamp()
          })
          
          setFormData(prev => ({ ...prev, photo: finalImage }))
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      console.error('Errore upload foto:', err)
      alert('Errore durante il caricamento della foto')
    } finally {
      setIsUploadingPhoto(false)
    }
  }
  
  // Comprimi immagine
  const compressImage = (file: File, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }
  
  // Rimuovi foto
  const handleRemovePhoto = async () => {
    if (!user?.id) return
    
    setIsUploadingPhoto(true)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        photo: null,
        updatedAt: serverTimestamp()
      })
      
      setFormData(prev => ({ ...prev, photo: '' }))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Errore rimozione foto:', err)
    } finally {
      setIsUploadingPhoto(false)
    }
  }
  
  // Salva profilo
  const handleSaveProfile = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: formData.name,
        phone: formData.phone,
        updatedAt: serverTimestamp()
      })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      alert('Errore durante il salvataggio')
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }
  
  const isCoach = user.role === 'coach'
  const isAdmin = user.role === 'admin'
  
  const roleLabel = isAdmin ? 'Admin' : (isCoach ? 'Coach' : 'Coachee')
  const roleColor = isAdmin ? 'bg-red-100 text-red-600' : (isCoach ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600')
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href={isAdmin ? '/admin' : (isCoach ? '/coach/dashboard' : '/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Impostazioni</h1>
                <p className="text-sm text-gray-500">Gestisci il tuo account</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profilo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <User size={20} className="text-primary-500" />
            Profilo
          </h2>
          
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {formData.photo ? (
                <img 
                  src={formData.photo} 
                  alt={formData.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary-600">
                    {formData.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              
              {/* Pulsante upload */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
              
              {/* Input file nascosto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-charcoal">{formData.name}</p>
              <p className="text-sm text-gray-500">{formData.email}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${roleColor}`}>
                {roleLabel}
              </span>
              
              {/* Link rimuovi foto */}
              {formData.photo && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={isUploadingPhoto}
                  className="block mt-2 text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  Rimuovi foto
                </button>
              )}
            </div>
          </div>
          
          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">L'email non può essere modificata</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+39 123 456 7890"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          {/* Success message */}
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-green-600"
            >
              <CheckCircle size={18} />
              Profilo aggiornato con successo!
            </motion.div>
          )}
          
          {/* Save button */}
          <button
            onClick={handleSaveProfile}
            disabled={isLoading}
            className="mt-6 w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Salva modifiche
          </button>
        </motion.div>
        
        {/* Link rapidi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Link Admin */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
            >
              <div className="flex items-center gap-3">
                <Shield className="text-red-500" size={20} />
                <div>
                  <p className="font-medium text-charcoal">Pannello Admin</p>
                  <p className="text-sm text-gray-500">Gestisci la piattaforma</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </Link>
          )}
          
          {/* Link Coach */}
          {isCoach && (
            <>
              <Link
                href="/coach/stripe-onboarding"
                className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="text-green-500" size={20} />
                  <div>
                    <p className="font-medium text-charcoal">Pagamenti</p>
                    <p className="text-sm text-gray-500">Configura Stripe Connect</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </Link>
              
              <Link
                href="/coach/availability"
                className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Bell className="text-blue-500" size={20} />
                  <div>
                    <p className="font-medium text-charcoal">Disponibilità</p>
                    <p className="text-sm text-gray-500">Imposta i tuoi orari</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </Link>
            </>
          )}
          
          <Link
            href="/sessions"
            className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Shield className="text-purple-500" size={20} />
              <div>
                <p className="font-medium text-charcoal">Le mie sessioni</p>
                <p className="text-sm text-gray-500">Visualizza prenotazioni</p>
              </div>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </Link>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="text-red-500" size={20} />
              <div>
                <p className="font-medium text-red-600">Esci</p>
                <p className="text-sm text-gray-500">Disconnetti account</p>
              </div>
            </div>
          </button>
        </motion.div>
        
        {/* Info account */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>Account ID: {user.id}</p>
          <p>Ruolo: {user.role || 'Non definito'}</p>
        </div>
      </main>
    </div>
  )
}
