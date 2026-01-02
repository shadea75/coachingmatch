'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  showValue?: boolean
}

export default function StarRating({ 
  rating, 
  onRatingChange, 
  size = 'md',
  readonly = false,
  showValue = false
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)
  
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32
  }
  
  const starSize = sizes[size]
  
  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value)
    }
  }
  
  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHoverRating(value)
    }
  }
  
  const handleMouseLeave = () => {
    setHoverRating(0)
  }
  
  const displayRating = hoverRating || rating
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleClick(value)}
          onMouseEnter={() => handleMouseEnter(value)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`transition-transform ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
        >
          <Star
            size={starSize}
            className={`transition-colors ${
              value <= displayRating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-2 text-sm font-medium text-gray-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
