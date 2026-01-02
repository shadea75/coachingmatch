'use client'

import { useState } from 'react'
import { LifeAreaId } from '@/types'
import { getScoreDescription, getScoreLabel } from '@/lib/areaDescriptions'

interface ScoreSelectorProps {
  value?: number
  onChange: (score: number) => void
  color: string
  areaId: LifeAreaId
}

export default function ScoreSelector({ value, onChange, color, areaId }: ScoreSelectorProps) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null)
  
  const displayScore = hoveredScore ?? value
  const description = displayScore ? getScoreDescription(areaId, displayScore) : ''
  const label = displayScore ? getScoreLabel(displayScore) : ''
  
  const handleClick = (score: number) => {
    onChange(score)
  }
  
  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Score display */}
      <div className="text-center mb-8 min-h-[180px] flex flex-col justify-center">
        {displayScore ? (
          <div className="space-y-3">
            <div 
              className="text-7xl font-display font-bold transition-colors duration-200"
              style={{ color }}
            >
              {displayScore}
            </div>
            <div 
              className="text-xl font-semibold"
              style={{ color }}
            >
              {label}
            </div>
            <div className="text-sm text-gray-600 max-w-md mx-auto px-4 leading-relaxed">
              {description}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-lg">
            Seleziona un punteggio da 1 a 10
          </div>
        )}
      </div>
      
      {/* Score buttons */}
      <div className="flex justify-center gap-2 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
          const isSelected = value === score
          const isHovered = hoveredScore === score
          
          return (
            <button
              key={score}
              type="button"
              onClick={() => handleClick(score)}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              className={`
                w-12 h-12 rounded-full text-lg font-semibold
                transition-all duration-200 ease-out
                transform hover:scale-110 active:scale-95
                ${isSelected 
                  ? 'text-white shadow-lg' 
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }
              `}
              style={{
                backgroundColor: isSelected ? color : undefined,
                borderColor: isHovered && !isSelected ? color : undefined,
              }}
            >
              {score}
            </button>
          )
        })}
      </div>
      
      {/* Scale labels */}
      <div className="flex justify-between mt-4 text-sm text-gray-400 px-2">
        <span>Critico</span>
        <span>Eccellente</span>
      </div>
    </div>
  )
}
