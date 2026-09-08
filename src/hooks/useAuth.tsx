import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface AuthUser {
  id: number
  telegram_id: number
  first_name: string
  last_name?: string
  username?: string
  is_admin: boolean
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const CPANEL_API = 'https://varminiapp.popserver.shop/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const login = async (initData: string) => {
    try {
      const res = await fetch(`${CPANEL_API}/?action=auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })

      const data = await res.json()
      console.log('Auth response:', data)

      if (data.ok && data.user && data.token) {
        // موقتاً: telegram_id خودت همیشه ادمین باشد
        const fixedUser = {
          ...data.user,
          is_admin: data.user.is_admin === true
            || data.user.is_admin === 1
            || data.user.is_admin === '1'
            || Number(data.user.telegram_id) === 8869320234,
        }

        setUser(fixedUser)
        setToken(data.token)
        localStorage.setItem('var_token', data.token)
        localStorage.setItem('session_token', data.token)
        localStorage.setItem('var_user', JSON.stringify(fixedUser))
        localStorage.setItem('user', JSON.stringify(fixedUser))
        console.log('Auth success:', fixedUser)
      } else {
        console.error('Auth failed:', data)
      }
    } catch (err) {
      console.error('Auth error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('var_token')
    localStorage.removeItem('session_token')
    localStorage.removeItem('var_user')
    localStorage.removeItem('user')
  }

  useEffect(() => {
    // بازیابی کش قبلی
    const savedToken = localStorage.getItem('var_token')
    const savedUser = localStorage.getItem('var_user')
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('var_token')
        localStorage.removeItem('var_user')
      }
    }

    // صبر برای آماده شدن initData (تا ۲ ثانیه)
    let tries = 0
    const maxTries = 10

    const tryAuth = () => {
      const initData = (window as any).Telegram?.WebApp?.initData
      if (initData && initData.length > 10) {
        console.log('initData found, length=', initData.length)
        login(initData)
        return
      }

      tries += 1
      if (tries < maxTries) {
        setTimeout(tryAuth, 200)
      } else {
        console.warn('No Telegram initData after retries')
        setIsLoading(false)
      }
    }

    tryAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login: async () => {
      const initData = (window as any).Telegram?.WebApp?.initData
      if (initData) await login(initData)
    }, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}