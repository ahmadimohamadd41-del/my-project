import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 disabled:pointer-events-none disabled:opacity-50'

    const variantStyles = {
      primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 glow-primary',
      secondary: 'bg-navy-800/80 text-gray-100 hover:bg-navy-700 border border-navy-600/50 shadow-sm hover:border-primary-500/30',
      ghost: 'bg-transparent hover:bg-navy-800/60 text-gray-300 hover:text-primary-300',
      danger: 'bg-gradient-to-r from-error-500 to-error-600 text-white hover:from-error-400 hover:to-error-500 shadow-lg shadow-error-500/20',
      success: 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-400 hover:to-success-500 shadow-lg shadow-success-500/20',
    }

    const sizeStyles = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-13 px-7 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
