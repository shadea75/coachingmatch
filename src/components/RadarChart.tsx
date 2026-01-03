'use client'

import { useEffect, useRef } from 'react'
import { LIFE_AREAS, LifeAreaId } from '@/types'

interface RadarChartProps {
  scores: Partial<Record<LifeAreaId, number>>
  size?: number
  animated?: boolean
  showLabels?: boolean
  compact?: boolean
}

// Label per il chart
const AREA_LABELS: Record<string, string> = {
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
  size = 400,
  animated = true,
  showLabels = true,
  compact = false
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const canvasSize = compact ? Math.min(size, 380) : size
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Setup per retina
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    canvas.style.width = `${canvasSize}px`
    canvas.style.height = `${canvasSize}px`
    ctx.scale(dpr, dpr)
    
    const centerX = canvasSize / 2
    const centerY = canvasSize / 2
    const maxRadius = (canvasSize / 2) - (compact ? 70 : 90) // Spazio per le label
    const areas = LIFE_AREAS
    const numAreas = areas.length
    const angleStep = (Math.PI * 2) / numAreas
    
    // Clear
    ctx.clearRect(0, 0, canvasSize, canvasSize)
    
    // Disegna cerchi guida (sfondo)
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, (maxRadius / 5) * i, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    // Disegna linee radiali
    areas.forEach((_, index) => {
      const angle = angleStep * index - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius,
        centerY + Math.sin(angle) * maxRadius
      )
      ctx.strokeStyle = '#E5E7EB'
      ctx.stroke()
    })
    
    // Disegna gli spicchi colorati (stile Risvelia)
    areas.forEach((area, index) => {
      const score = scores[area.id] || 0
      if (score === 0) return
      
      const startAngle = angleStep * index - Math.PI / 2 - angleStep / 2
      const endAngle = startAngle + angleStep
      const radius = (score / 10) * maxRadius
      
      // Disegna lo spicchio
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = area.color
      ctx.fill()
      
      // Bordo bianco tra spicchi
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Scrivi il punteggio dentro lo spicchio
      if (score > 0) {
        const midAngle = (startAngle + endAngle) / 2
        const textRadius = radius * 0.65
        const textX = centerX + Math.cos(midAngle) * textRadius
        const textY = centerY + Math.sin(midAngle) * textRadius
        
        ctx.font = `bold ${compact ? 14 : 16}px system-ui, sans-serif`
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Solo se c'è abbastanza spazio
        if (radius > 25) {
          ctx.fillText(score.toString(), textX, textY)
        }
      }
    })
    
    // Cerchio centrale (per coprire il punto centrale)
    ctx.beginPath()
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    ctx.stroke()
    
    // Disegna le label esterne
    if (showLabels) {
      const labelRadius = maxRadius + (compact ? 40 : 55)
      
      areas.forEach((area, index) => {
        const angle = angleStep * index - Math.PI / 2
        const x = centerX + Math.cos(angle) * labelRadius
        const y = centerY + Math.sin(angle) * labelRadius
        
        const label = AREA_LABELS[area.id] || area.label
        
        ctx.font = `600 ${compact ? 10 : 12}px system-ui, sans-serif`
        ctx.fillStyle = '#374151'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        ctx.fillText(label, x, y)
      })
    }
    
  }, [scores, canvasSize, showLabels, compact])
  
  return (
    <div className="relative flex justify-center items-center">
      <canvas 
        ref={canvasRef} 
        style={{ width: canvasSize, height: canvasSize }}
        className={animated ? 'animate-scale-in' : ''}
      />
    </div>
  )
}
