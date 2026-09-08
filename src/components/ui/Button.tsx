import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variantStyles = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm',
      secondary: 'bg-gray-800 text-gray-100 hover:bg-gray-700 shadow-sm',
      ghost: 'bg-transparent hover:bg-gray-800 text-gray-300',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
      success: 'bg-green-500 text-white hover:bg-green-600 shadow-sm',
    }

    const sizeStyles = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current" />
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button