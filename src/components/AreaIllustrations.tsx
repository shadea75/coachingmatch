'use client'

// Illustrazioni stile giapponese per le aree della vita
// Stile: minimalista, linee morbide, colori pastello con accenti

interface AreaIllustrationProps {
  size?: number
  className?: string
}

// CARRIERA - Daruma (bambola portafortuna giapponese per obiettivi)
export const CareerIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo cerchio */}
    <circle cx="60" cy="60" r="55" fill="#FFF7ED" />
    
    {/* Daruma body */}
    <ellipse cx="60" cy="65" rx="32" ry="35" fill="#EC7711" />
    <ellipse cx="60" cy="65" rx="32" ry="35" fill="url(#careerGrad)" />
    
    {/* Face area */}
    <ellipse cx="60" cy="55" rx="22" ry="20" fill="#FEF3C7" />
    
    {/* Eyes */}
    <circle cx="52" cy="52" r="6" fill="#1F2937" />
    <circle cx="68" cy="52" r="6" fill="#1F2937" />
    <circle cx="54" cy="50" r="2" fill="white" />
    <circle cx="70" cy="50" r="2" fill="white" />
    
    {/* Eyebrows - determined look */}
    <path d="M44 44 L54 46" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M66 46 L76 44" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Nose */}
    <ellipse cx="60" cy="58" rx="2" ry="1.5" fill="#F59E0B" />
    
    {/* Mouth - confident smile */}
    <path d="M54 65 Q60 70 66 65" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" fill="none" />
    
    {/* Decorative patterns on body */}
    <circle cx="45" cy="80" r="4" fill="#FCD34D" opacity="0.6" />
    <circle cx="75" cy="80" r="4" fill="#FCD34D" opacity="0.6" />
    
    {/* Star decoration */}
    <path d="M60 85 L62 90 L67 90 L63 93 L65 98 L60 95 L55 98 L57 93 L53 90 L58 90 Z" fill="#FCD34D" />
    
    <defs>
      <linearGradient id="careerGrad" x1="60" y1="30" x2="60" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F97316" />
        <stop offset="1" stopColor="#EA580C" />
      </linearGradient>
    </defs>
  </svg>
)

// FINANZE - Maneki Neko (gatto portafortuna)
export const FinancesIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo */}
    <circle cx="60" cy="60" r="55" fill="#ECFDF5" />
    
    {/* Body */}
    <ellipse cx="60" cy="72" rx="28" ry="30" fill="#FEFCE8" />
    <ellipse cx="60" cy="72" rx="28" ry="30" stroke="#F59E0B" strokeWidth="1.5" />
    
    {/* Head */}
    <circle cx="60" cy="42" r="24" fill="#FEFCE8" />
    <circle cx="60" cy="42" r="24" stroke="#F59E0B" strokeWidth="1.5" />
    
    {/* Ears */}
    <path d="M38 28 L42 42 L50 35 Z" fill="#FEFCE8" stroke="#F59E0B" strokeWidth="1.5" />
    <path d="M82 28 L78 42 L70 35 Z" fill="#FEFCE8" stroke="#F59E0B" strokeWidth="1.5" />
    <path d="M40 30 L43 40 L48 35 Z" fill="#FBBF24" opacity="0.4" />
    <path d="M80 30 L77 40 L72 35 Z" fill="#FBBF24" opacity="0.4" />
    
    {/* Face */}
    <ellipse cx="50" cy="40" rx="4" ry="5" fill="#1F2937" />
    <ellipse cx="70" cy="40" rx="4" ry="5" fill="#1F2937" />
    <circle cx="51" cy="38" r="1.5" fill="white" />
    <circle cx="71" cy="38" r="1.5" fill="white" />
    
    {/* Nose */}
    <ellipse cx="60" cy="48" rx="3" ry="2" fill="#FDA4AF" />
    
    {/* Whiskers */}
    <path d="M35 45 L48 47" stroke="#D1D5DB" strokeWidth="1" strokeLinecap="round" />
    <path d="M35 50 L48 50" stroke="#D1D5DB" strokeWidth="1" strokeLinecap="round" />
    <path d="M72 47 L85 45" stroke="#D1D5DB" strokeWidth="1" strokeLinecap="round" />
    <path d="M72 50 L85 50" stroke="#D1D5DB" strokeWidth="1" strokeLinecap="round" />
    
    {/* Mouth */}
    <path d="M55 52 Q60 56 65 52" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    
    {/* Raised paw */}
    <ellipse cx="85" cy="55" rx="8" ry="12" fill="#FEFCE8" stroke="#F59E0B" strokeWidth="1.5" />
    <path d="M82 50 L82 48 M85 49 L85 47 M88 50 L88 48" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
    
    {/* Coin */}
    <circle cx="85" cy="38" r="10" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1.5" />
    <text x="85" y="42" textAnchor="middle" fontSize="10" fill="#92400E" fontWeight="bold">¥</text>
    
    {/* Collar with bell */}
    <path d="M40 58 Q60 65 80 58" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="60" cy="65" r="5" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1" />
    
    {/* Belly decoration */}
    <circle cx="60" cy="80" r="8" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1" />
    <text x="60" y="84" textAnchor="middle" fontSize="10" fill="#F59E0B" fontWeight="bold">福</text>
  </svg>
)

