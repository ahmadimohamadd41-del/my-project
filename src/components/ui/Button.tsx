import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { useTheme } from '@/hooks/useTheme'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const baseStyles = 'relative inline-flex items-center justify-center rounded-2xl font-bold transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 overflow-hidden active:scale-[0.97]'

    const variantStyles = {
      primary: `
        bg-[linear-gradient(135deg,#6366F1_0%,#8B5CF6_50%,#06B6D4_100%)] bg-[length:200%_200%] text-white
        shadow-[0_4px_20px_rgba(99,102,241,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]
        hover:bg-[position:100%_0%] hover:shadow-[0_8px_32px_rgba(99,102,241,0.4),inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:-translate-y-[1px]
        before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,0.15),transparent_50%)] before:opacity-0 hover:before:opacity-100 before:transition-opacity
      `,
      secondary: isDark
        ? 'bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] text-white/90 hover:bg-white/[0.10] hover:border-white/[0.14] hover:text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
        : 'bg-white/70 backdrop-blur-xl border border-black/[0.06] text-slate-700 hover:bg-white hover:border-black/[0.10] shadow-[0_2px_12px_rgba(0,0,0,0.05)]',
      ghost: isDark
        ? 'bg-transparent hover:bg-white/[0.06] text-white/60 hover:text-white/90'
        : 'bg-transparent hover:bg-black/[0.04] text-slate-500 hover:text-slate-800',
      danger: `
        bg-[linear-gradient(135deg,#EF4444_0%,#DC2626_100%)] text-white
        shadow-[0_4px_20px_rgba(239,68,68,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]
        hover:shadow-[0_8px_32px_rgba(239,68,68,0.4)] hover:-translate-y-[1px]
      `,
      success: `
        bg-[linear-gradient(135deg,#10B981_0%,#059669_100%)] text-white
        shadow-[0_4px_20px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]
        hover:shadow-[0_8px_32px_rgba(16,185,129,0.4)] hover:-translate-y-[1px]
      `,
      glass: isDark
        ? 'bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
        : 'bg-white/60 backdrop-blur-2xl border border-black/[0.06] text-slate-700 hover:bg-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
    }

    const sizeStyles = {
      sm: 'h-9 px-4 text-[13px] rounded-xl',
      md: 'h-11 px-6 text-[14px] rounded-2xl',
      lg: 'h-[52px] px-8 text-[15px] rounded-2xl',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            children
          )}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
