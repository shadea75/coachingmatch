'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Settings,
  User,
  Calendar,
  Bell,
  Shield,
  CreditCard,
  ArrowLeft,
  Save,
  Loader2,
  Camera,
  Mail,
  Phone,
  MapPin,
  Globe,
  Check,
  X,
  ExternalLink,
  LogOut
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import CalendarSettings from '@/components/CalendarSettings'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { LIFE_AREAS } from '@/types'

export default function CoachSettingsPage() {
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Profile data
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    motivation: '',
    lifeArea: '',
    languages: ['Italiano'],
    averagePrice: 80,
    freeCallAvailable: true,
    sessionMode: ['online'],
    photo: ''
  })
  
  // Redirect se non loggato
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])
  
  // Carica dati profilo
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        if (coachDoc.exists()) {
          const data = coachDoc.data()
          setProfile({
            name: data.name || user.name || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            location: data.location || '',
            bio: data.bio || '',
            motivation: data.motivation || '',
            lifeArea: data.lifeArea || '',
            languages: data.languages || ['Italiano'],
            averagePrice: data.averagePrice || 80,
            freeCallAvailable: data.freeCallAvailable !== false,
            sessionMode: data.sessionMode || ['online'],
            photo: data.photo || ''
          })
        }
      } catch (err) {
        console.error('Errore caricamento profilo:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProfile()
  }, [user])
  
  // Salva modifiche
  const handleSave = async () => {
    if (!user?.id) return
    
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      await updateDoc(doc(db, 'coachApplications', user.id), {
        name: profile.name,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
        motivation: profile.motivation,
        lifeArea: profile.lifeArea,
        languages: profile.languages,
        averagePrice: profile.averagePrice,
        freeCallAvailable: profile.freeCallAvailable,
        sessionMode: profile.sessionMode,
        updatedAt: serverTimestamp()
      })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      alert('Errore nel salvataggio. Riprova.')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }
  
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    )
  }
  
  if (!user) return null
  
  const tabs = [
    { id: 'profile', label: 'Profilo', icon: User },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'notifications', label: 'Notifiche', icon: Bell },
  ]
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-primary-500" />
              <span className="font-semibold text-charcoal">Impostazioni</span>
            </div>
          </div>
          <Logo size="sm" />
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-600'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Icon size={20} />
                      {tab.label}
                    </button>
                  )
                })}
                
                <hr className="my-3" />
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={20} />
                  Esci
                </button>
              </nav>
            </div>
          </div>
          
          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tab: Profilo */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Info base */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-charcoal mb-6">Informazioni personali</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome completo
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+39 333 1234567"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Località
                      </label>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        placeholder="Milano, Italia"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Area di competenza */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-charcoal mb-4">Area di competenza principale</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Seleziona l'area della vita in cui sei specializzato
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {LIFE_AREAS.map(area => (
                      <button
                        key={area.id}
                        onClick={() => setProfile({ ...profile, lifeArea: area.id })}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          profile.lifeArea === area.id
                            ? 'border-current shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{
                          borderColor: profile.lifeArea === area.id ? area.color : undefined,
                          backgroundColor: profile.lifeArea === area.id ? `${area.color}10` : undefined
                        }}
                      >
                        <span 
                          className="text-sm font-medium"
                          style={{ color: profile.lifeArea === area.id ? area.color : '#6B7280' }}
                        >
                          {area.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Bio e motivazione */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-charcoal mb-6">La tua storia</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        La mia storia, la mia missione
                      </label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={4}
                        maxLength={1000}
                        placeholder="Racconta il tuo percorso e cosa ti ha portato a diventare coach..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">{profile.bio.length}/1000 caratteri</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Il mio scopo
                      </label>
                      <textarea
                        value={profile.motivation}
                        onChange={(e) => setProfile({ ...profile, motivation: e.target.value })}
                        rows={3}
                        maxLength={500}
                        placeholder="Perché fai il coach? Qual è la tua motivazione..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">{profile.motivation.length}/500 caratteri</p>
                    </div>
                  </div>
                </div>
                
                {/* Servizio */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-charcoal mb-6">Il tuo servizio</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prezzo medio per sessione (€)
                      </label>
                      <input
                        type="number"
                        value={profile.averagePrice}
                        onChange={(e) => setProfile({ ...profile, averagePrice: Number(e.target.value) })}
                        min={0}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Call gratuita disponibile
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.freeCallAvailable}
                          onChange={(e) => setProfile({ ...profile, freeCallAvailable: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-gray-600">Offro una prima call gratuita di 30 minuti</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Salva */}
                <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200">
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check size={18} />
                      <span className="text-sm font-medium">Modifiche salvate!</span>
                    </div>
                  )}
                  {!saveSuccess && <div />}
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn btn-primary"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Salva modifiche
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Tab: Calendario */}
            {activeTab === 'calendar' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-charcoal mb-2">Integrazione Calendario</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Connetti il tuo Google Calendar per sincronizzare automaticamente le disponibilità e creare eventi quando i coachee prenotano.
                  </p>
                </div>
                
                <CalendarSettings />
                
                {/* Info aggiuntive */}
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                  <h3 className="font-medium text-blue-800 mb-2">Come funziona?</h3>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0" />
                      Le tue disponibilità vengono lette dal calendario Google
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0" />
                      Quando un coachee prenota, viene creato automaticamente un evento
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0" />
                      Viene generato un link Google Meet per la videochiamata
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0" />
                      Entrambi ricevete l'invito via email con tutti i dettagli
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
            
            {/* Tab: Notifiche */}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-charcoal mb-6">Preferenze notifiche</h2>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-charcoal">Nuove prenotazioni</p>
                        <p className="text-sm text-gray-500">Ricevi un'email quando un coachee prenota una sessione</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-charcoal">Nuove recensioni</p>
                        <p className="text-sm text-gray-500">Ricevi un'email quando ricevi una nuova recensione</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-charcoal">Promemoria sessioni</p>
                        <p className="text-sm text-gray-500">Ricevi un promemoria 1 ora prima delle sessioni</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-charcoal">Aggiornamenti piattaforma</p>
                        <p className="text-sm text-gray-500">Ricevi news e aggiornamenti da CoachaMi</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
