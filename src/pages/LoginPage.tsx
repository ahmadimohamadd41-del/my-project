import { useEffect } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function LoginPage() {
  const { initData, initDataUnsafe } = useTelegram()
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initData) {
      return
    }
  }, [initData])

  const handleLogin = async () => {
    await login()
    navigate('/')
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-5 shadow-lg shadow-primary-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ورود به VAR VPN</h1>
          <p className="text-gray-400 text-sm">
            لطفاً از داخل برنامه تلگرام وارد شوید
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'در حال ورود...' : 'ورود با تلگرام'}
        </Button>
      </Card>
    </div>
  )
}
