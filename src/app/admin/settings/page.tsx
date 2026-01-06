'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Save, AlertCircle, Users, Gift } from 'lucide-react'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    platformName: 'CoachaMi',
    supportEmail: 'supporto@coachami.it',
    coachEmail: 'coach@coachami.it',
    platformFeePercentage: 30,
    officeCommissionPercentage: 3.5, // Commissione per percorsi venduti da ufficio virtuale
    freeCallDuration: 15,
    maxAreasPerCoach: 1,
    autoApproveCoaches: false,
    // Community settings
    communityFreeTrialDays: 30,
    communityMonthlyPrice: 29,
    coachMonthlyPrice: 29,
    minPostsPerMonth: 4,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Carica impostazioni da Firebase
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'platform'))
        if (settingsDoc.exists()) {
          setSettings(prev => ({ ...prev, ...settingsDoc.data() }))
        }
        
        const communityDoc = await getDoc(doc(db, 'settings', 'community'))
        if (communityDoc.exists()) {
          const data = communityDoc.data()
          setSettings(prev => ({ 
            ...prev, 
            communityFreeTrialDays: data.freeTrialDays ?? 30,
            communityMonthlyPrice: data.monthlyPrice ?? 29,
          }))
        }
      } catch (err) {
        console.error('Errore caricamento settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      // Salva settings piattaforma
      await setDoc(doc(db, 'settings', 'platform'), {
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        coachEmail: settings.coachEmail,
        platformFeePercentage: settings.platformFeePercentage,
        officeCommissionPercentage: settings.officeCommissionPercentage,
        freeCallDuration: settings.freeCallDuration,
        maxAreasPerCoach: settings.maxAreasPerCoach,
        autoApproveCoaches: settings.autoApproveCoaches,
        minPostsPerMonth: settings.minPostsPerMonth,
        updatedAt: new Date()
      })
      
      // Salva settings community
      await setDoc(doc(db, 'settings', 'community'), {
        freeTrialDays: settings.communityFreeTrialDays,
        monthlyPrice: settings.communityMonthlyPrice,
        coachMonthlyPrice: settings.coachMonthlyPrice,
        updatedAt: new Date()
      })
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Errore salvataggio settings:', err)
      alert('Errore durante il salvataggio')
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Impostazioni</h1>
          <p className="text-gray-500">Configura le impostazioni della piattaforma</p>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {/* Generale */}
          <div className="p-6">
            <h2 className="font-semibold text-charcoal mb-4">Generale</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome piattaforma
                </label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email supporto
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email per coach
                </label>
                <input
                  type="email"
                  value={settings.coachEmail}
                  onChange={(e) => setSettings({ ...settings, coachEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Community */}
          <div className="p-6">
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Gift size={20} className="text-green-500" />
              Community & Abbonamenti
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodo di prova gratuito (giorni)
                </label>
                <select
                  value={settings.communityFreeTrialDays}
                  onChange={(e) => setSettings({ ...settings, communityFreeTrialDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={0}>Nessun periodo gratuito</option>
                  <option value={7}>7 giorni</option>
                  <option value={14}>14 giorni</option>
                  <option value={30}>30 giorni</option>
                  <option value={60}>60 giorni</option>
                  <option value={90}>90 giorni</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  I nuovi utenti avranno accesso gratuito alla community per questo periodo
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prezzo abbonamento Coachee (€/mese)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.communityMonthlyPrice}
                    onChange={(e) => setSettings({ ...settings, communityMonthlyPrice: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prezzo abbonamento Coach (€/mese)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.coachMonthlyPrice}
                    onChange={(e) => setSettings({ ...settings, coachMonthlyPrice: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post minimi al mese per coach
                </label>
                <select
                  value={settings.minPostsPerMonth}
                  onChange={(e) => setSettings({ ...settings, minPostsPerMonth: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={2}>2 post/mese</option>
                  <option value={4}>4 post/mese</option>
                  <option value={6}>6 post/mese</option>
                  <option value={8}>8 post/mese</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  I coach che non raggiungono questo obiettivo perdono visibilità
                </p>
              </div>
              
              {/* Info accesso community */}
              <div className="pt-4 border-t border-gray-100">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>ℹ️ Accesso Community:</strong> Gli utenti possono accedere alla Community solo se hanno un abbonamento attivo (€{settings.communityMonthlyPrice}/mese) oppure sono nel periodo di prova gratuito ({settings.communityFreeTrialDays} giorni dalla registrazione).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coach */}
          <div className="p-6">
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Users size={20} className="text-primary-500" />
              Impostazioni Coach
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero massimo aree per coach
                </label>
                <select
                  value={settings.maxAreasPerCoach}
                  onChange={(e) => setSettings({ ...settings, maxAreasPerCoach: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>1 area</option>
                  <option value={2}>2 aree</option>
                  <option value={3}>3 aree</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Consigliato: 1 area per maggiore specializzazione
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commissione piattaforma (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.platformFeePercentage}
                  onChange={(e) => setSettings({ ...settings, platformFeePercentage: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Il coach riceve {100 - settings.platformFeePercentage}% di ogni sessione venduta tramite matching CoachaMi
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commissione Ufficio Virtuale (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settings.officeCommissionPercentage}
                  onChange={(e) => setSettings({ ...settings, officeCommissionPercentage: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Commissione per percorsi venduti dall'Ufficio Virtuale a clienti CoachaMi (il coach riceve {(100 - settings.officeCommissionPercentage).toFixed(1)}%)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durata call gratuita (minuti)
                </label>
                <select
                  value={settings.freeCallDuration}
                  onChange={(e) => setSettings({ ...settings, freeCallDuration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={15}>15 minuti</option>
                  <option value={20}>20 minuti</option>
                  <option value={30}>30 minuti</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Approvazione automatica coach
                  </label>
                  <p className="text-xs text-gray-500">
                    Se attivo, i coach vengono approvati automaticamente
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, autoApproveCoaches: !settings.autoApproveCoaches })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoApproveCoaches ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoApproveCoaches ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="btn bg-primary-500 text-white hover:bg-primary-600"
          >
            <Save size={18} />
            Salva impostazioni
          </button>
          {saved && (
            <span className="text-green-600 text-sm">✓ Impostazioni salvate</span>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
