'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  UserPlus,
  Mail,
  Phone,
  FileText,
  Euro,
  Calendar,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore'

interface Installment {
  sessionNumber: number
  amount: number
  status: 'pending' | 'paid'
}

export default function NewClientPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Dati cliente
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  
  // Dati offerta (opzionale)
  const [createOffer, setCreateOffer] = useState(false)
  const [offerData, setOfferData] = useState({
    title: '',
    totalSessions: 1,
    sessionDuration: 60,
    pricePerSession: 0,
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return
    if (!clientData.name || !clientData.email) {
      setError('Nome e email sono obbligatori')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    // Funzione per registrare tentativo sospetto
    const reportSuspiciousAttempt = async (type: string, matchedData: string, matchedUserId?: string) => {
      try {
        // 1. Salva nel database del coach
        const coachRef = doc(db, 'users', user.id)
        await updateDoc(coachRef, {
          suspiciousAttempts: arrayUnion({
            type,
            attemptedData: {
              name: clientData.name,
              email: clientData.email,
              phone: clientData.phone || null
            },
            matchedData,
            matchedUserId: matchedUserId || null,
            timestamp: new Date().toISOString()
          }),
          lastSuspiciousAttempt: new Date().toISOString()
        })
        
        // 2. Crea un record separato per l'admin
        await addDoc(collection(db, 'suspiciousAttempts'), {
          coachId: user.id,
          coachName: user.name || 'Coach',
          coachEmail: user.email,
          type,
          attemptedData: {
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone || null
          },
          matchedData,
          matchedUserId: matchedUserId || null,
          createdAt: serverTimestamp(),
          reviewed: false
        })
        
        // 3. Invia email all'admin
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'suspicious_attempt_alert',
            data: {
              coachId: user.id,
              coachName: user.name || 'Coach',
              coachEmail: user.email,
              attemptType: type,
              attemptedName: clientData.name,
              attemptedEmail: clientData.email,
              attemptedPhone: clientData.phone || 'Non fornito',
              matchedData,
              timestamp: new Date().toLocaleString('it-IT')
            }
          })
        })
      } catch (err) {
        console.error('Errore report tentativo sospetto:', err)
      }
    }
    
    try {
      // ========== CONTROLLI ANTI-DUPLICATO ==========
      
      // 1. Controlla se email esiste già in users (coachee registrati)
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', clientData.email.toLowerCase().trim())
      )
      const emailSnap = await getDocs(emailQuery)
      if (!emailSnap.empty) {
        const matchedUser = emailSnap.docs[0]
        await reportSuspiciousAttempt('email_duplicata', clientData.email, matchedUser.id)
        setError('Questa email appartiene a un utente già registrato su CoachaMi. Cerca il cliente nella sezione "CoachaMi" dell\'Ufficio Virtuale.')
        setIsSubmitting(false)
        return
      }
      
      // 2. Controlla se email esiste già nei tuoi clienti esterni (questo non è sospetto, solo errore)
      const existingClientQuery = query(
        collection(db, 'coachClients'),
        where('coachId', '==', user.id),
        where('email', '==', clientData.email.toLowerCase().trim())
      )
      const existingClientSnap = await getDocs(existingClientQuery)
      if (!existingClientSnap.empty) {
        setError('Hai già un cliente con questa email.')
        setIsSubmitting(false)
        return
      }
      
      // 3. Se fornito telefono, controlla se esiste in users
      if (clientData.phone && clientData.phone.trim()) {
        const phoneNormalized = clientData.phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')
        const phoneQuery = query(
          collection(db, 'users'),
          where('phone', '==', phoneNormalized)
        )
        const phoneSnap = await getDocs(phoneQuery)
        if (!phoneSnap.empty) {
          const matchedUser = phoneSnap.docs[0]
          await reportSuspiciousAttempt('telefono_duplicato', clientData.phone, matchedUser.id)
          setError('Questo numero di telefono appartiene a un utente già registrato su CoachaMi.')
          setIsSubmitting(false)
          return
        }
      }
      
      // 4. Controlla se nome completo esiste già in users (case-insensitive)
      const nameLower = clientData.name.toLowerCase().trim()
      const usersSnap = await getDocs(collection(db, 'users'))
      
      let foundUserId: string | null = null
      let foundUserName: string | null = null
      
      for (const docSnap of usersSnap.docs) {
        const userData = docSnap.data()
        const userName = (userData.name || userData.displayName || '').toLowerCase().trim()
        if (userName === nameLower) {
          foundUserId = docSnap.id
          foundUserName = userData.name || userData.displayName
          break
        }
      }
      
      if (foundUserId && foundUserName) {
        await reportSuspiciousAttempt('nome_duplicato', foundUserName, foundUserId)
        setError('Esiste già un utente registrato su CoachaMi con questo nome. Se è la stessa persona, cercala nella sezione "CoachaMi".')
        setIsSubmitting(false)
        return
      }
      
      // ========== FINE CONTROLLI ==========
      
      // Normalizza i dati
      const emailNormalized = clientData.email.toLowerCase().trim()
      const phoneNormalized = clientData.phone ? clientData.phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '') : null
      
      // Crea il cliente
      const clientRef = await addDoc(collection(db, 'coachClients'), {
        coachId: user.id,
        name: clientData.name.trim(),
        email: emailNormalized,
        phone: phoneNormalized,
        notes: clientData.notes || null,
        source: 'external',
        totalSessions: createOffer ? offerData.totalSessions : 0,
        completedSessions: 0,
        totalRevenue: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Se richiesto, crea anche l'offerta
      if (createOffer && offerData.title && offerData.pricePerSession > 0) {
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
        
        await addDoc(collection(db, 'externalOffers'), {
          coachId: user.id,
          coachName: user.name || 'Coach',
          coachEmail: user.email,
          clientId: clientRef.id,
          clientName: clientData.name,
          clientEmail: clientData.email,
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
      }
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/coach/office')
      }, 1500)
      
    } catch (err) {
      console.error('Errore:', err)
      setError('Errore durante il salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
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
          <h2 className="text-xl font-bold text-charcoal mb-2">Cliente Aggiunto!</h2>
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
            <Link href="/coach/office" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Nuovo Cliente</h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Banner informativo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3"
        >
          <AlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Clienti Esterni</p>
            <p className="text-blue-600">
              Questa sezione è per clienti che <strong>non sono registrati</strong> su CoachaMi. 
              Se il tuo cliente ha già un account CoachaMi, lo troverai automaticamente nella lista clienti e potrai creare percorsi direttamente da lì.
            </p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dati Cliente */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <UserPlus className="text-primary-500" size={20} />
              Informazioni Cliente
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  placeholder="Mario Rossi"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    placeholder="mario@esempio.it"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                    placeholder="+39 333 1234567"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea
                    value={clientData.notes}
                    onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                    placeholder="Informazioni aggiuntive sul cliente..."
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Toggle Offerta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Calendar className="text-amber-500" size={24} />
                <div>
                  <p className="font-medium text-charcoal">Crea anche un percorso</p>
                  <p className="text-sm text-gray-500">Definisci sessioni e prezzo</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={createOffer}
                  onChange={(e) => setCreateOffer(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  createOffer ? 'bg-primary-500' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    createOffer ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
            </label>
          </motion.div>

          {/* Dati Offerta */}
          {createOffer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
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
                    required={createOffer}
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
                      €/Sessione
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={offerData.pricePerSession}
                      onChange={(e) => setOfferData({ ...offerData, pricePerSession: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required={createOffer}
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
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>
                
                {/* Riepilogo */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">{offerData.totalSessions} sessioni × €{offerData.pricePerSession}</span>
                    <span className="font-medium">€{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Totale percorso</span>
                    <span className="text-primary-500">€{(offerData.totalSessions * offerData.pricePerSession).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
                Salva Cliente
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
