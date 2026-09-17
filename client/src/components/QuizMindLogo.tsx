import { cn } from '@/lib/utils'

interface QuizMindLogoProps {
  className?: string
  mode?: 'horizontal' | 'icon'
  height?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  size?: number | string
  iconOnly?: boolean
}

export function QuizMindLogo({
  className,
  mode = 'horizontal',
  height = 'md',
  size,
  iconOnly = false
}: QuizMindLogoProps) {
  const isHorizontal = mode === 'horizontal' && !iconOnly

  // Compact, balanced & bold heights matching Vocaburn
  const heightClasses = {
    xs: 'h-6 sm:h-7',             // 24px - 28px (ultra compact)
    sm: 'h-7 sm:h-8',             // 28px - 32px (small)
    md: 'h-[38px] sm:h-[40px]',    // 38px - 40px (fills compact bar with big, readable letters)
    lg: 'h-11 sm:h-12',           // 44px - 48px
    xl: 'h-14 sm:h-16 md:h-20'    // 56px - 80px
  }[height] || 'h-[38px] sm:h-[40px]'

  if (!isHorizontal) {
    // 3D Typography "Q" Icon Badge with Golden Sparkle (Zero owl, pure text brand identity)
    return (
      <div className={cn("inline-flex items-center justify-center select-none group cursor-pointer", className)}>
        <div 
          className={cn(
            "relative flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95",
            heightClasses
          )}
          style={size ? { width: size, height: size } : undefined}
        >
          <svg viewBox="0 0 160 160" className="w-full h-full object-contain drop-shadow-sm overflow-visible">
            <defs>
              <filter id="q-icon-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.2" />
              </filter>
              <linearGradient id="q-icon-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C7D2FE" />
                <stop offset="25%" stopColor="#818CF8" />
                <stop offset="65%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#4338CA" />
              </linearGradient>
            </defs>
            <g filter="url(#q-icon-shadow)">
              <text x="80" y="125" textAnchor="middle" fontFamily="'Fredoka', 'Baloo 2', 'Arial Rounded MT Bold', sans-serif" fontWeight="900" fontSize="135" fill="#1E1B4B" stroke="#1E1B4B" strokeWidth="20" strokeLinejoin="round">Q</text>
              <text x="80" y="120" textAnchor="middle" fontFamily="'Fredoka', 'Baloo 2', 'Arial Rounded MT Bold', sans-serif" fontWeight="900" fontSize="135" fill="#312E81" stroke="#312E81" strokeWidth="14" strokeLinejoin="round">Q</text>
              <text x="80" y="116" textAnchor="middle" fontFamily="'Fredoka', 'Baloo 2', 'Arial Rounded MT Bold', sans-serif" fontWeight="900" fontSize="135" fill="url(#q-icon-grad)">Q</text>
              <ellipse cx="60" cy="55" rx="14" ry="6" transform="rotate(-30 60 55)" fill="#FFFFFF" opacity="0.85" />
              <g transform="translate(122, 38) scale(0.95)">
                <path d="M 0,-16 Q 2,-3 14,-1 Q 2,1 0,14 Q -2,1 -14,-1 Q -2,-3 0,-16 Z" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2" />
                <circle cx="0" cy="-1" r="2.5" fill="#FFFFFF" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("inline-flex items-center select-none group cursor-pointer", className)}>
      <div 
        className={cn(
          "relative flex items-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.02] active:scale-95",
          heightClasses
        )}
        style={size ? { height: size } : undefined}
      >
        <img
          src="/mascot/quizmind_logo_transparent.png?v=20260917_v3"
          alt="QuizMind"
          className="h-full w-auto max-w-none object-contain drop-shadow-xs"
          onError={(e) => {
            const el = e.currentTarget
            if (!el.src.includes('quizmind_logo.svg')) {
              el.src = '/mascot/quizmind_logo.svg'
            }
          }}
        />
      </div>
    </div>
  )
}

export default QuizMindLogo

