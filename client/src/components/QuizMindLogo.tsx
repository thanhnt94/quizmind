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

  // Balanced heights for modern navigation bars
  const heightClasses = {
    xs: 'h-6 sm:h-7',             // 24px - 28px
    sm: 'h-7 sm:h-8',             // 28px - 32px
    md: 'h-[36px] sm:h-[38px]',    // 36px - 38px
    lg: 'h-10 sm:h-11',           // 40px - 44px
    xl: 'h-14 sm:h-16 md:h-20'    // 56px - 80px
  }[height] || 'h-[36px] sm:h-[38px]'

  if (!isHorizontal) {
    return (
      <div className={cn("inline-flex items-center justify-center select-none group cursor-pointer", className)}>
        <div 
          className={cn(
            "relative flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95",
            heightClasses
          )}
          style={size ? { width: size, height: size } : undefined}
        >
          <img
            src={`${import.meta.env.BASE_URL || '/static/dist/'}mascot/owl_excited.png?v=20260917`}
            alt="QuizMind Mascot"
            className="w-full h-full object-contain drop-shadow-xs"
            onError={(e) => {
              const el = e.currentTarget
              if (!el.src.includes('/static/dist/')) {
                el.src = '/static/dist/mascot/owl_excited.png'
              }
            }}
          />
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
          src={`${import.meta.env.BASE_URL || '/static/dist/'}mascot/quizmind_logo_transparent.png?v=20260917`}
          alt="QuizMind"
          className="h-full w-auto max-w-none object-contain drop-shadow-xs"
          onError={(e) => {
            const el = e.currentTarget
            if (!el.src.includes('/static/dist/')) {
              el.src = '/static/dist/mascot/quizmind_logo_transparent.png'
            }
          }}
        />
      </div>
    </div>
  )
}

export default QuizMindLogo