// SALUTE - Onsen/Hot spring steam
export const HealthIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo */}
    <circle cx="60" cy="60" r="55" fill="#FDF2F8" />
    
    {/* Hot spring pool */}
    <ellipse cx="60" cy="85" rx="40" ry="15" fill="#93C5FD" />
    <ellipse cx="60" cy="85" rx="40" ry="15" fill="url(#healthGrad)" />
    
    {/* Rocks */}
    <ellipse cx="30" cy="80" rx="12" ry="10" fill="#9CA3AF" />
    <ellipse cx="90" cy="80" rx="12" ry="10" fill="#9CA3AF" />
    <ellipse cx="25" cy="75" rx="8" ry="6" fill="#D1D5DB" />
    <ellipse cx="95" cy="75" rx="8" ry="6" fill="#D1D5DB" />
    
    {/* Character in onsen */}
    <circle cx="60" cy="75" r="18" fill="#FEF3C7" />
    
    {/* Towel on head */}
    <rect x="45" y="52" width="30" height="8" rx="2" fill="#FECACA" />
    <path d="M48 52 L48 48 Q60 44 72 48 L72 52" fill="#FECACA" />
    
    {/* Face - relaxed */}
    <path d="M52 70 Q54 68 56 70" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M64 70 Q66 68 68 70" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" fill="none" />
    
    {/* Blush */}
    <ellipse cx="48" cy="76" rx="4" ry="2" fill="#FDA4AF" opacity="0.6" />
    <ellipse cx="72" cy="76" rx="4" ry="2" fill="#FDA4AF" opacity="0.6" />
    
    {/* Content smile */}
    <path d="M55 80 Q60 84 65 80" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" fill="none" />
    
    {/* Steam */}
    <path d="M40 50 Q38 40 42 30" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
    <path d="M50 45 Q48 35 52 25" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M70 45 Q72 35 68 25" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M80 50 Q82 40 78 30" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
    
    <defs>
      <linearGradient id="healthGrad" x1="60" y1="70" x2="60" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#BFDBFE" stopOpacity="0.8" />
        <stop offset="1" stopColor="#60A5FA" stopOpacity="0.6" />
      </linearGradient>
    </defs>
  </svg>
)

