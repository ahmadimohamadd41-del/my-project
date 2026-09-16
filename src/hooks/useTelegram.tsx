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
    let tries = 0
    const maxTries = 50  // 50 × 200ms = 10 ثانیه

    const initTelegram = () => {
      const webApp = (window as any).Telegram?.WebApp

      if (webApp) {
        console.log('[useTelegram] WebApp found after', tries, 'tries')
        console.log('[useTelegram] initData length:', webApp.initData?.length || 0)

        setTg(webApp)
        setInitData(webApp.initData || null)
        setInitDataUnsafe(webApp.initDataUnsafe || {})
        setUser(webApp.initDataUnsafe?.user || null)
        setIsDark(webApp.theme_params?.scheme === 'dark')
        setTheme(webApp.theme_params || {})

        try {
          webApp.ready()
          setTelegramViewport()
        } catch (e) {
          console.warn('[useTelegram] ready/viewport error:', e)
        }

        try {
          webApp.themeParamsDidChange?.subscribe(() => {
            setIsDark(webApp.theme_params?.scheme === 'dark')
            setTheme(webApp.theme_params || {})
          })
        } catch (e) {}

        return
      }

      tries += 1
      if (tries < maxTries) {
        setTimeout(initTelegram, 200)
      } else {
        console.warn('[useTelegram] Telegram WebApp not available after 10s')
      }
    }

    initTelegram()
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
