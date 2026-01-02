'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import StarRating from './StarRating'
import { CoachReview } from '@/types/community'

interface ReviewCardProps {
  review: CoachReview
  showCoachResponse?: boolean
}

export default function ReviewCard({ review, showCoachResponse = true }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  const formatDate = (date: Date) => {
    try {
      const d = date instanceof Date ? date : new Date(date)
      return formatDistanceToNow(d, { addSuffix: true, locale: it })
    } catch {
      return ''
    }
  }
  
  const isLongMessage = review.message.length > 200
  const displayMessage = expanded || !isLongMessage 
    ? review.message 
    : review.message.slice(0, 200) + '...'
  
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      {/* Header */}
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
      
      {/* Message */}
      <p className="text-gray-700 text-sm leading-relaxed">
        {displayMessage}
      </p>
      
      {isLongMessage && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-primary-500 text-sm mt-2 flex items-center gap-1 hover:underline"
        >
          {expanded ? (
            <>
              Mostra meno <ChevronUp size={14} />
            </>
          ) : (
            <>
              Leggi tutto <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
      
      {/* Coach Response */}
      {showCoachResponse && review.coachResponse && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={14} className="text-primary-500" />
            <span className="text-xs font-medium text-primary-600">Risposta del coach</span>
          </div>
          <p className="text-gray-600 text-sm bg-gray-50 rounded-lg p-3">
            {review.coachResponse}
          </p>
        </div>
      )}
    </div>
  )
}
