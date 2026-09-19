import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CircularGauge from '@/components/CircularGauge'
import ThemeToggle from '@/components/ThemeToggle'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [error, setError] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState<string>('')

  const tgId = Number(user?.telegram_id) ||
    Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0

  useEffect(() => {
    if (!tgId) { setLoading(false); return }
    fetch(`${API}/?action=my_subscriptions_list&telegram_id=${tgId}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setSubs(data.subscriptions || [])
        else setError(data.error || 'خطا در دریافت لیست')
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
    const tg = (window as any).Telegram?.WebApp
    const url = `${API}/?action=download_config&telegram_id=${tgId}&proto=${proto}`
    if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-[3px] border-violet-500/10" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-[3px] border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in relative z-10">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link to="/account" className={`w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-white/[0.06] border-white/[0.08] text-white/70' : 'bg-white/70 border-black/[0.06] text-slate-600 shadow-sm'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className={`text-[20px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn' }}>اکانت‌های من 🤝</h1>
              <p className={`text-[11px] font-bold tracking-widest ${isDark ? 'text-white/40' : 'text-slate-400'}`}>PARTNER ACCOUNTS • {subs.length} اکانت</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-bold">
            {error}
          </div>
        )}

        {subs.length === 0 ? (
          <Card className="p-10 !rounded-[28px] text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-[24px] bg-gradient-to-br from-violet-500/15 to-cyan-500/15 border border-violet-500/20 flex items-center justify-center text-3xl">📭</div>
            <p className={`text-[14px] font-bold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>هنوز اکانتی نداری</p>
            <p className={`text-[12px] mt-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>برای شروع، یک پلن خریداری کن</p>
            <Link to="/plans" className="inline-block mt-6">
              <Button variant="primary" size="lg">مشاهده پلن‌ها</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subs.map((s) => {
              const usedGb = Number(s.quota_used_gb) || 0
              const limitGb = Number(s.quota_limit_gb) || 0
              const isActive = s.status === 'active'
              const isSuspended = s.status === 'suspended'

              return (
                <Card key={s.id} className="p-7 !rounded-[28px] overflow-visible">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className={`text-[16px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.plan_name || s.plan_code}</h3>
                      <p className={`text-[11px] mt-1 font-mono ${isDark ? 'text-white/30' : 'text-slate-400'}`}>#{s.id} • {new Date(s.created_at).toLocaleDateString('fa-IR')}</p>
                    </div>
                    <span className={`text-[11px] px-3 py-1.5 rounded-full font-black flex items-center gap-1.5 ${
                      isActive ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' :
                      isSuspended ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' :
                      'bg-red-500/15 text-red-500 border border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : isSuspended ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
                      {isActive ? 'فعال' : isSuspended ? 'معلق' : 'منقضی'}
                    </span>
                  </div>

                  <div className="flex justify-center mb-6">
                    <CircularGauge used={usedGb} total={limitGb} size={200} expiryDate={s.expiry_date} />
                  </div>

                  {s.radius_username && (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-black/[0.04]'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>👤 یوزرنیم</span>
                          <button onClick={() => copyText(s.radius_username!, `user-${s.id}`)} className={`px-3 h-7 rounded-xl text-[11px] font-black transition-all ${copied === `user-${s.id}` ? 'bg-emerald-500 text-white' : isDark ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'bg-violet-500/10 text-violet-600 border border-violet-500/15'}`}>
                            {copied === `user-${s.id}` ? '✓ کپی شد' : 'کپی'}
                          </button>
                        </div>
                        <div className={`font-mono text-[12px] font-bold break-all p-2.5 rounded-xl ${isDark ? 'bg-black/20 text-white border border-white/[0.04]' : 'bg-white text-slate-900 border border-black/[0.06]'}`} dir="ltr">{s.radius_username}</div>
                      </div>

                      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-black/[0.04]'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>🔑 پسورد</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => togglePassword(s.id)} className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] ${isDark ? 'bg-white/[0.06] text-white/60' : 'bg-white text-slate-500 border border-black/[0.06]'}`}>{visiblePasswords.has(s.id) ? '🙈' : '👁️'}</button>
                            <button onClick={() => copyText(s.radius_password!, `pass-${s.id}`)} className={`px-3 h-7 rounded-xl text-[11px] font-black ${copied === `pass-${s.id}` ? 'bg-emerald-500 text-white' : isDark ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'bg-violet-500/10 text-violet-600 border border-violet-500/15'}`}>
                              {copied === `pass-${s.id}` ? '✓ کپی شد' : 'کپی'}
                            </button>
                          </div>
                        </div>
                        <div className={`font-mono text-[12px] font-bold break-all p-2.5 rounded-xl ${isDark ? 'bg-black/20 text-white border border-white/[0.04]' : 'bg-white text-slate-900 border border-black/[0.06]'}`} dir="ltr">
                          {visiblePasswords.has(s.id) ? s.radius_password : '••••••••••••'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => downloadConfig('tcp')} className="h-[48px] rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white text-[12px] font-black flex items-center justify-center gap-2 hover:shadow-[0_8px_20px_rgba(6,182,214,0.3)] hover:-translate-y-[1px] transition-all">📥 TCP</button>
                        <button onClick={() => downloadConfig('udp')} className="h-[48px] rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-[12px] font-black flex items-center justify-center gap-2 hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:-translate-y-[1px] transition-all">📥 UDP</button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
