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

  // Bold, prominent heights matching Vocaburn
  const heightClasses = {
    xs: 'h-7 sm:h-8',             // 28px - 32px
    sm: 'h-8 sm:h-9',             // 32px - 36px
    md: 'h-[40px] sm:h-[44px]',    // 40px - 44px (large, bold, prominent text)
    lg: 'h-12 sm:h-14',           // 48px - 56px
    xl: 'h-16 sm:h-20'            // 64px - 80px
  }[height] || 'h-[40px] sm:h-[44px]'

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
