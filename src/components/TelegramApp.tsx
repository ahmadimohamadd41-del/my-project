import { useEffect } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

interface TelegramAppProps {
  children: React.ReactNode
}

export default function TelegramApp({ children }: TelegramAppProps) {
  const { tg } = useTelegram()
  const { theme } = useTheme()

  useEffect(() => {
    if (!tg) return

    const startParam = tg.initDataUnsafe?.start_param
    if (startParam) {
      console.log('Start param:', startParam)
    }

    const onBack = () => {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        tg.close?.()
      }
    }

    tg.onEvent?.('backButtonClicked', onBack)

    return () => {
      tg.offEvent?.('backButtonClicked', onBack)
    }
  }, [tg])

  return (
    <div
      className={cn(
        'min-h-screen transition-all duration-500 app-bg relative',
        theme === 'dark' ? 'text-slate-50' : 'text-slate-900'
      )}
      style={{ fontFamily: 'Vazirmatn, Outfit, sans-serif' }}
    >
      {/* Mesh gradient orbs - decorative */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[30%] -right-[20%] w-[80%] h-[80%] rounded-full blur-[120px] opacity-[0.15] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 animate-float" />
        <div className="absolute -bottom-[20%] -left-[20%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-[0.10] bg-gradient-to-br from-cyan-500 via-blue-500 to-violet-500 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {children}
      </div>
    </div>
  )
}
