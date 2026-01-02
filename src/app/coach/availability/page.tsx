'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Clock, 
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Settings
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  CoachAvailability,
  DailyAvailability,
  TimeSlot,
  DAYS_OF_WEEK,
  generateTimeOptions,
  createDefaultAvailability
} from '@/types/sessions'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export default function CoachAvailabilityPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const [availability, setAvailability] = useState<CoachAvailability | null>(null)
  
  const timeOptions = generateTimeOptions()
  
  // Carica disponibilità
  useEffect(() => {
    const loadAvailability = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        const availDoc = await getDoc(doc(db, 'coachAvailability', user.id))
        
        if (availDoc.exists()) {
          setAvailability(availDoc.data() as CoachAvailability)
        } else {
          // Crea disponibilità di default
          const defaultAvail = createDefaultAvailability(user.id)
          setAvailability(defaultAvail)
        }
      } catch (err) {
        console.error('Errore caricamento disponibilità:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadAvailability()
  }, [user?.id])
  
  // Toggle giorno
  const toggleDay = (dayOfWeek: number) => {
    if (!availability) return
    
    setAvailability({
      ...availability,
      weeklySchedule: availability.weeklySchedule.map(day => 
        day.dayOfWeek === dayOfWeek 
          ? { 
              ...day, 
              enabled: !day.enabled,
              slots: !day.enabled ? [{ start: '09:00', end: '18:00' }] : day.slots
            }
          : day
      )
    })
  }
  
  // Aggiorna slot
  const updateSlot = (dayOfWeek: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    if (!availability) return
    
    setAvailability({
      ...availability,
      weeklySchedule: availability.weeklySchedule.map(day => {
        if (day.dayOfWeek !== dayOfWeek) return day
        
        const newSlots = [...day.slots]
        newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value }
        return { ...day, slots: newSlots }
      })
    })
  }
  
  // Aggiungi slot
  const addSlot = (dayOfWeek: number) => {
    if (!availability) return
    
    setAvailability({
      ...availability,
      weeklySchedule: availability.weeklySchedule.map(day => {
        if (day.dayOfWeek !== dayOfWeek) return day
        
        const lastSlot = day.slots[day.slots.length - 1]
        const newStart = lastSlot ? lastSlot.end : '14:00'
        const newEnd = '18:00'
        
        return { ...day, slots: [...day.slots, { start: newStart, end: newEnd }] }
      })
    })
  }
  
  // Rimuovi slot
  const removeSlot = (dayOfWeek: number, slotIndex: number) => {
    if (!availability) return
    
    setAvailability({
      ...availability,
      weeklySchedule: availability.weeklySchedule.map(day => {
        if (day.dayOfWeek !== dayOfWeek) return day
        
        return { ...day, slots: day.slots.filter((_, i) => i !== slotIndex) }
      })
    })
  }
  
  // Salva
  const handleSave = async () => {
    if (!availability || !user?.id) return
    
    setIsSaving(true)
    setError('')
    setSaveSuccess(false)
    
    try {
      await setDoc(doc(db, 'coachAvailability', user.id), {
        ...availability,
        updatedAt: serverTimestamp()
      })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      setError('Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }
  
  if (!user || user.role !== 'coach') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">Accesso riservato ai coach</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coach/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Disponibilità</h1>
                <p className="text-sm text-gray-500">Imposta i tuoi orari</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : availability ? (
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <Calendar className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-blue-700">
                Imposta gli orari in cui sei disponibile per le sessioni. 
                I coachee potranno prenotare solo negli slot che indichi.
              </p>
            </div>
            
            {/* Giorni della settimana */}
            <div className="space-y-4">
              {availability.weeklySchedule.map((day, index) => (
                <motion.div
                  key={day.dayOfWeek}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleDay(day.dayOfWeek)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          day.enabled ? 'bg-primary-500' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            day.enabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                      <span className={`font-medium ${day.enabled ? 'text-charcoal' : 'text-gray-400'}`}>
                        {DAYS_OF_WEEK[day.dayOfWeek]}
                      </span>
                    </div>
                    
                    {day.enabled && (
                      <button
                        onClick={() => addSlot(day.dayOfWeek)}
                        className="text-sm text-primary-500 hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Aggiungi fascia
                      </button>
                    )}
                  </div>
                  
                  {day.enabled && (
                    <div className="space-y-3">
                      {day.slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-3">
                          <Clock size={16} className="text-gray-400" />
                          <select
                            value={slot.start}
                            onChange={(e) => updateSlot(day.dayOfWeek, slotIndex, 'start', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span className="text-gray-400">-</span>
                          <select
                            value={slot.end}
                            onChange={(e) => updateSlot(day.dayOfWeek, slotIndex, 'end', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          {day.slots.length > 1 && (
                            <button
                              onClick={() => removeSlot(day.dayOfWeek, slotIndex)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!day.enabled && (
                    <p className="text-sm text-gray-400">Non disponibile</p>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Impostazioni avanzate */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl p-5 shadow-sm"
            >
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Settings size={18} className="text-gray-400" />
                Impostazioni
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durata sessioni
                  </label>
                  <select
                    value={availability.sessionDurations[0]}
                    onChange={(e) => setAvailability({
                      ...availability,
                      sessionDurations: [parseInt(e.target.value)]
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={30}>30 minuti</option>
                    <option value={45}>45 minuti</option>
                    <option value={60}>60 minuti</option>
                    <option value={90}>90 minuti</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pausa tra sessioni
                  </label>
                  <select
                    value={availability.bufferBetweenSessions}
                    onChange={(e) => setAvailability({
                      ...availability,
                      bufferBetweenSessions: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={0}>Nessuna</option>
                    <option value={15}>15 minuti</option>
                    <option value={30}>30 minuti</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prenotazione anticipata max
                  </label>
                  <select
                    value={availability.advanceBookingDays}
                    onChange={(e) => setAvailability({
                      ...availability,
                      advanceBookingDays: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={7}>1 settimana</option>
                    <option value={14}>2 settimane</option>
                    <option value={30}>1 mese</option>
                    <option value={60}>2 mesi</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preavviso minimo
                  </label>
                  <select
                    value={availability.minimumNotice}
                    onChange={(e) => setAvailability({
                      ...availability,
                      minimumNotice: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={2}>2 ore</option>
                    <option value={6}>6 ore</option>
                    <option value={12}>12 ore</option>
                    <option value={24}>24 ore</option>
                    <option value={48}>48 ore</option>
                  </select>
                </div>
              </div>
            </motion.div>
            
            {/* Error */}
            {error && (
              <div className="bg-red-50 rounded-xl p-4 flex items-center gap-2 text-red-600">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            
            {/* Success */}
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 rounded-xl p-4 flex items-center gap-2 text-green-600"
              >
                <CheckCircle size={18} />
                Disponibilità salvata con successo!
              </motion.div>
            )}
            
            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salva disponibilità
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