// AMORE - Due Kokeshi (bambole giapponesi) - Coppia
export const LoveIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo */}
    <circle cx="60" cy="60" r="55" fill="#FEF2F2" />
    
    {/* Heart background */}
    <path d="M60 95 C20 65 20 35 45 30 C55 28 60 40 60 40 C60 40 65 28 75 30 C100 35 100 65 60 95" fill="#FECACA" opacity="0.4" />
    
    {/* Left Kokeshi */}
    <ellipse cx="42" cy="75" rx="12" ry="22" fill="#F472B6" />
    <circle cx="42" cy="45" r="14" fill="#FEF3C7" />
    
    {/* Left face */}
    <circle cx="38" cy="43" r="2" fill="#1F2937" />
    <circle cx="46" cy="43" r="2" fill="#1F2937" />
    <circle cx="38.5" cy="42" r="0.8" fill="white" />
    <circle cx="46.5" cy="42" r="0.8" fill="white" />
    <ellipse cx="36" cy="48" rx="2.5" ry="1.5" fill="#FDA4AF" opacity="0.6" />
    <ellipse cx="48" cy="48" rx="2.5" ry="1.5" fill="#FDA4AF" opacity="0.6" />
    <path d="M39 51 Q42 53 45 51" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    
    {/* Left hair */}
    <path d="M28 45 Q28 30 42 28 Q56 30 56 45" fill="#1F2937" />
    <ellipse cx="42" cy="32" rx="6" ry="3" fill="#1F2937" />
    
    {/* Left flower decoration */}
    <circle cx="52" cy="35" r="4" fill="#FCD34D" />
    <circle cx="52" cy="35" r="2" fill="#F59E0B" />
    
    {/* Left kimono pattern */}
    <circle cx="38" cy="70" r="2" fill="#FCD34D" />
    <circle cx="46" cy="78" r="2" fill="#FCD34D" />
    <circle cx="40" cy="85" r="2" fill="#FCD34D" />
    
    {/* Right Kokeshi */}
    <ellipse cx="78" cy="75" rx="12" ry="22" fill="#60A5FA" />
    <circle cx="78" cy="45" r="14" fill="#FEF3C7" />
    
    {/* Right face */}
    <circle cx="74" cy="43" r="2" fill="#1F2937" />
    <circle cx="82" cy="43" r="2" fill="#1F2937" />
    <circle cx="74.5" cy="42" r="0.8" fill="white" />
    <circle cx="82.5" cy="42" r="0.8" fill="white" />
    <ellipse cx="72" cy="48" rx="2.5" ry="1.5" fill="#FDA4AF" opacity="0.6" />
    <ellipse cx="84" cy="48" rx="2.5" ry="1.5" fill="#FDA4AF" opacity="0.6" />
    <path d="M75 51 Q78 53 81 51" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    
    {/* Right hair */}
    <path d="M64 45 Q64 30 78 28 Q92 30 92 45" fill="#1F2937" />
    <ellipse cx="78" cy="32" rx="6" ry="3" fill="#1F2937" />
    
    {/* Right flower decoration */}
    <circle cx="68" cy="35" r="4" fill="#F472B6" />
    <circle cx="68" cy="35" r="2" fill="#EC4899" />
    
    {/* Right kimono pattern */}
    <circle cx="74" cy="70" r="2" fill="white" opacity="0.6" />
    <circle cx="82" cy="78" r="2" fill="white" opacity="0.6" />
    <circle cx="76" cy="85" r="2" fill="white" opacity="0.6" />
    
    {/* Small hearts between them */}
    <path d="M60 55 C58 52 55 52 55 55 C55 58 60 62 60 62 C60 62 65 58 65 55 C65 52 62 52 60 55" fill="#EF4444" />
  </svg>
)

