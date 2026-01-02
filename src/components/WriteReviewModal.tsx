'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, AlertCircle } from 'lucide-react'
import StarRating from './StarRating'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'

interface WriteReviewModalProps {
  isOpen: boolean
  onClose: () => void
  coachId: string
  coachName: string
  sessionId?: string
  onSuccess?: () => void
}

export default function WriteReviewModal({
  isOpen,
  onClose,
  coachId,
  coachName,
  sessionId,
  onSuccess
}: WriteReviewModalProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const minMessageLength = 50
  const maxMessageLength = 1000
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validazione
    if (rating === 0) {
      setError('Seleziona un punteggio da 1 a 5 stelle')
      return
    }
    
    if (message.trim().length < minMessageLength) {
      setError(`Il messaggio deve contenere almeno ${minMessageLength} caratteri`)
      return
    }
    
    if (!user) {
      setError('Devi essere loggato per lasciare una recensione')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await addDoc(collection(db, 'reviews'), {
        coachId,
        coachName,
        coacheeId: user.id,
        coacheeName: user.name || 'Utente',
        coacheePhoto: user.photo || null,
        rating,
        message: message.trim(),
        sessionId: sessionId || null,
        isVerified: !!sessionId, // Verificata se collegata a una sessione
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        coachResponse: null,
        coachResponseAt: null
      })
      
      // Reset form
      setRating(0)
      setMessage('')
      
      // Callback
      if (onSuccess) {
        onSuccess()
      }
      
      onClose()
    } catch (err: any) {
      console.error('Errore invio recensione:', err)
      setError('Errore durante l\'invio. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0)
      setMessage('')
      setError('')
      onClose()
    }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-charcoal">Scrivi una recensione</h2>
                <p className="text-sm text-gray-500">per {coachName}</p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Come valuti la tua esperienza? *
                </label>
                <div className="flex justify-center">
                  <StarRating
                    rating={rating}
                    onRatingChange={setRating}
                    size="lg"
                  />
                </div>
                {rating > 0 && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {rating === 1 && 'Scarso'}
                    {rating === 2 && 'Mediocre'}
                    {rating === 3 && 'Buono'}
                    {rating === 4 && 'Ottimo'}
                    {rating === 5 && 'Eccellente!'}
                  </p>
                )}
              </div>
              
              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Racconta la tua esperienza *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, maxMessageLength))}
                  placeholder="Descrivi com'è stata la tua esperienza con questo coach. Cosa ti è piaciuto? Cosa hai imparato? Consiglieresti questo coach ad altri?"
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <div className="flex justify-between mt-1">
                  <p className={`text-xs ${message.length < minMessageLength ? 'text-gray-400' : 'text-green-600'}`}>
                    Min. {minMessageLength} caratteri
                  </p>
                  <p className={`text-xs ${message.length > maxMessageLength * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {message.length}/{maxMessageLength}
                  </p>
                </div>
              </div>
              
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              {/* Info */}
              <p className="text-xs text-gray-400">
                La tua recensione sarà pubblica e visibile sul profilo del coach. 
                {sessionId && ' Questa recensione sarà contrassegnata come verificata.'}
              </p>
              
              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || message.length < minMessageLength}
                  className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Invio...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Pubblica
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
