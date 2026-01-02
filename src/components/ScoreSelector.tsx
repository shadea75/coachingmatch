'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ScoreSelectorProps {
  value?: number
  onChange: (score: number) => void
  color: string
  areaLabel: string
}

export default function ScoreSelector({ value, onChange, color, areaLabel }: ScoreSelectorProps) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null)
  const [selectedScore, setSelectedScore] = useState<number | undefined>(value)
  
  useEffect(() => {
    setSelectedScore(value)
  }, [value])
  
  const getScoreLabel = (score: number): string => {
    if (score <= 2) return 'Critica'
    if (score <= 4) return 'Da migliorare'
    if (score <= 6) return 'Sufficiente'
    if (score <= 8) return 'Buona'
    return 'Eccellente'
  }
  
  const displayScore = hoveredScore ?? selectedScore
  
  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Score display */}
      <div className="text-center mb-8">
        <AnimatePresence mode="wait">
          {displayScore && (
            <motion.div
              key={displayScore}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-2"
            >
              <div 
                className="text-7xl font-display font-bold"
                style={{ color }}
              >
                {displayScore}
              </div>
              <div className="text-lg text-gray-500">
                {getScoreLabel(displayScore)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!displayScore && (
          <div className="text-gray-400 text-lg">
            Seleziona un punteggio
          </div>
        )}
      </div>
      
      {/* Score buttons */}
      <div className="flex justify-center gap-2 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
          const isSelected = selectedScore === score
          const isHovered = hoveredScore === score
          
          return (
            <motion.button
              key={score}
              onClick={() => {
                setSelectedScore(score)
                onChange(score)
              }}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-12 h-12 rounded-full text-lg font-semibold
                transition-all duration-200 ease-out
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
            </motion.button>
          )
        })}
      </div>
      
      {/* Scale labels */}
      <div className="flex justify-between mt-4 text-sm text-gray-400 px-2">
        <span>Molto bassa</span>
        <span>Molto alta</span>
      </div>
    </div>
  )
}