// RELAZIONI/AMICIZIE - Hanami (picnic sotto i ciliegi)
export const RelationshipsIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo cielo primaverile */}
    <circle cx="60" cy="60" r="55" fill="#FDF2F8" />
    
    {/* Sakura tree trunk */}
    <path d="M85 110 Q88 85 82 65" stroke="#92400E" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M82 75 Q75 65 65 60" stroke="#92400E" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M84 85 Q95 75 100 70" stroke="#92400E" strokeWidth="3" strokeLinecap="round" fill="none" />
    
    {/* Cherry blossom clouds */}
    <ellipse cx="70" cy="45" rx="25" ry="18" fill="#FBCFE8" />
    <ellipse cx="55" cy="35" rx="18" ry="14" fill="#F9A8D4" />
    <ellipse cx="85" cy="38" rx="15" ry="12" fill="#FBCFE8" />
    <ellipse cx="95" cy="55" rx="12" ry="10" fill="#F9A8D4" />
    <ellipse cx="60" cy="50" rx="12" ry="10" fill="#FDF2F8" />
    
    {/* Falling petals */}
    <ellipse cx="25" cy="30" rx="3" ry="2" fill="#FBCFE8" transform="rotate(-20 25 30)" />
    <ellipse cx="40" cy="45" rx="2" ry="1.5" fill="#F9A8D4" transform="rotate(15 40 45)" />
    <ellipse cx="15" cy="55" rx="2.5" ry="1.5" fill="#FBCFE8" transform="rotate(-10 15 55)" />
    <ellipse cx="30" cy="70" rx="2" ry="1.5" fill="#F9A8D4" transform="rotate(25 30 70)" />
    <ellipse cx="50" cy="25" rx="2" ry="1.5" fill="#FBCFE8" transform="rotate(-15 50 25)" />
    
    {/* Picnic blanket */}
    <ellipse cx="40" cy="95" rx="35" ry="12" fill="#60A5FA" />
    <ellipse cx="40" cy="95" rx="35" ry="12" fill="url(#blanketPattern)" />
    
    {/* Friend 1 - left */}
    <circle cx="22" cy="75" r="10" fill="#FEF3C7" />
    <ellipse cx="22" cy="90" rx="8" ry="12" fill="#34D399" />
    {/* Face */}
    <circle cx="19" cy="73" r="1.5" fill="#1F2937" />
    <circle cx="25" cy="73" r="1.5" fill="#1F2937" />
    <path d="M19 78 Q22 81 25 78" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="17" cy="76" rx="2" ry="1" fill="#FDA4AF" opacity="0.5" />
    <ellipse cx="27" cy="76" rx="2" ry="1" fill="#FDA4AF" opacity="0.5" />
    {/* Hair */}
    <path d="M12 72 Q12 62 22 60 Q32 62 32 72" fill="#1F2937" />
    
    {/* Friend 2 - center */}
    <circle cx="40" cy="72" r="11" fill="#FEF3C7" />
    <ellipse cx="40" cy="88" rx="9" ry="13" fill="#F472B6" />
    {/* Face */}
    <circle cx="36" cy="70" r="1.5" fill="#1F2937" />
    <circle cx="44" cy="70" r="1.5" fill="#1F2937" />
    <path d="M36 76 Q40 79 44 76" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="34" cy="73" rx="2" ry="1" fill="#FDA4AF" opacity="0.5" />
    <ellipse cx="46" cy="73" rx="2" ry="1" fill="#FDA4AF" opacity="0.5" />
    {/* Hair with bun */}
    <path d="M29 70 Q29 58 40 56 Q51 58 51 70" fill="#4B5563" />
    <circle cx="40" cy="56" r="5" fill="#4B5563" />
    <circle cx="47" cy="58" r="3" fill="#FCD34D" />
    
    {/* Friend 3 - right */}
    <circle cx="58" cy="75" r="10" fill="#FEF3C7" />
    <ellipse cx="58" cy="90" rx="8" ry="12" fill="#A78BFA" />
    {/* Face */}
    <circle cx="55" cy="73" r="1.5" fill="#1F2937" />
    <circle cx="61" cy="73" r="1.5" fill="#1F2937" />
    <path d="M55 78 Q58 81 61 78" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="53" cy="76" rx="2" ry="1" fill="#FDA4AF" opacity="0.5" />
    <ellipse cx="63" cy="76" rx="2" ry="1" fill="#FDA4AF" opacity="0.5" />
    {/* Hair */}
    <path d="M48 75 Q48 63 58 61 Q68 63 68 75" fill="#92400E" />
    
    {/* Bento boxes and drinks */}
    <rect x="28" y="98" width="8" height="5" rx="1" fill="#EF4444" />
    <rect x="29" y="99" width="6" height="3" rx="0.5" fill="#FEF3C7" />
    <rect x="45" y="97" width="6" height="6" rx="1" fill="#1F2937" />
    
    {/* Tea cups */}
    <ellipse cx="18" cy="95" rx="3" ry="2" fill="#FEF3C7" stroke="#D1D5DB" strokeWidth="0.5" />
    <ellipse cx="62" cy="96" rx="3" ry="2" fill="#FEF3C7" stroke="#D1D5DB" strokeWidth="0.5" />
    
    {/* Small flowers on ground */}
    <circle cx="8" cy="100" r="2" fill="#FBCFE8" />
    <circle cx="8" cy="100" r="1" fill="#F9A8D4" />
    <circle cx="72" cy="102" r="2" fill="#FBCFE8" />
    <circle cx="72" cy="102" r="1" fill="#F9A8D4" />
    
    <defs>
      <pattern id="blanketPattern" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#60A5FA" />
        <rect x="0" y="0" width="5" height="5" fill="#3B82F6" opacity="0.3" />
        <rect x="5" y="5" width="5" height="5" fill="#3B82F6" opacity="0.3" />
      </pattern>
    </defs>
  </svg>
)

