import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { useTheme } from '@/hooks/useTheme'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, hover = true, padding = 'md', ...props }, ref) => {
    const { theme } = useTheme()
    
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'glass-card',
          hover && 'glass-card-hover',
          paddingStyles[padding],
          'transition-all duration-500',
          theme === 'light' && 'shadow-glass-light',
          className
        )}
        {...props}
      >
        {/* Subtle inner highlight */}
        <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
