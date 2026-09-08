import { useState, useEffect, useCallback } from 'react'
import { getInitData, getTelegramUser, isDarkMode, setTelegramViewport, getTelegramTheme } from '@/utils/telegram'
import { TelegramUser } from '@/types'

interface TelegramContextType {
  user: TelegramUser | null
  initData: string | null
  initDataUnsafe: Record<string, unknown>
  isDark: boolean
  theme: Record<string, unknown>
  tg: typeof window.Telegram.WebApp | null
}

import { createContext, useContext } from 'react'

export const TelegramContext = createContext<TelegramContextType>({
  user: null,
  initData: null,
  initDataUnsafe: {},
  isDark: true,
  theme: {},
  tg: null,
})

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [initData, setInitData] = useState<string | null>(null)
  const [initDataUnsafe, setInitDataUnsafe] = useState<Record<string, unknown>>({})
  const [isDark, setIsDark] = useState(true)
  const [theme, setTheme] = useState<Record<string, unknown>>({})
  const [tg, setTg] = useState<typeof window.Telegram.WebApp | null>(null)

  useEffect(() => {
    if (!window.Telegram?.WebApp) return

    const webApp = window.Telegram.WebApp

    setTg(webApp)
    setInitData(webApp.initData || null)
    setInitDataUnsafe(webApp.initDataUnsafe as Record<string, unknown>)
    setUser(webApp.initDataUnsafe?.user || null)
    setIsDark(webApp.theme_params?.scheme === 'dark')
    setTheme(webApp.theme_params || {})

    webApp.ready()
    setTelegramViewport()

    webApp.themeParamsDidChange?.subscribe(() => {
      setIsDark(webApp.theme_params?.scheme === 'dark')
      setTheme(webApp.theme_params || {})
    })

  }, [])

  return (
    <TelegramContext.Provider value={{ user, initData, initDataUnsafe, isDark, theme, tg }}>
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram() {
  return useContext(TelegramContext)
}

export function useTelegramUser(): TelegramUser | null {
  const { user } = useTelegram()
  return user
}

export function useTelegramInitData(): string | null {
  const { initData } = useTelegram()
  return initData
}

export function useIsDarkMode(): boolean {
  const { isDark } = useTelegram()
  return isDark
}

export function useTelegramTheme(): Record<string, unknown> {
  const { theme } = useTelegram()
  return theme
}