// CRESCITA PERSONALE - Bonsai
export const PersonalGrowthIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo */}
    <circle cx="60" cy="60" r="55" fill="#F0FDF4" />
    
    {/* Pot */}
    <path d="M40 95 L45 105 L75 105 L80 95 Z" fill="#B45309" />
    <rect x="38" y="90" width="44" height="8" rx="2" fill="#D97706" />
    <rect x="40" y="90" width="40" height="3" rx="1" fill="#F59E0B" opacity="0.4" />
    
    {/* Trunk */}
    <path d="M58 90 Q55 80 52 70 Q50 60 55 50" stroke="#92400E" strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M62 90 Q65 82 68 75" stroke="#92400E" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M55 65 Q45 60 40 55" stroke="#92400E" strokeWidth="3" strokeLinecap="round" fill="none" />
    
    {/* Foliage clouds */}
    <ellipse cx="55" cy="40" rx="18" ry="14" fill="#22C55E" />
    <ellipse cx="45" cy="48" rx="12" ry="10" fill="#22C55E" />
    <ellipse cx="68" cy="45" rx="10" ry="8" fill="#22C55E" />
    <ellipse cx="38" cy="52" rx="10" ry="8" fill="#16A34A" />
    <ellipse cx="70" cy="70" rx="12" ry="10" fill="#22C55E" />
    
    {/* Lighter foliage highlights */}
    <ellipse cx="50" cy="35" rx="8" ry="6" fill="#4ADE80" opacity="0.6" />
    <ellipse cx="65" cy="42" rx="6" ry="5" fill="#4ADE80" opacity="0.6" />
    <ellipse cx="68" cy="66" rx="5" ry="4" fill="#4ADE80" opacity="0.6" />
    
    {/* Small flowers */}
    <circle cx="42" cy="38" r="3" fill="#FCD34D" />
    <circle cx="42" cy="38" r="1.5" fill="#F59E0B" />
    <circle cx="62" cy="35" r="3" fill="#F472B6" />
    <circle cx="62" cy="35" r="1.5" fill="#EC4899" />
    <circle cx="72" cy="65" r="3" fill="#FCD34D" />
    <circle cx="72" cy="65" r="1.5" fill="#F59E0B" />
    
    {/* Sparkles for growth */}
    <path d="M25 30 L27 35 L32 35 L28 38 L30 43 L25 40 L20 43 L22 38 L18 35 L23 35 Z" fill="#FCD34D" opacity="0.8" />
    <path d="M90 45 L91 48 L94 48 L92 50 L93 53 L90 51 L87 53 L88 50 L86 48 L89 48 Z" fill="#FCD34D" opacity="0.6" />
  </svg>
)

