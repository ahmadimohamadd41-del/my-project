import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const API = 'https://varminiapp.popserver.shop/api'

type Subscription = {
  id: number
  plan_name?: string
  plan_code?: string
  status: string
  start_date: string
  expiry_date: string
  quota_limit_gb: number
  quota_used_gb: number
  radius_username?: string
  radius_password?: string
  config_url?: string
  server_code?: string
  created_at: string
}

export default function MyAccountsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [error, setError] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState<string>('')

  const tgId = Number(user?.telegram_id) ||
    Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0

  useEffect(() => {
    if (!tgId) {
      setLoading(false)
      return
    }
    fetch(`${API}/?action=my_subscriptions_list&telegram_id=${tgId}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setSubs(data.subscriptions || [])
        } else {
          setError(data.error || 'خطا در دریافت لیست')
        }
      })
      .catch(e => setError(e?.message || 'خطای شبکه'))
      .finally(() => setLoading(false))
  }, [tgId])

  const togglePassword = (id: number) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  const downloadConfig = (proto: 'tcp' | 'udp') => {
    if (!tgId) return
    window.open(`${API}/?action=download_config&telegram_id=${tgId}&proto=${proto}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="relative inline-flex">
          <div className="w-14 h-14 rounded-full border-2 border-primary-500/20"></div>
          <div className="absolute inset-0 w-14 h-14 rounded-full border-t-2 border-primary-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-6">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <header className="flex justify-between items-center mb-6">
          <Link to="/account">
            <Button variant="ghost" size="sm">بازگشت</Button>
          </Link>
          <h1 className="text-xl font-bold text-white">اکانت‌های من</h1>
        </header>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
            {error}
          </div>
        )}

        {subs.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 text-sm">هنوز اکانتی ندارید.</p>
            <Link to="/plans" className="inline-block mt-4">
              <Button variant="primary">مشاهده پلن‌ها</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {subs.map((s) => {
              const usedGb = Number(s.quota_used_gb) || 0
              const limitGb = Number(s.quota_limit_gb) || 0
              const percent = limitGb > 0 ? Math.min(100, (usedGb / limitGb) * 100) : 0
              const remaining = Math.max(0, limitGb - usedGb)
              const isActive = s.status === 'active'
              const isSuspended = s.status === 'suspended'

              return (
                <Card key={s.id} className="p-5">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div>
                      <h3 className="text-white font-bold">{s.plan_name || s.plan_code}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        سفارش #{s.id} · {new Date(s.created_at).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                      isActive ? 'bg-success-500/15 text-success-400' :
                      isSuspended ? 'bg-warning-500/15 text-warning-400' :
                      'bg-error-500/15 text-error-400'
                    }`}>
                      {isActive ? '✅ فعال' : isSuspended ? '⏸️ معلق' : '❌ منقضی'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-400">مصرف</span>
                      <span className="text-gray-300" dir="ltr">{usedGb.toFixed(2)} / {limitGb} GB</span>
                    </div>
                    <div className="h-2 bg-navy-800/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          percent >= 90 ? 'bg-gradient-to-r from-error-500 to-error-600' :
                          percent >= 70 ? 'bg-gradient-to-r from-warning-500 to-warning-600' :
                          'bg-gradient-to-r from-primary-500 to-primary-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">باقی‌مانده: {remaining.toFixed(2)} گیگابایت</p>
                  </div>

                  <div className="mb-4 p-3 rounded-xl bg-navy-900/40 flex justify-between">
                    <span className="text-gray-400 text-xs">انقضا</span>
                    <span className="text-white text-xs font-bold">
                      {new Date(s.expiry_date).toLocaleDateString('fa-IR')}
                    </span>
                  </div>

                  {s.radius_username && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-xs">یوزرنیم</span>
                        <button
                          onClick={() => copyText(s.radius_username!, `user-${s.id}`)}
                          className="text-xs px-2 py-1 rounded-lg bg-primary-500/15 text-primary-300 border border-primary-500/20"
                        >
                          {copied === `user-${s.id}` ? '✓ کپی شد' : 'کپی'}
                        </button>
                      </div>
                      <div className="font-mono text-white text-xs break-all bg-navy-800/40 px-3 py-2 rounded-lg" dir="ltr">
                        {s.radius_username}
                      </div>
                    </div>
                  )}

                  {s.radius_password && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-xs">پسورد</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => togglePassword(s.id)}
                            className="text-xs px-2 py-1 rounded-lg bg-navy-700/40 text-gray-300 border border-navy-600/40"
                          >
                            {visiblePasswords.has(s.id) ? 'مخفی' : 'نمایش'}
                          </button>
                          <button
                            onClick={() => copyText(s.radius_password!, `pass-${s.id}`)}
                            className="text-xs px-2 py-1 rounded-lg bg-primary-500/15 text-primary-300 border border-primary-500/20"
                          >
                            {copied === `pass-${s.id}` ? '✓ کپی شد' : 'کپی'}
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-white text-xs break-all bg-navy-800/40 px-3 py-2 rounded-lg" dir="ltr">
                        {visiblePasswords.has(s.id) ? s.radius_password : '••••••••••'}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadConfig('tcp')}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold hover:from-primary-400 hover:to-primary-500 transition"
                    >
                      📥 دانلود TCP
                    </button>
                    <button
                      onClick={() => downloadConfig('udp')}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs font-bold hover:from-accent-400 hover:to-accent-500 transition"
                    >
                      📥 دانلود UDP
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
