'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Logo from '@/components/Logo'
import { db } from '@/lib/firebase'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'

const RATING_LABELS: Record<number, string> = {
  1: 'Scarso',
  2: 'Mediocre',
  3: 'Buono',
  4: 'Ottimo',
  5: 'Eccellente!',
}

export default function ExternalReviewPage() {
  const params = useParams()
  const coachId = params.coachId as string

  const [coach, setCoach] = useState<{ name: string; photo: string | null } | null>(null)
  const [loadingCoach, setLoadingCoach] = useState(true)
  const [coachNotFound, setCoachNotFound] = useState(false)

  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const MIN_CHARS = 30
  const MAX_CHARS = 1000

  useEffect(() => {
    const load = async () => {
      try {
        const coachDoc = await getDoc(doc(db, 'coachApplications', coachId))
        if (!coachDoc.exists() || coachDoc.data().status !== 'approved') {
          setCoachNotFound(true)
        } else {
          setCoach({
            name: coachDoc.data().name || 'Coach',
            photo: coachDoc.data().photo || null,
          })
        }
      } catch {
        setCoachNotFound(true)
      } finally {
        setLoadingCoach(false)
      }
    }
    if (coachId) load()
  }, [coachId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Inserisci il tuo nome'); return }
    if (rating === 0) { setError('Seleziona un punteggio'); return }
    if (message.trim().length < MIN_CHARS) {
      setError(`Il messaggio deve contenere almeno ${MIN_CHARS} caratteri`)
      return
    }

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'reviews'), {
        coachId,
        coachName: coach?.name || '',
        coacheeId: null,
        coacheeName: name.trim(),
        coacheePhoto: null,
        rating,
        message: message.trim(),
        sessionId: null,
        isVerified: false,
        isExternal: true,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        coachResponse: null,
        coachResponseAt: null,
      })
      setSubmitted(true)
    } catch {
      setError('Errore durante l\'invio. Riprova tra qualche secondo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayRating = hoverRating || rating

  if (loadingCoach) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (coachNotFound) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
        <Logo size="md" />
        <h1 className="mt-8 text-xl font-bold text-charcoal">Coach non trovato</h1>
        <p className="mt-2 text-gray-500">Il link che hai ricevuto non è valido o il coach non è più attivo.</p>
        <Link href="/" className="mt-6 text-primary-500 hover:underline">Torna alla home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-lg mx-auto flex justify-center">
          <Link href="/"><Logo size="md" /></Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-sm p-10 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal mb-2">Grazie per la tua recensione!</h2>
                <p className="text-gray-500 mb-6">
                  La tua opinione aiuta {coach?.name} a crescere e altri a trovare il coach giusto.
                </p>
                <Link
                  href="/"
                  className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  Scopri CoachaMi
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header form */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-7 text-center">
                  {coach?.photo ? (
                    <img src={coach.photo} alt={coach.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-4 border-white/30" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl font-bold text-white">{coach?.name.charAt(0)}</span>
                    </div>
                  )}
                  <h1 className="text-xl font-bold text-white">Lascia una recensione</h1>
                  <p className="text-white/80 text-sm mt-1">per {coach?.name}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Il tuo nome *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Mario Rossi"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  {/* Stelle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Valutazione *
                    </label>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i)}
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            size={36}
                            className={i <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                          />
                        </button>
                      ))}
                    </div>
                    {displayRating > 0 && (
                      <p className="text-center text-sm text-gray-500 mt-2 font-medium">
                        {RATING_LABELS[displayRating]}
                      </p>
                    )}
                  </div>

                  {/* Messaggio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      La tua esperienza *
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                      placeholder={`Come ti ha aiutato ${coach?.name}? Cosa hai imparato? Consiglieresti questo coach?`}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${message.length < MIN_CHARS ? 'text-gray-400' : 'text-green-600'}`}>
                        Min. {MIN_CHARS} caratteri
                      </span>
                      <span className="text-xs text-gray-400">{message.length}/{MAX_CHARS}</span>
                    </div>
                  </div>

                  {/* Errore */}
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    La tua recensione sarà pubblica sul profilo di {coach?.name} su CoachaMi.
                    Le recensioni esterne non sono verificate da sessione.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting || rating === 0 || message.length < MIN_CHARS || !name.trim()}
                    className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Invio in corso...</>
                    ) : (
                      <><Send size={18} /> Pubblica recensione</>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-gray-400 mt-6">
            Powered by <Link href="/" className="text-primary-500 hover:underline">CoachaMi</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
