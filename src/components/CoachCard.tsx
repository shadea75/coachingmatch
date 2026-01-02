'use client'

import { motion } from 'framer-motion'
import { Star, Calendar, Video, MapPin, ChevronRight } from 'lucide-react'
import { Coach, LIFE_AREAS } from '@/types'

interface CoachCardProps {
  coach: Coach
  matchScore: number
  matchReasons: string[]
  onBook: () => void
  delay?: number
}

export default function CoachCard({ 
  coach, 
  matchScore, 
  matchReasons, 
  onBook,
  delay = 0
}: CoachCardProps) {
  const topAreas = coach.specializations.lifeAreas.slice(0, 3)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      {/* Header with photo */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-primary-100 to-primary-50" />
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-2xl bg-white shadow-md overflow-hidden border-4 border-white">
            {coach.photo ? (
              <img 
                src={coach.photo} 
                alt={coach.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {coach.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Match score badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium text-primary-600">
          {matchScore}% match
        </div>
      </div>
      
      {/* Content */}
      <div className="pt-14 px-6 pb-6">
        {/* Name and rating */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-semibold text-charcoal">{coach.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={16} fill="currentColor" />
                <span className="text-sm font-medium">{coach.rating.toFixed(1)}</span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{coach.reviewCount} recensioni</span>
            </div>
          </div>
        </div>
        
        {/* Specializations */}
        <div className="flex flex-wrap gap-2 mb-4">
          {topAreas.map(areaId => {
            const area = LIFE_AREAS.find(a => a.id === areaId)
            if (!area) return null
            
            return (
              <span
                key={areaId}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${area.color}15`,
                  color: area.color 
                }}
              >
                {area.label.split(' ')[0]}
              </span>
            )
          })}
        </div>
        
        {/* Bio excerpt */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {coach.bio}
        </p>
        
        {/* Match reasons */}
        <div className="bg-cream rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-charcoal mb-2">
            Perché è adatto a te:
          </p>
          <ul className="space-y-1">
            {matchReasons.slice(0, 2).map((reason, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Info row */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Video size={16} />
            <span>Online</span>
          </div>
          {coach.location && (
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              <span>{coach.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            <span>{coach.yearsOfExperience} anni exp.</span>
          </div>
        </div>
        
        {/* CTA Button */}
        <button
          onClick={onBook}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
        >
          Prenota call gratuita
          <ChevronRight size={18} />
        </button>
        
        {coach.freeCallAvailable && (
          <p className="text-center text-xs text-gray-400 mt-2">
            Prima call di orientamento gratuita • 30 min
          </p>
        )}
      </div>
    </motion.div>
  )
}
