'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { LifeAreaId, OBJECTIVES_BY_AREA, LIFE_AREAS } from '@/types'

interface ObjectivesSelectorProps {
  area: LifeAreaId
  currentScore: number
  selectedObjectives: string[]
  onChange: (objectives: string[]) => void
}

export default function ObjectivesSelector({ 
  area, 
  currentScore,
  selectedObjectives,
  onChange 
}: ObjectivesSelectorProps) {
  const [selected, setSelected] = useState<string[]>(selectedObjectives)
  
  const objectives = OBJECTIVES_BY_AREA[area] || []
  const areaData = LIFE_AREAS.find(a => a.id === area)
  
  useEffect(() => {
    setSelected(selectedObjectives)
  }, [selectedObjectives])
  
  const toggleObjective = (objective: string) => {
    const newSelected = selected.includes(objective)
      ? selected.filter(o => o !== objective)
      : [...selected, objective]
    
    setSelected(newSelected)
    onChange(newSelected)
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
          style={{ 
            backgroundColor: `${areaData?.color}15`,
            color: areaData?.color 
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: areaData?.color }} />
          {areaData?.label}
        </div>
        
        <h2 className="text-2xl md:text-3xl font-display font-semibold text-charcoal mb-2">
          Cosa ti aiuterebbe a portare{' '}
          <span style={{ color: areaData?.color }}>{areaData?.label}</span>
          {' '}da {currentScore} a 10?
        </h2>
        <p className="text-gray-500">
          Seleziona tutti gli obiettivi che ti interessano
        </p>
      </div>
      
      {/* Objectives grid */}
      <div className="grid gap-3">
        {objectives.map((objective, index) => {
          const isSelected = selected.includes(objective)
          
          return (
            <motion.button
              key={objective}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleObjective(objective)}
              className={`
                w-full p-4 rounded-xl text-left
                transition-all duration-200 ease-out
                flex items-center gap-4
                ${isSelected 
                  ? 'bg-white shadow-md ring-2' 
                  : 'bg-white/50 hover:bg-white hover:shadow-sm'
                }
              `}
              style={
                isSelected ? { boxShadow: `0 0 0 2px ${areaData?.color}` } : undefined
              }
            >
              {/* Checkbox */}
              <div 
                className={`
                  w-6 h-6 rounded-lg flex items-center justify-center
                  transition-all duration-200
                  ${isSelected ? 'text-white' : 'border-2 border-gray-300'}
                `}
                style={{
                  backgroundColor: isSelected ? areaData?.color : undefined,
                }}
              >
                {isSelected && <Check size={16} strokeWidth={3} />}
              </div>
              
              {/* Text */}
              <span className={`text-base ${isSelected ? 'text-charcoal font-medium' : 'text-gray-600'}`}>
                {objective}
              </span>
            </motion.button>
          )
        })}
      </div>
      
      {/* Selection count */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center text-sm text-gray-500"
        >
          {selected.length} obiettiv{selected.length === 1 ? 'o' : 'i'} selezionat{selected.length === 1 ? 'o' : 'i'}
        </motion.div>
      )}
    </div>
  )
}
