'use client'

import { useEffect, useRef } from 'react'
import { LIFE_AREAS, LifeAreaId } from '@/types'

interface RadarChartProps {
  scores: Partial<Record<LifeAreaId, number>>
  size?: number
  animated?: boolean
  showLabels?: boolean
}

export default function RadarChart({ 
  scores, 
  size = 300, 
  animated = true,
  showLabels = true 
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const centerX = size / 2
    const centerY = size / 2
    const radius = (size / 2) - 40
    const areas = LIFE_AREAS
    const numAreas = areas.length
    const angleStep = (Math.PI * 2) / numAreas
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size)
    
    // Draw background circles
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    // Draw axes
    areas.forEach((_, index) => {
      const angle = angleStep * index - Math.PI / 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#E5E7EB'
      ctx.stroke()
    })
    
    // Draw data polygon
    ctx.beginPath()
    areas.forEach((area, index) => {
      const score = scores[area.id] || 0
      const angle = angleStep * index - Math.PI / 2
      const distance = (score / 10) * radius
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()
    
    // Fill with gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'rgba(236, 119, 17, 0.3)')
    gradient.addColorStop(1, 'rgba(236, 119, 17, 0.1)')
    ctx.fillStyle = gradient
    ctx.fill()
    
    // Stroke
    ctx.strokeStyle = '#EC7711'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw data points
    areas.forEach((area, index) => {
      const score = scores[area.id] || 0
      const angle = angleStep * index - Math.PI / 2
      const distance = (score / 10) * radius
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = area.color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    })
    
    // Draw labels
    if (showLabels) {
      ctx.font = '12px system-ui'
      ctx.fillStyle = '#374151'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      areas.forEach((area, index) => {
        const angle = angleStep * index - Math.PI / 2
        const labelRadius = radius + 25
        const x = centerX + Math.cos(angle) * labelRadius
        const y = centerY + Math.sin(angle) * labelRadius
        
        // Adjust text alignment based on position
        if (Math.abs(x - centerX) < 10) {
          ctx.textAlign = 'center'
        } else if (x < centerX) {
          ctx.textAlign = 'right'
        } else {
          ctx.textAlign = 'left'
        }
        
        // Shorten labels
        const shortLabel = area.label.split(' ')[0]
        ctx.fillText(shortLabel, x, y)
      })
    }
    
  }, [scores, size, showLabels])
  
  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        width={size} 
        height={size}
        className={animated ? 'animate-scale-in' : ''}
      />
    </div>
  )
}
