'use client'

import { useState, useEffect } from 'react'
import { Star, MessageSquare, TrendingUp, Filter } from 'lucide-react'
import StarRating from './StarRating'
import ReviewCard from './ReviewCard'
import WriteReviewModal from './WriteReviewModal'
import { CoachReview } from '@/types/community'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'

interface CoachReviewsSectionProps {
  coachId: string
  coachName: string
  showWriteButton?: boolean
  maxReviews?: number
  showAll?: boolean
}

export default function CoachReviewsSection({
  coachId,
  coachName,
  showWriteButton = true,
  maxReviews = 5,
  showAll = false
}: CoachReviewsSectionProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<CoachReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showWriteModal, setShowWriteModal] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent')
  
  // Statistiche
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })
  
  // Carica recensioni
  const loadReviews = async () => {
    setIsLoading(true)
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('coachId', '==', coachId),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        ...(showAll ? [] : [limit(maxReviews)])
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
      if (reviewsData.length > 0) {
        const total = reviewsData.length
        const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0)
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviewsData.forEach(r => {
          distribution[r.rating as keyof typeof distribution]++
        })
        
        setStats({
          averageRating: sum / total,
          totalReviews: total,
          ratingDistribution: distribution
        })
      }
    } catch (err) {
      console.error('Errore caricamento recensioni:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    loadReviews()
  }, [coachId])
  
  // Filtra e ordina recensioni
  const filteredReviews = reviews
    .filter(r => filterRating === null || r.rating === filterRating)
    .sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  
  // Verifica se l'utente può scrivere una recensione
  const canWriteReview = user && user.role === 'coachee' && user.id !== coachId
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-100 rounded" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-charcoal flex items-center gap-2">
              <MessageSquare className="text-primary-500" size={24} />
              Recensioni
            </h2>
            <p className="text-sm text-gray-500">
              {stats.totalReviews} recensioni per questo coach
            </p>
          </div>
          
          {showWriteButton && canWriteReview && (
            <button
              onClick={() => setShowWriteModal(true)}
              className="btn bg-primary-500 text-white hover:bg-primary-600"
            >
              <Star size={18} />
              Scrivi recensione
            </button>
          )}
        </div>
        
        {stats.totalReviews > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Rating medio */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-charcoal">
                  {stats.averageRating.toFixed(1)}
                </p>
                <StarRating rating={Math.round(stats.averageRating)} readonly size="sm" />
                <p className="text-sm text-gray-500 mt-1">
                  {stats.totalReviews} recensioni
                </p>
              </div>
            </div>
            
            {/* Distribuzione */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]
                const percentage = stats.totalReviews > 0 
                  ? (count / stats.totalReviews) * 100 
                  : 0
                  
                return (
                  <button
                    key={rating}
                    onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                    className={`w-full flex items-center gap-2 group ${
                      filterRating === rating ? 'opacity-100' : 'hover:opacity-80'
                    }`}
                  >
                    <span className="text-sm text-gray-600 w-3">{rating}</span>
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          filterRating === rating ? 'bg-primary-500' : 'bg-yellow-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Star size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Ancora nessuna recensione</p>
            {canWriteReview && (
              <button
                onClick={() => setShowWriteModal(true)}
                className="mt-4 text-primary-500 hover:underline text-sm"
              >
                Sii il primo a recensire questo coach
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Filtri e lista recensioni */}
      {filteredReviews.length > 0 && (
        <>
          {/* Filtri */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {filterRating && (
                <button
                  onClick={() => setFilterRating(null)}
                  className="text-sm text-primary-500 hover:underline"
                >
                  Mostra tutte
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating')}
                className="text-sm border-none bg-transparent text-gray-600 focus:outline-none cursor-pointer"
              >
                <option value="recent">Più recenti</option>
                <option value="rating">Punteggio più alto</option>
              </select>
            </div>
          </div>
          
          {/* Lista recensioni */}
          <div className="space-y-4">
            {filteredReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          
          {/* Mostra più */}
          {!showAll && reviews.length >= maxReviews && (
            <div className="text-center">
              <button className="text-primary-500 hover:underline text-sm">
                Mostra tutte le recensioni
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Modal scrivi recensione */}
      <WriteReviewModal
        isOpen={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        coachId={coachId}
        coachName={coachName}
        onSuccess={loadReviews}
      />
    </div>
  )
}
