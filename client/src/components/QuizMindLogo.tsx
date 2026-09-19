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

  // Balanced heights for navigation headers & UI
  const heightClasses = {
    xs: 'h-6 sm:h-7',             // 24px - 28px
    sm: 'h-7 sm:h-8',             // 28px - 32px
    md: 'h-[32px] sm:h-[35px]',    // 32px - 35px
    lg: 'h-10 sm:h-11',           // 40px - 44px
    xl: 'h-14 sm:h-16'            // 56px - 64px
  }[height] || 'h-[32px] sm:h-[35px]'

  if (!isHorizontal) {
    // 3D Mascot "Q" App Icon
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
            src="/mascot/quizmind_q_icon.png?v=20260919b"
            alt="QuizMind"
            className="h-full w-full object-contain drop-shadow-xs"
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
          src="/mascot/quizmind_logo_transparent.png?v=20260919b"
          alt="QuizMind"
          className="h-full w-auto max-w-none object-contain drop-shadow-2xs"
        />
      </div>
    </div>
  )
}

export default QuizMindLogo


