import { useTheme } from '@/hooks/useTheme'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
      className={`
        relative inline-flex items-center justify-center
        w-11 h-11 rounded-2xl
        backdrop-blur-xl border
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        active:scale-95 group
        ${theme === 'dark'
          ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_20px_rgba(0,0,0,0.3)]'
          : 'bg-white/80 border-black/[0.06] hover:bg-white hover:border-black/[0.10] shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)]'
        }
        ${className}
      `}
    >
      {/* Glow */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10 ${theme === 'dark' ? 'bg-gradient-to-br from-violet-500/20 to-cyan-500/20' : 'bg-gradient-to-br from-violet-500/10 to-cyan-500/10'}`} />

      <div className="relative w-5 h-5">
        {/* Sun */}
        <svg
          className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'} ${theme === 'dark' ? 'text-white' : 'text-amber-500'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        {/* Moon */}
        <svg
          className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'} ${theme === 'dark' ? 'text-indigo-200' : 'text-slate-700'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </div>
    </button>
  )
}
