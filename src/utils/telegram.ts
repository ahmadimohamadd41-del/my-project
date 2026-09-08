import { TelegramUser } from '@/types'

export interface TelegramInitData {
  query_id?: string
  user?: TelegramUser
  receiver?: string
  chat_instance?: string
  start_param?: string
  can_send_after?: number
  auth_date: number
  hash: string
}

export function getInitData(): string | null {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) return null
  return window.Telegram.WebApp.initData || null
}

export function getInitDataUnsafe(): TelegramInitData {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
    return { auth_date: 0, hash: '' }
  }
  return window.Telegram.WebApp.initDataUnsafe as TelegramInitData
}

export function getTelegramUser(): TelegramUser | null {
  return getInitDataUnsafe().user || null
}

export function getTelegramTheme(): Record<string, unknown> {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) return {}
  const tg = window.Telegram.WebApp as any
  return tg.themeParams || tg.theme_params || {}
}

export function isDarkMode(): boolean {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) return true
  const tg = window.Telegram.WebApp as any
  const theme = tg.themeParams || tg.theme_params || {}
  return theme.colorScheme === 'dark' || theme.scheme === 'dark' || true
}

export function setTelegramViewport(): void {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) return

  const tg = window.Telegram.WebApp as any
  try {
    tg.ready?.()
    tg.expand?.()
    const bg = tg.themeParams?.bg_color || tg.theme_params?.background_color || '#0f172a'
    if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(bg)
    if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(bg)
  } catch {
    // ignore
  }
}

export function closeTelegram(): void {
  try {
    window.Telegram?.WebApp?.close?.()
  } catch {
    // ignore
  }
}

export function showTelegramAlert(message: string): void {
  if (window.Telegram?.WebApp?.showAlert) {
    window.Telegram.WebApp.showAlert(message)
  } else {
    alert(message)
  }
}

export function showTelegramConfirm(message: string, callback?: (result: boolean) => void): void {
  if (window.Telegram?.WebApp?.showConfirm) {
    window.Telegram.WebApp.showConfirm(message, callback || (() => {}))
  } else {
    callback?.(window.confirm(message))
  }
}

export function sendTelegramNotification(message: string): void {
  try {
    window.Telegram?.WebApp?.showPopup?.({
      title: 'VAR VPN',
      message,
      buttons: [{ text: 'موافق' }],
    })
  } catch {
    // ignore
  }
}

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string
        initDataUnsafe: TelegramInitData
        ready(): void
        close(): void
        expand(): void
        showAlert(message: string, callback?: () => void): void
        showConfirm(message: string, callback: (result: boolean) => void): void
        showPopup(
          params: { title: string; message: string; buttons: { text: string }[] },
          callback?: (result: string) => void
        ): void
        themeParams?: Record<string, string>
        theme_params?: Record<string, string>
        setHeaderColor?(color: string): void
        setBackgroundColor?(color: string): void
      }
    }
  }
}

export type { TelegramInitData }