'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Euro,
  Calendar,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'

interface Installment {
  sessionNumber: number
  amount: number
  status: 'pending' | 'paid'
}

export default function NewOfferPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  
  const clientId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [client, setClient] = useState<{ name: string; email: string } | null>(null)
  
  const [offerData, setOfferData] = useState({
    title: '',
    totalSessions: 1,
    sessionDuration: 60,
    pricePerSession: 0,
    description: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadClient = async () => {
      if (!clientId || !user?.id) return
      
      setIsLoading(true)
      try {
        const clientDoc = await getDoc(doc(db, 'coachClients', clientId))
        if (clientDoc.exists()) {
          const data = clientDoc.data()
          setClient({
            name: data.name,
            email: data.email
          })
        } else {
          setError('Cliente non trovato')
        }
      } catch (err) {
        console.error('Errore:', err)
        setError('Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      loadClient()
    }
  }, [clientId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !client) return
    if (!offerData.title || offerData.pricePerSession <= 0) {
      setError('Titolo e prezzo per sessione sono obbligatori')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const priceTotal = offerData.totalSessions * offerData.pricePerSession
      
      // Crea installments
      const installments: Installment[] = Array.from(
        { length: offerData.totalSessions },
        (_, i) => ({
          sessionNumber: i + 1,
          amount: offerData.pricePerSession,
          status: 'pending' as const
        })
      )
      
      // Crea l'offerta
      await addDoc(collection(db, 'externalOffers'), {
        coachId: user.id,
        coachName: user.name || 'Coach',
        coachEmail: user.email,
        clientId: clientId,
        clientName: client.name,
        clientEmail: client.email,
        title: offerData.title,
        description: offerData.description || null,
        totalSessions: offerData.totalSessions,
        sessionDuration: offerData.sessionDuration,
        pricePerSession: offerData.pricePerSession,
        priceTotal,
        installments,
        paidInstallments: 0,
        completedSessions: 0,
        status: 'active',
        source: 'external',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Aggiorna il cliente con il numero di sessioni
      const clientRef = doc(db, 'coachClients', clientId)
      const clientDoc = await getDoc(clientRef)
      if (clientDoc.exists()) {
        const currentSessions = clientDoc.data().totalSessions || 0
        await updateDoc(clientRef, {
          totalSessions: currentSessions + offerData.totalSessions,
          updatedAt: serverTimestamp()
        })
      }
      
      setSuccess(true)
      setTimeout(() => {
        router.push(`/coach/office/clients/${clientId}?source=external`)
      }, 1500)
      
    } catch (err) {
      console.error('Errore:', err)
      setError('Errore durante il salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/coach/office" className="text-primary-500 hover:underline">
            Torna all'Ufficio Virtuale
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-charcoal mb-2">Percorso Creato!</h2>
          <p className="text-gray-500">Reindirizzamento in corso...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/coach/office/clients/${clientId}?source=external`} 
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Nuovo Percorso</h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Cliente */}
          {client && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="text-purple-600" size={24} />
                </div>
                <div>
                  <p className="font-medium text-charcoal">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.email}</p>
                </div>
                <span className="ml-auto text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                  Cliente Esterno
                </span>
              </div>
            </motion.div>
          )}

          {/* Dettagli Percorso */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Euro className="text-green-500" size={20} />
              Dettagli Percorso
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo percorso *
                </label>
                <input
                  type="text"
                  value={offerData.title}
                  onChange={(e) => setOfferData({ ...offerData, title: e.target.value })}
                  placeholder="Es: Percorso di Crescita Personale"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° Sessioni
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={offerData.totalSessions}
                    onChange={(e) => setOfferData({ ...offerData, totalSessions: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durata (min)
                  </label>
                  <select
                    value={offerData.sessionDuration}
                    onChange={(e) => setOfferData({ ...offerData, sessionDuration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    €/Sessione *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={offerData.pricePerSession}
                    onChange={(e) => setOfferData({ ...offerData, pricePerSession: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={offerData.description}
                  onChange={(e) => setOfferData({ ...offerData, description: e.target.value })}
                  placeholder="Descrivi il percorso..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
              
              {/* Riepilogo */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">
                    {offerData.totalSessions} sessioni × €{offerData.pricePerSession.toFixed(2)}
                  </span>
                  <span className="font-medium">
                    €{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Totale percorso</span>
                  <span className="text-primary-500">
                    €{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Salvataggio...
              </>
            ) : (
              <>
                <Save size={20} />
                Crea Percorso
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}

