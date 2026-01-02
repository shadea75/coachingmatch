'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Video, 
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, addWeeks } from 'date-fns'
import { it } from 'date-fns/locale'

// Mock coach data
const MOCK_COACH = {
  id: '1',
  name: 'Laura Bianchi',
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  specialization: 'Executive Coach',
  availability: {
    // Available time slots per day of week (0 = Sunday)
    1: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
    2: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
    3: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
    4: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
    5: ['09:00', '10:00', '11:00', '12:00', '13:00'],
  } as Record<number, string[]>
}

// Booked slots (mock)
const BOOKED_SLOTS = [
  { date: '2024-12-18', time: '10:00' },
  { date: '2024-12-18', time: '14:00' },
  { date: '2024-12-19', time: '09:00' },
]

export default function BookingPage() {
  const router = useRouter()
  const params = useParams()
  const coachId = params.coachId as string
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  
  // Get available slots for selected date
  const getAvailableSlots = (date: Date): string[] => {
    const dayOfWeek = date.getDay()
    const slots = MOCK_COACH.availability[dayOfWeek] || []
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // Filter out booked slots and past times
    return slots.filter(time => {
      const isBooked = BOOKED_SLOTS.some(
        slot => slot.date === dateStr && slot.time === time
      )
      
      // If today, filter out past times
      if (isToday(date)) {
        const [hours, minutes] = time.split(':').map(Number)
        const slotTime = new Date()
        slotTime.setHours(hours, minutes, 0)
        if (isBefore(slotTime, new Date())) return false
      }
      
      return !isBooked
    })
  }
  
  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : []
  
  // Handle booking confirmation
  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return
    
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsConfirmed(true)
    setIsSubmitting(false)
  }
  
  // Navigation
  const goToPreviousWeek = () => {
    const prevWeek = addWeeks(currentWeekStart, -1)
    if (!isBefore(prevWeek, startOfWeek(new Date(), { weekStartsOn: 1 }))) {
      setCurrentWeekStart(prevWeek)
      setSelectedDate(null)
      setSelectedTime(null)
    }
  }
  
  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
    setSelectedDate(null)
    setSelectedTime(null)
  }
  
  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
          </div>
          
          <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
            Prenotazione confermata!
          </h1>
          <p className="text-gray-500 mb-6">
            Riceverai una email di conferma con i dettagli della call
          </p>
          
          <div className="bg-cream rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={MOCK_COACH.photo}
                alt={MOCK_COACH.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-charcoal">{MOCK_COACH.name}</p>
                <p className="text-sm text-gray-500">{MOCK_COACH.specialization}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={16} />
                <span>
                  {selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} />
                <span>{selectedTime} • 30 minuti</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Video size={16} />
                <span>Videochiamata</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full btn btn-primary"
            >
              Vai alla dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full btn btn-ghost"
            >
              Torna alla home
            </button>
          </div>
        </motion.div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-primary-500" />
            <span className="font-semibold text-charcoal">Prenota call gratuita</span>
          </div>
        </div>
      </header>
      
      {/* Main */}
      <main className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Coach info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 mb-6 flex items-center gap-4"
          >
            <img 
              src={MOCK_COACH.photo}
              alt={MOCK_COACH.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold text-charcoal">{MOCK_COACH.name}</h2>
              <p className="text-gray-500">{MOCK_COACH.specialization}</p>
            </div>
          </motion.div>
          
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-charcoal">Seleziona data e ora</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={isBefore(addWeeks(currentWeekStart, -1), startOfWeek(new Date(), { weekStartsOn: 1 }))}
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <span className="text-sm text-gray-600 min-w-[140px] text-center">
                  {format(currentWeekStart, "d MMM", { locale: it })} - {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: it })}
                </span>
                <button
                  onClick={goToNextWeek}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Week days */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {weekDays.map(day => {
                const isPast = isBefore(day, new Date()) && !isToday(day)
                const hasSlots = getAvailableSlots(day).length > 0
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      if (!isPast && hasSlots) {
                        setSelectedDate(day)
                        setSelectedTime(null)
                      }
                    }}
                    disabled={isPast || !hasSlots}
                    className={`
                      p-3 rounded-xl text-center transition-all
                      ${isSelected 
                        ? 'bg-primary-500 text-white' 
                        : isPast || !hasSlots
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-50 hover:bg-gray-100 text-charcoal'
                      }
                    `}
                  >
                    <div className="text-xs uppercase mb-1">
                      {format(day, 'EEE', { locale: it })}
                    </div>
                    <div className="text-lg font-semibold">
                      {format(day, 'd')}
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* Time slots */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border-t border-gray-100 pt-6"
              >
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Orari disponibili per {format(selectedDate, "EEEE d MMMM", { locale: it })}
                </h4>
                
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`
                          py-2 px-3 rounded-lg text-sm font-medium transition-all
                          ${selectedTime === time
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-50 hover:bg-gray-100 text-charcoal'
                          }
                        `}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Nessun orario disponibile per questa data
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
          
          {/* Summary and confirm */}
          {selectedDate && selectedTime && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6"
            >
              <h3 className="font-semibold text-charcoal mb-4">Riepilogo</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar size={18} />
                  <span>{format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock size={18} />
                  <span>{selectedTime} • 30 minuti</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Video size={18} />
                  <span>Videochiamata (link via email)</span>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-700 text-sm font-medium">
                  ✓ Prima call di orientamento gratuita
                </p>
              </div>
              
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="w-full btn btn-primary py-4 disabled:opacity-50"
              >
                {isSubmitting ? 'Conferma in corso...' : 'Conferma prenotazione'}
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
