import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { useTheme } from '@/hooks/useTheme'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={cn(
            "block text-[13px] font-bold mb-2 tracking-wide",
            isDark ? "text-white/80" : "text-slate-700"
          )}>
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full px-4 py-3.5 rounded-2xl backdrop-blur-xl border text-[14px] font-medium',
              'transition-all duration-300',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30',
              'placeholder:text-[13px]',
              isDark
                ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 group-hover:bg-white/[0.06] group-hover:border-white/[0.12]'
                : 'bg-white/70 border-black/[0.08] text-slate-900 placeholder:text-slate-400 group-hover:bg-white/90 group-hover:border-black/[0.12] shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
              error && (isDark ? 'border-error-500/50 focus:border-error-500/50 focus:ring-error-500/20' : 'border-error-500/40 focus:border-error-500/40'),
              className
            )}
            {...props}
          />
          <div className={cn(
            "absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300",
            isDark ? "shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_4px_20px_rgba(99,102,241,0.1)]" : "shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_4px_20px_rgba(99,102,241,0.08)]"
          )} />
        </div>
        {error && (
          <p className="mt-2 text-[12px] text-error-400 font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
