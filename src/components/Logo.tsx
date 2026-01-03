'use client'

import { useId } from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const gradientId = useId()
  
  const sizes = {
    sm: { icon: 28, text: 'text-lg' },
    md: { icon: 36, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' }
  }
  
  const { icon, text } = sizes[size]
  
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon - Heart with spark */}
      <svg 
        width={icon} 
        height={icon} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background rounded square */}
        <rect x="0" y="0" width="40" height="40" rx="10" fill={`url(#${gradientId})`} />
        
        {/* Heart shape */}
        <path 
          d="M20 29L11.5 20.5C8.5 17.5 8.5 13 11.5 10.5C14.5 8 18 9.5 20 13C22 9.5 25.5 8 28.5 10.5C31.5 13 31.5 17.5 28.5 20.5L20 29Z" 
          fill="white"
        />
        
        {/* Inner sparkle/star */}
        <path 
          d="M20 10L21 13.5L24.5 14.5L21 15.5L20 19L19 15.5L15.5 14.5L19 13.5Z" 
          fill="#EC7711"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#EC7711" />
            <stop offset="100%" stopColor="#D4650F" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Text */}
      {showText && (
        <span className={`font-bold ${text}`}>
          <span className="text-charcoal">Coacha</span>
          <span className="text-primary-500 italic">Mi</span>
        </span>
      )}
    </div>
  )
}
