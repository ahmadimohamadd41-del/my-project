import { useEffect } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { TelegramUser } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function LoginPage() {
  const { initData, initDataUnsafe } = useTelegram()
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initData) {
      // Not in Telegram, redirect or show message
      return
    }
  }, [initData])

  const handleLogin = async () => {
    await login()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
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