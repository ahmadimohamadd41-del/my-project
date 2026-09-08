import { useEffect } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { cn } from '@/utils/cn'

interface TelegramAppProps {
  children: React.ReactNode
}

export default function TelegramApp({ children }: TelegramAppProps) {
  const { tg, isDark } = useTelegram()

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

  useEffect(() => {
    if (!tg) return
    const html = document.documentElement
    if (isDark) {
      html.dataset.theme = 'dark'
      html.classList.add('dark')
    } else {
      html.dataset.theme = 'light'
      html.classList.remove('dark')
    }
  }, [tg, isDark])

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-200',
        isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
      )}
    >
      <div className="w-full max-w-4xl mx-auto">{children}</div>
    </div>
  )
}