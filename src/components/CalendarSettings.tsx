'use client'

import { useState, useEffect } from 'react'
import { Calendar, Check, X, Loader2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

interface CalendarSettingsProps {
  onStatusChange?: (connected: boolean) => void
}

export default function CalendarSettings({ onStatusChange }: CalendarSettingsProps) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Carica stato connessione
  useEffect(() => {
    const loadCalendarStatus = async () => {
      if (!user?.id) return
      
      try {
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        if (coachDoc.exists()) {
          const data = coachDoc.data()
          setIsConnected(data.googleCalendarConnected || false)
          setConnectedEmail(data.googleCalendarEmail || null)
        }
      } catch (err) {
        console.error('Errore caricamento stato calendario:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadCalendarStatus()
  }, [user?.id])
  
  // Controlla parametri URL per feedback e salva token
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const calendarStatus = params.get('calendar')
      
      if (calendarStatus === 'pending') {
        // Abbiamo i token da salvare
        const encodedData = params.get('data')
        if (encodedData) {
          setIsSaving(true)
          try {
            const tokenData = JSON.parse(atob(encodedData))
            
            // Salva i token in Firebase
            await setDoc(doc(db, 'coachCalendarTokens', tokenData.userId), {
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              expiresAt: Date.now() + (tokenData.expiresIn * 1000),
              googleEmail: tokenData.googleEmail,
              googleName: tokenData.googleName,
              connectedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            
            // Aggiorna anche il profilo coach
            await setDoc(doc(db, 'coachApplications', tokenData.userId), {
              googleCalendarConnected: true,
              googleCalendarEmail: tokenData.googleEmail,
              updatedAt: serverTimestamp(),
            }, { merge: true })
            
            setIsConnected(true)
            setConnectedEmail(tokenData.googleEmail)
            onStatusChange?.(true)
            
            // Pulisci URL
            window.history.replaceState({}, '', window.location.pathname)
            
          } catch (err) {
            console.error('Errore salvataggio token:', err)
            alert('Errore nel completare la connessione. Riprova.')
          } finally {
            setIsSaving(false)
          }
        }
      } else if (calendarStatus === 'success') {
        setIsConnected(true)
        window.history.replaceState({}, '', window.location.pathname)
        window.location.reload()
      } else if (calendarStatus === 'error') {
        const message = params.get('message')
        alert(`Errore connessione calendario: ${message}`)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    
    handleCallback()
  }, [onStatusChange])
  
  const handleConnect = () => {
    if (!user?.id) return
    // Redirect a OAuth Google
    window.location.href = `/api/auth/google?userId=${user.id}`
  }
  
  const handleDisconnect = async () => {
    if (!user?.id) return
    
    if (!confirm('Sei sicuro di voler disconnettere Google Calendar?')) return
    
    setIsDisconnecting(true)
    try {
      // Elimina token direttamente da Firebase client-side
      await deleteDoc(doc(db, 'coachCalendarTokens', user.id))
      
      // Aggiorna profilo coach
      await setDoc(doc(db, 'coachApplications', user.id), {
        googleCalendarConnected: false,
        googleCalendarEmail: null,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      
      setIsConnected(false)
      setConnectedEmail(null)
      onStatusChange?.(false)
    } catch (err) {
      console.error('Errore disconnessione:', err)
      alert('Errore nella disconnessione')
    } finally {
      setIsDisconnecting(false)
    }
  }
  
  if (isLoading || isSaving) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-center py-4 gap-3">
          <Loader2 className="animate-spin text-primary-500" size={24} />
          <span className="text-gray-600">
            {isSaving ? 'Connessione in corso...' : 'Caricamento...'}
          </span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isConnected ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <Calendar className={isConnected ? 'text-green-600' : 'text-gray-500'} size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-charcoal">Google Calendar</h3>
          <p className="text-sm text-gray-500">
            Sincronizza le tue disponibilità automaticamente
          </p>
        </div>
      </div>
      
      {isConnected ? (
        <div className="space-y-4">
          {/* Stato connesso */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <Check className="text-green-600" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Calendario connesso</p>
              {connectedEmail && (
                <p className="text-xs text-green-600">{connectedEmail}</p>
              )}
            </div>
          </div>
          
          {/* Info */}
          <div className="text-sm text-gray-500 space-y-2">
            <p>✓ Le tue disponibilità vengono lette dal calendario</p>
            <p>✓ Le prenotazioni creano eventi automaticamente</p>
            <p>✓ I coachee ricevono inviti con link Google Meet</p>
          </div>
          
          {/* Disconnetti */}
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full py-2 px-4 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Disconnessione...
              </>
            ) : (
              <>
                <X size={16} />
                Disconnetti calendario
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stato non connesso */}
          <div className="text-sm text-gray-500 space-y-2">
            <p>Connetti il tuo Google Calendar per:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Mostrare le tue reali disponibilità ai coachee</li>
              <li>Creare automaticamente eventi quando prenotano</li>
              <li>Generare link Google Meet per le sessioni</li>
            </ul>
          </div>
          
          {/* Connetti */}
          <button
            onClick={handleConnect}
            className="w-full py-3 px-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            Connetti Google Calendar
            <ExternalLink size={14} />
          </button>
          
          <p className="text-xs text-gray-400 text-center">
            Verrai reindirizzato a Google per autorizzare l'accesso
          </p>
        </div>
      )}
    </div>
  )
}