// DIVERTIMENTO - Matsuri (festival) con fuochi d'artificio
export const FunIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo - night sky */}
    <circle cx="60" cy="60" r="55" fill="#1E1B4B" />
    
    {/* Fireworks */}
    {/* Big firework center */}
    <circle cx="60" cy="40" r="4" fill="#FCD34D" />
    <path d="M60 40 L60 20" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 40 L75 30" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 40 L45 30" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 40 L70 50" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 40 L50 50" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 40 L80 40" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 40 L40 40" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
    
    {/* Sparkle dots */}
    <circle cx="60" cy="18" r="2" fill="#FCD34D" />
    <circle cx="77" cy="28" r="2" fill="#F472B6" />
    <circle cx="43" cy="28" r="2" fill="#F472B6" />
    <circle cx="72" cy="52" r="2" fill="#60A5FA" />
    <circle cx="48" cy="52" r="2" fill="#60A5FA" />
    <circle cx="82" cy="40" r="2" fill="#4ADE80" />
    <circle cx="38" cy="40" r="2" fill="#4ADE80" />
    
    {/* Small firework left */}
    <circle cx="25" cy="35" r="2" fill="#F472B6" />
    <path d="M25 35 L25 25 M25 35 L32 30 M25 35 L18 30 M25 35 L30 40 M25 35 L20 40" stroke="#F472B6" strokeWidth="1.5" strokeLinecap="round" />
    
    {/* Small firework right */}
    <circle cx="95" cy="30" r="2" fill="#4ADE80" />
    <path d="M95 30 L95 22 M95 30 L100 25 M95 30 L90 25 M95 30 L100 35 M95 30 L90 35" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" />
    
    {/* Lanterns */}
    <ellipse cx="35" cy="80" rx="10" ry="12" fill="#EF4444" />
    <rect x="32" y="68" width="6" height="3" fill="#FCD34D" />
    <path d="M35 92 L35 98" stroke="#EF4444" strokeWidth="1" />
    <ellipse cx="35" cy="80" rx="8" ry="10" fill="#FCA5A5" opacity="0.3" />
    
    <ellipse cx="85" cy="80" rx="10" ry="12" fill="#EF4444" />
    <rect x="82" y="68" width="6" height="3" fill="#FCD34D" />
    <path d="M85 92 L85 98" stroke="#EF4444" strokeWidth="1" />
    <ellipse cx="85" cy="80" rx="8" ry="10" fill="#FCA5A5" opacity="0.3" />
    
    {/* Center character - festival goer */}
    <circle cx="60" cy="85" r="12" fill="#FEF3C7" />
    <circle cx="56" cy="83" r="2" fill="#1F2937" />
    <circle cx="64" cy="83" r="2" fill="#1F2937" />
    <path d="M56 90 Q60 93 64 90" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    
    {/* Hachimaki (headband) */}
    <rect x="48" y="75" width="24" height="4" rx="1" fill="#EF4444" />
    <circle cx="68" cy="77" r="3" fill="#EF4444" />
    
    {/* Stars */}
    <circle cx="20" cy="20" r="1" fill="white" />
    <circle cx="100" cy="15" r="1" fill="white" />
    <circle cx="15" cy="55" r="1" fill="white" />
    <circle cx="105" cy="60" r="1" fill="white" />
  </svg>
)

