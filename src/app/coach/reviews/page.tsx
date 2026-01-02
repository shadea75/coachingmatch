'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Star, 
  MessageSquare, 
  TrendingUp,
  Send,
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import StarRating from '@/components/StarRating'
import { CoachReview } from '@/types/community'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

export default function CoachReviewsPage() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<CoachReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'replied'>('all')
  
  // Statistiche
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    pending: 0,
    thisMonth: 0
  })
  
  // Carica recensioni
  useEffect(() => {
    const loadReviews = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('coachId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        
        const snapshot = await getDocs(reviewsQuery)
        const reviewsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
          coachResponseAt: doc.data().coachResponseAt?.toDate?.() || null
        })) as CoachReview[]
        
        setReviews(reviewsData)
        
        // Calcola statistiche
        const total = reviewsData.length
        const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0)
        const pending = reviewsData.filter(r => !r.coachResponse).length
        const thisMonth = reviewsData.filter(r => {
          const reviewDate = new Date(r.createdAt)
          const now = new Date()
          return reviewDate.getMonth() === now.getMonth() && 
                 reviewDate.getFullYear() === now.getFullYear()
        }).length
        
        setStats({
          average: total > 0 ? sum / total : 0,
          total,
          pending,
          thisMonth
        })
      } catch (err) {
        console.error('Errore caricamento recensioni:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadReviews()
  }, [user?.id])
  
  // Invia risposta
  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return
    
    setIsSubmitting(true)
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        coachResponse: replyText.trim(),
        coachResponseAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Aggiorna stato locale
      setReviews(reviews.map(r => 
        r.id === reviewId 
          ? { ...r, coachResponse: replyText.trim(), coachResponseAt: new Date() }
          : r
      ))
      
      setStats(prev => ({ ...prev, pending: prev.pending - 1 }))
      setReplyingTo(null)
      setReplyText('')
    } catch (err) {
      console.error('Errore invio risposta:', err)
      alert('Errore durante l\'invio della risposta')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Filtra recensioni
  const filteredReviews = reviews.filter(r => {
    if (filter === 'pending') return !r.coachResponse
    if (filter === 'replied') return !!r.coachResponse
    return true
  })
  
  // Formatta data
  const formatDate = (date: Date) => {
    try {
      const d = date instanceof Date ? date : new Date(date)
      return formatDistanceToNow(d, { addSuffix: true, locale: it })
    } catch {
      return ''
    }
  }
  
  if (!user || user.role !== 'coach') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Accesso riservato ai coach</p>
          <Link href="/dashboard" className="text-primary-500 hover:underline mt-2 inline-block">
            Torna alla dashboard
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">Le mie recensioni</h1>
                <p className="text-sm text-gray-500">Gestisci le recensioni ricevute</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className="text-yellow-400" size={20} />
                  <span className="text-sm text-gray-500">Rating medio</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">
                  {stats.average.toFixed(1)}
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="text-primary-500" size={20} />
                  <span className="text-sm text-gray-500">Totali</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">{stats.total}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-amber-500" size={20} />
                  <span className="text-sm text-gray-500">Da rispondere</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">{stats.pending}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-green-500" size={20} />
                  <span className="text-sm text-gray-500">Questo mese</span>
                </div>
                <p className="text-2xl font-bold text-charcoal">{stats.thisMonth}</p>
              </motion.div>
            </div>
            
            {/* Filtri */}
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'Tutte', count: reviews.length },
                { id: 'pending', label: 'Da rispondere', count: stats.pending },
                { id: 'replied', label: 'Risposte', count: reviews.length - stats.pending }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.id
                      ? 'bg-charcoal text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            
            {/* Lista recensioni */}
            {filteredReviews.length > 0 ? (
              <div className="space-y-4">
                {filteredReviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white rounded-xl p-5 shadow-sm ${
                      !review.coachResponse ? 'border-l-4 border-amber-400' : ''
                    }`}
                  >
                    {/* Header recensione */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {review.coacheePhoto ? (
                          <img 
                            src={review.coacheePhoto} 
                            alt={review.coacheeName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {review.coacheeName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-charcoal">{review.coacheeName}</p>
                            {review.isVerified && (
                              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle size={12} />
                                Verificata
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
                        </div>
                      </div>
                      
                      <StarRating rating={review.rating} readonly size="sm" />
                    </div>
                    
                    {/* Messaggio */}
                    <p className="text-gray-700 text-sm mb-4">{review.message}</p>
                    
                    {/* Risposta esistente */}
                    {review.coachResponse && (
                      <div className="bg-gray-50 rounded-lg p-4 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={14} className="text-green-500" />
                          <span className="text-xs font-medium text-green-600">La tua risposta</span>
                          <span className="text-xs text-gray-400">
                            • {formatDate(review.coachResponseAt!)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{review.coachResponse}</p>
                      </div>
                    )}
                    
                    {/* Form risposta */}
                    {!review.coachResponse && (
                      <>
                        {replyingTo === review.id ? (
                          <div className="mt-4 space-y-3">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Scrivi una risposta a questa recensione..."
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyText('')
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                              >
                                Annulla
                              </button>
                              <button
                                onClick={() => handleReply(review.id)}
                                disabled={!replyText.trim() || isSubmitting}
                                className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
                              >
                                {isSubmitting ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Send size={16} />
                                )}
                                Rispondi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingTo(review.id)}
                            className="mt-3 text-primary-500 text-sm hover:underline flex items-center gap-1"
                          >
                            <MessageSquare size={14} />
                            Rispondi a questa recensione
                          </button>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center">
                <Star size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">
                  {filter === 'pending' 
                    ? 'Nessuna recensione da rispondere' 
                    : filter === 'replied'
                    ? 'Nessuna recensione con risposta'
                    : 'Non hai ancora ricevuto recensioni'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
