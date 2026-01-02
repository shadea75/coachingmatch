'use client'

import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Save, AlertCircle } from 'lucide-react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    platformName: 'CoachaMi',
    supportEmail: 'supporto@coachami.it',
    coachEmail: 'coach@coachami.it',
    platformFeePercentage: 30,
    freeCallDuration: 15,
    maxAreasPerCoach: 1,
    autoApproveCoaches: false,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // TODO: Salvare su Firebase
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Impostazioni</h1>
          <p className="text-gray-500">Configura le impostazioni della piattaforma</p>
        </div>

        {/* Alert */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 font-medium">Funzionalità in sviluppo</p>
            <p className="text-sm text-yellow-700">Le impostazioni saranno salvate su Firebase in una prossima versione.</p>
          </div>
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

          {/* Coach */}
          <div className="p-6">
            <h2 className="font-semibold text-charcoal mb-4">Impostazioni Coach</h2>
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