// SPIRITUALITÀ - Buddha/Meditazione con fiori di loto
export const SpiritualityIllustration = ({ size = 120, className = '' }: AreaIllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
    {/* Sfondo - gradient circle */}
    <circle cx="60" cy="60" r="55" fill="url(#spiritBg)" />
    
    {/* Mandala pattern background */}
    <circle cx="60" cy="60" r="45" fill="none" stroke="#C4B5FD" strokeWidth="1" opacity="0.4" />
    <circle cx="60" cy="60" r="38" fill="none" stroke="#C4B5FD" strokeWidth="1" opacity="0.3" />
    
    {/* Lotus petals */}
    <ellipse cx="40" cy="95" rx="12" ry="8" fill="#F9A8D4" />
    <ellipse cx="60" cy="98" rx="12" ry="8" fill="#F472B6" />
    <ellipse cx="80" cy="95" rx="12" ry="8" fill="#F9A8D4" />
    <ellipse cx="50" cy="92" rx="10" ry="7" fill="#FBCFE8" />
    <ellipse cx="70" cy="92" rx="10" ry="7" fill="#FBCFE8" />
    <ellipse cx="60" cy="90" rx="8" ry="6" fill="#FDF2F8" />
    
    {/* Meditating figure */}
    <ellipse cx="60" cy="75" rx="18" ry="12" fill="#FCD34D" /> {/* Robe bottom */}
    <ellipse cx="60" cy="60" rx="14" ry="16" fill="#FBBF24" /> {/* Robe body */}
    
    {/* Head */}
    <circle cx="60" cy="40" r="14" fill="#FEF3C7" />
    
    {/* Hair/head bump */}
    <ellipse cx="60" cy="28" rx="6" ry="5" fill="#4B5563" />
    <circle cx="60" cy="29" r="4" fill="#4B5563" />
    
    {/* Closed eyes - peaceful */}
    <path d="M52 40 Q55 42 58 40" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M62 40 Q65 42 68 40" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    
    {/* Serene smile */}
    <path d="M55 48 Q60 51 65 48" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    
    {/* Hands in meditation pose */}
    <ellipse cx="60" cy="72" rx="8" ry="5" fill="#FEF3C7" />
    
    {/* Glow/aura */}
    <circle cx="60" cy="50" r="30" fill="none" stroke="#FCD34D" strokeWidth="2" opacity="0.3" />
    <circle cx="60" cy="50" r="35" fill="none" stroke="#FCD34D" strokeWidth="1" opacity="0.2" />
    
    {/* Floating particles */}
    <circle cx="30" cy="40" r="2" fill="#C4B5FD" opacity="0.6" />
    <circle cx="90" cy="45" r="2" fill="#C4B5FD" opacity="0.6" />
    <circle cx="25" cy="70" r="1.5" fill="#FCD34D" opacity="0.5" />
    <circle cx="95" cy="65" r="1.5" fill="#FCD34D" opacity="0.5" />
    <circle cx="35" cy="25" r="1" fill="#F9A8D4" opacity="0.6" />
    <circle cx="85" cy="30" r="1" fill="#F9A8D4" opacity="0.6" />
    
    <defs>
      <linearGradient id="spiritBg" x1="60" y1="5" x2="60" y2="115" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EDE9FE" />
        <stop offset="1" stopColor="#DDD6FE" />
      </linearGradient>
    </defs>
  </svg>
)

// Mappa per usare le illustrazioni per ID area
export const AreaIllustrations: Record<string, React.FC<AreaIllustrationProps>> = {
  career: CareerIllustration,
  finances: FinancesIllustration,
  health: HealthIllustration,
  relationships: RelationshipsIllustration,  // Amicizie - Hanami
  love: LoveIllustration,                     // Amore - Kokeshi coppia
  personal_growth: PersonalGrowthIllustration,
  fun: FunIllustration,
  spirituality: SpiritualityIllustration
}

// Componente helper per ottenere illustrazione per area
export const getAreaIllustration = (areaId: string, size?: number, className?: string) => {
  const Illustration = AreaIllustrations[areaId]
  if (!Illustration) return null
  return <Illustration size={size} className={className} />
}

export default AreaIllustrations

