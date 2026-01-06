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
  LogOut,
  FileText,
  Building,
  Landmark
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import StripeConnectSetup from '@/components/coach/StripeConnectSetup'
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
    lifeArea: '',        // Manteniamo per retrocompatibilità
    lifeAreas: [] as string[], // Nuovo: fino a 3 aree
    languages: ['Italiano'],
    averagePrice: 80,
    freeCallAvailable: true,
    sessionMode: ['online'],
    photo: ''
  })
  
  // Dati fatturazione
  const [billing, setBilling] = useState({
    businessName: '',       // Nome/Ragione sociale
    address: '',            // Indirizzo
    city: '',               // Città
    postalCode: '',         // CAP
    province: '',           // Provincia
    country: 'Italia',      // Paese
    fiscalCode: '',         // Codice Fiscale
    vatNumber: '',          // P.IVA
    sdiCode: '',            // Codice SDI
    pec: '',                // PEC
    iban: '',               // IBAN per bonifici
    bankName: '',           // Nome banca
    accountHolder: ''       // Intestatario conto
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
            lifeAreas: data.lifeAreas || (data.lifeArea ? [data.lifeArea] : []), // Retrocompatibilità
            languages: data.languages || ['Italiano'],
            averagePrice: data.averagePrice || 80,
            freeCallAvailable: data.freeCallAvailable !== false,
            sessionMode: data.sessionMode || ['online'],
            photo: data.photo || ''
          })
          
          // Carica dati fatturazione se esistono
          if (data.billing) {
            setBilling({
              businessName: data.billing.businessName || '',
              address: data.billing.address || '',
              city: data.billing.city || '',
              postalCode: data.billing.postalCode || '',
              province: data.billing.province || '',
              country: data.billing.country || 'Italia',
              fiscalCode: data.billing.fiscalCode || '',
              vatNumber: data.billing.vatNumber || '',
              sdiCode: data.billing.sdiCode || '',
              pec: data.billing.pec || '',
              iban: data.billing.iban || '',
              bankName: data.billing.bankName || '',
              accountHolder: data.billing.accountHolder || ''
            })
          }
        }
      } catch (err) {
        console.error('Errore caricamento profilo:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProfile()
  }, [user])
  
  // Salva modifiche profilo
  const handleSaveProfile = async () => {
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
        lifeArea: profile.lifeAreas[0] || '', // Prima area per retrocompatibilità
        lifeAreas: profile.lifeAreas,         // Tutte le aree selezionate
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
  
  // Salva dati fatturazione
  const handleSaveBilling = async () => {
    if (!user?.id) return
    
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      await updateDoc(doc(db, 'coachApplications', user.id), {
        billing: billing,
        updatedAt: serverTimestamp()
      })
      
      // Aggiorna anche nella collection users per accesso rapido admin
      await updateDoc(doc(db, 'users', user.id), {
        billing: billing,
        updatedAt: serverTimestamp()
      })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Errore salvataggio fatturazione:', err)
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
    { id: 'billing', label: 'Fatturazione', icon: FileText },
    { id: 'availability', label: 'Disponibilità', icon: Calendar, href: '/coach/availability' },
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
                  
                  // Se ha href, usa Link
                  if ((tab as any).href) {
                    return (
                      <Link
                        key={tab.id}
                        href={(tab as any).href}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:bg-gray-50 text-gray-600"
                      >
                        <Icon size={20} />
                        {tab.label}
                        <ExternalLink size={14} className="ml-auto opacity-50" />
                      </Link>
                    )
                  }
                  
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
                
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:bg-red-50 text-red-500 mt-4"
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
                        placeholder="+39 123 456 7890"
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
                
                {/* Area competenza */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-charcoal mb-4">Aree di competenza</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Seleziona fino a 3 aree della vita in cui sei specializzato
                    <span className="ml-2 font-medium">
                      ({profile.lifeAreas.length}/3 selezionate)
                    </span>
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {LIFE_AREAS.map(area => {
                      const isSelected = profile.lifeAreas.includes(area.id)
                      const canSelect = isSelected || profile.lifeAreas.length < 3
                      
                      return (
                        <button
                          key={area.id}
                          onClick={() => {
                            if (isSelected) {
                              // Rimuovi area
                              setProfile({ 
                                ...profile, 
                                lifeAreas: profile.lifeAreas.filter(a => a !== area.id)
                              })
                            } else if (canSelect) {
                              // Aggiungi area
                              setProfile({ 
                                ...profile, 
                                lifeAreas: [...profile.lifeAreas, area.id]
                              })
                            }
                          }}
                          disabled={!canSelect && !isSelected}
                          className={`p-4 rounded-xl border-2 transition-all text-center relative ${
                            isSelected
                              ? 'border-current shadow-md'
                              : canSelect
                                ? 'border-gray-200 hover:border-gray-300'
                                : 'border-gray-100 opacity-50 cursor-not-allowed'
                          }`}
                          style={{
                            borderColor: isSelected ? area.color : undefined,
                            backgroundColor: isSelected ? `${area.color}10` : undefined
                          }}
                        >
                          {isSelected && (
                            <div 
                              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: area.color }}
                            >
                              {profile.lifeAreas.indexOf(area.id) + 1}
                            </div>
                          )}
                          <span 
                            className="text-sm font-medium"
                            style={{ color: isSelected ? area.color : canSelect ? '#6B7280' : '#D1D5DB' }}
                          >
                            {area.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  
                  {profile.lifeAreas.length === 0 && (
                    <p className="text-sm text-amber-600 mt-3">
                      ⚠️ Seleziona almeno un'area di competenza
                    </p>
                  )}
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
                
                {/* Salva Profilo */}
                <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200">
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check size={18} />
                      <span className="text-sm font-medium">Modifiche salvate!</span>
                    </div>
                  )}
                  {!saveSuccess && <div />}
                  
                  <button
                    onClick={handleSaveProfile}
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
            
            {/* Tab: Fatturazione */}
            {activeTab === 'billing' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm">
                    <strong>⚠️ Importante:</strong> Questi dati sono necessari per ricevere i pagamenti e per emettere fatture a CoachaMi.
                  </p>
                </div>
                
                {/* Stripe Connect - Ricevi pagamenti automatici */}
                <StripeConnectSetup />
                
                {/* Dati aziendali */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-6">
                    <Building size={20} className="text-primary-500" />
                    <h2 className="text-lg font-semibold text-charcoal">Dati aziendali</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome / Ragione sociale *
                      </label>
                      <input
                        type="text"
                        value={billing.businessName}
                        onChange={(e) => setBilling({ ...billing, businessName: e.target.value })}
                        placeholder="Mario Rossi oppure Rossi Consulting SRL"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Indirizzo *
                      </label>
                      <input
                        type="text"
                        value={billing.address}
                        onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                        placeholder="Via Roma 123"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Città *
                      </label>
                      <input
                        type="text"
                        value={billing.city}
                        onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                        placeholder="Milano"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CAP *
                        </label>
                        <input
                          type="text"
                          value={billing.postalCode}
                          onChange={(e) => setBilling({ ...billing, postalCode: e.target.value })}
                          placeholder="20100"
                          maxLength={5}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Provincia *
                        </label>
                        <input
                          type="text"
                          value={billing.province}
                          onChange={(e) => setBilling({ ...billing, province: e.target.value.toUpperCase() })}
                          placeholder="MI"
                          maxLength={2}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Dati fiscali */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText size={20} className="text-primary-500" />
                    <h2 className="text-lg font-semibold text-charcoal">Dati fiscali</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Codice Fiscale *
                      </label>
                      <input
                        type="text"
                        value={billing.fiscalCode}
                        onChange={(e) => setBilling({ ...billing, fiscalCode: e.target.value.toUpperCase() })}
                        placeholder="RSSMRA80A01F205X"
                        maxLength={16}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Partita IVA
                      </label>
                      <input
                        type="text"
                        value={billing.vatNumber}
                        onChange={(e) => setBilling({ ...billing, vatNumber: e.target.value })}
                        placeholder="IT12345678901"
                        maxLength={13}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Lascia vuoto se non hai P.IVA</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Codice SDI
                      </label>
                      <input
                        type="text"
                        value={billing.sdiCode}
                        onChange={(e) => setBilling({ ...billing, sdiCode: e.target.value.toUpperCase() })}
                        placeholder="XXXXXXX"
                        maxLength={7}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PEC
                      </label>
                      <input
                        type="email"
                        value={billing.pec}
                        onChange={(e) => setBilling({ ...billing, pec: e.target.value })}
                        placeholder="esempio@pec.it"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Dati bancari */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-6">
                    <Landmark size={20} className="text-primary-500" />
                    <h2 className="text-lg font-semibold text-charcoal">Dati bancari per bonifici</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IBAN *
                      </label>
                      <input
                        type="text"
                        value={billing.iban}
                        onChange={(e) => setBilling({ ...billing, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                        placeholder="IT60X0542811101000000123456"
                        maxLength={34}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase font-mono"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Banca
                      </label>
                      <input
                        type="text"
                        value={billing.bankName}
                        onChange={(e) => setBilling({ ...billing, bankName: e.target.value })}
                        placeholder="Intesa Sanpaolo"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Intestatario conto
                      </label>
                      <input
                        type="text"
                        value={billing.accountHolder}
                        onChange={(e) => setBilling({ ...billing, accountHolder: e.target.value })}
                        placeholder="Mario Rossi"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Salva Fatturazione */}
                <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200">
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check size={18} />
                      <span className="text-sm font-medium">Dati fatturazione salvati!</span>
                    </div>
                  )}
                  {!saveSuccess && <div />}
                  
                  <button
                    onClick={handleSaveBilling}
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
                        Salva dati fatturazione
                      </>
                    )}
                  </button>
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
