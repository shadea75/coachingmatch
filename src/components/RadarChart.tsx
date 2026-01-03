'use client'

import { useEffect, useRef } from 'react'
import { LIFE_AREAS, LifeAreaId } from '@/types'

interface RadarChartProps {
  scores: Partial<Record<LifeAreaId, number>>
  size?: number
  animated?: boolean
  showLabels?: boolean
}

// Label completi per il radar chart
const SHORT_LABELS: Record<string, string> = {
  'salute': 'Salute',
  'finanze': 'Finanze',
  'carriera': 'Carriera',
  'relazioni': 'Relazioni',
  'amore': 'Amore',
  'crescita': 'Crescita',
  'spiritualita': 'Spiritualità',
  'divertimento': 'Divertimento',
}

export default function RadarChart({ 
  scores, 
  size = 480, // Ancora più grande per i label completi
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
    const radius = (size / 2) - 110 // Molto più padding per i label completi
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
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.fillStyle = '#374151'
      
      areas.forEach((area, index) => {
        const angle = angleStep * index - Math.PI / 2
        const labelRadius = radius + 70 // Molto più distante
        let x = centerX + Math.cos(angle) * labelRadius
        let y = centerY + Math.sin(angle) * labelRadius
        
        // Get short label
        const label = SHORT_LABELS[area.id] || area.label.split(' ')[0]
        
        // Adjust text alignment based on position
        const normalizedAngle = ((angle + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2)
        
        if (normalizedAngle < 0.3 || normalizedAngle > Math.PI * 2 - 0.3) {
          // Top
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
        } else if (normalizedAngle > Math.PI - 0.3 && normalizedAngle < Math.PI + 0.3) {
          // Bottom
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
        } else if (normalizedAngle < Math.PI) {
          // Right side
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
        } else {
          // Left side
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
        }
        
        ctx.fillText(label, x, y)
      })
    }
    
  }, [scores, size, showLabels])
  
  return (
    <div className="relative flex justify-center">
      <canvas 
        ref={canvasRef} 
        width={size} 
        height={size}
        className={animated ? 'animate-scale-in' : ''}
      />
    </div>
  )
}
