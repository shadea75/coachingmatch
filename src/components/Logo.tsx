'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' }
  }
  
  const { icon, text } = sizes[size]
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - Heart with spark */}
      <svg 
        width={icon} 
        height={icon} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background circle */}
        <circle cx="20" cy="20" r="20" fill="url(#gradient)" />
        
        {/* Heart shape */}
        <path 
          d="M20 28L12.5 20.5C10 18 10 14 12.5 12C15 10 18 11 20 14C22 11 25 10 27.5 12C30 14 30 18 27.5 20.5L20 28Z" 
          fill="white"
        />
        
        {/* Sparkle */}
        <path 
          d="M20 11L20.8 14.2L24 15L20.8 15.8L20 19L19.2 15.8L16 15L19.2 14.2Z" 
          fill="#EC7711"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#EC7711" />
            <stop offset="100%" stopColor="#D4650F" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Text */}
      {showText && (
        <span className={`font-semibold ${text}`}>
          <span className="text-charcoal">Coacha</span>
          <span className="text-primary-500 italic">Mi</span>
        </span>
      )}
    </div>
  )
}
