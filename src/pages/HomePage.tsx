import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTelegram } from '@/hooks/useTelegram'
import { useTheme } from '@/hooks/useTheme'
import { accountsApi, healthApi, purchasesApi, VPSCustomerAccount } from '@/api/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CircularGauge from '@/components/CircularGauge'
import ThemeToggle from '@/components/ThemeToggle'
import { Link } from 'react-router-dom'

interface SubscriptionData {
  id: number
  plan_id: string
  plan_name: string
  plan_code: string
  status: string
  start_date: string
  expiry_date: string
  quota_limit_gb: number
  quota_used_gb: string
  radius_username?: string
  radius_password?: string
  config_url?: string
  server_code?: string
  provision_status?: string
}

export default function HomePage() {
  const { user } = useAuth()
  const { initDataUnsafe } = useTelegram()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [accountData, setAccountData] = useState<VPSCustomerAccount | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [health, setHealth] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(''), 2000)
    } catch {}
  }

  const downloadConfig = (proto: 'tcp' | 'udp') => {
    const tgId = Number(user?.telegram_id) ||
      Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0
    if (!tgId) return
    const url = `https://varminiapp.popserver.shop/api/?action=download_config&telegram_id=${tgId}&proto=${proto}`
    const tg = (window as any).Telegram?.WebApp
    if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank')
  }

  const externalRef = typeof initDataUnsafe.user === 'object'
    ? (initDataUnsafe.user as any)?.id?.toString()
    : null

  const telegramId =
    user?.telegram_id ||
    (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id

  const showAdmin =
    user?.is_admin === true ||
    Number(user?.is_admin) === 1 ||
    Number(telegramId) === 8869320234

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [accData, healthData, subData, walletData] = await Promise.all([
          externalRef ? accountsApi.getByExternalRef(externalRef) : Promise.resolve(null),
          healthApi.get(),
          user?.telegram_id ? purchasesApi.getMySubscription(user.telegram_id) : Promise.resolve(null),
          user?.telegram_id
            ? fetch(`https://varminiapp.popserver.shop/api/?action=my_wallet&telegram_id=${user.telegram_id}`)
                .then((r) => r.json())
                .catch(() => null)
            : Promise.resolve(null),
        ])
        setAccountData(accData)
        setHealth(healthData)
        if (subData?.ok && subData.subscription) {
          setSubscriptionData(subData.subscription)
        }
        if (walletData?.ok) {
          setWalletBalance(walletData.balance)
        }
      } catch (e) {
        console.error('Failed to load home data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [externalRef, user?.telegram_id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-[3px] border-violet-500/10" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-[3px] border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-2 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 blur-xl animate-pulse" />
        </div>
      </div>
    )
  }

  const hasActiveSubscription = subscriptionData?.status === 'active'
  const used = Number(subscriptionData?.quota_used_gb ?? 0)
  const total = Number(subscriptionData?.quota_limit_gb ?? 50)
  const expiryDate = subscriptionData?.expiry_date
  const planName = subscriptionData?.plan_name || subscriptionData?.plan_code || 'پلن فعال'
  const hasProvision = Boolean(subscriptionData?.radius_username && subscriptionData?.radius_password)
  const hasPendingOrder = Boolean(
    accountData?.purchases?.some((p) => p.status === 'pending' || p.status === 'PENDING')
  )

  const isOnline = health?.status === 'ok' || health?.status === 'healthy' || health?.ok === true

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in relative z-10">
        {/* ─── Header ─── */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black
              backdrop-blur-xl border shadow-lg
              ${isDark 
                ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white border-white/10 shadow-[0_8px_24px_rgba(99,102,241,0.3)]' 
                : 'bg-gradient-to-br from-violet-600 to-cyan-600 text-white border-white/20 shadow-[0_8px_24px_rgba(99,102,241,0.25)]'
              }
            `}>
              V
            </div>
            <div>
              <h1 className={`text-[22px] font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn' }}>
                VAR VPN
              </h1>
              <p className={`text-[11px] font-bold tracking-[0.2em] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                PREMIUM • SECURE • FAST
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {showAdmin && (
              <Link
                to="/admin"
                className="h-11 px-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-[13px] font-bold flex items-center gap-2 hover:shadow-[0_8px_24px_rgba(99,102,241,0.3)] hover:-translate-y-[1px] transition-all duration-300"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ادمین
              </Link>
            )}
            <Link to="/support" className={`
              w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center
              transition-all duration-300 hover:scale-105 active:scale-95
              ${isDark ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.10] text-white/70 hover:text-white' : 'bg-white/70 border-black/[0.06] hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm'}
            `}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </Link>
            <Link to="/account" className={`
              w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center overflow-hidden
              transition-all duration-300 hover:scale-105 active:scale-95
              ${isDark ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.10]' : 'bg-white/70 border-black/[0.06] hover:bg-white shadow-sm'}
            `}>
              {user?.first_name ? (
                <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-700'}`}>{user.first_name[0]}</span>
              ) : (
                <svg className={`w-5 h-5 ${isDark ? 'text-white/70' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </Link>
          </div>
        </header>

        {/* ─── Welcome + Status ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 mb-6">
          <Card className="p-6 lg:p-7 !rounded-[28px] overflow-visible">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className={`text-[26px] font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn' }}>
                    سلام، {user?.first_name || 'کاربر عزیز'} 👋
                  </h2>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest backdrop-blur-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                    آنلاین
                  </div>
                </div>
                <p className={`text-[13px] leading-relaxed max-w-md ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  به پنل مدیریت VPN خوش آمدید. از اینجا می‌تونی مصرفت رو ببینی، کانفیگ بگیری و پلن‌تو مدیریت کنی.
                </p>
              </div>
              <div className={`hidden lg:flex w-14 h-14 rounded-2xl items-center justify-center text-2xl ${isDark ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-slate-50 border border-black/[0.04]'}`}>
                🚀
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-bold backdrop-blur-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white/70' : 'bg-white/60 border-black/[0.06] text-slate-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-red-400'} `} />
                {isOnline ? 'سرور آنلاین • پایدار' : 'سرور در دسترس نیست'}
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold backdrop-blur-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white/60' : 'bg-white/60 border-black/[0.06] text-slate-500'}`}>
                <span>💰</span>
                موجودی: {walletBalance === null ? '...' : `${walletBalance.toLocaleString('fa-IR')} تومان`}
              </div>
            </div>
          </Card>

          <Card className="p-5 !rounded-[24px] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className={`text-[11px] font-black tracking-[0.15em] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>وضعیت سریع</span>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-white/[0.06] text-white/40' : 'bg-slate-100 text-slate-400'}`}>⚡</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-[13px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>پلن فعلی</span>
                <span className={`text-[13px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{hasActiveSubscription ? planName : 'بدون اشتراک'}</span>
              </div>
              <div className={`h-px ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`} />
              <div className="flex justify-between items-center">
                <span className={`text-[13px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>تاریخ انقضا</span>
                <span className={`text-[13px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{expiryDate ? new Date(expiryDate).toLocaleDateString('fa-IR') : '—'}</span>
              </div>
              <div className={`h-px ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`} />
              <div className="flex justify-between items-center">
                <span className={`text-[13px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>سرور</span>
                <span className={`text-[12px] font-mono font-bold px-2.5 py-1 rounded-full ${isDark ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'bg-violet-500/10 text-violet-600 border border-violet-500/15'}`}>IR-{subscriptionData?.server_code || '49'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ─── Main Content ─── */}
        {hasActiveSubscription ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            {/* Gauge Card */}
            <Card className="p-8 lg:p-10 !rounded-[32px] animate-slide-up">
              <div className="flex justify-between items-center mb-8">
                <h3 className={`text-[18px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>ریز مصرف اینترنت</h3>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest ${isDark ? 'bg-white/[0.06] text-white/40 border border-white/[0.06]' : 'bg-slate-100 text-slate-500 border border-black/[0.04]'}`}>
                  LIVE • زنده
                </div>
              </div>

              <CircularGauge
                used={used}
                total={total}
                planName={planName}
                expiryDate={expiryDate}
                size={280}
              />

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { label: 'مصرف', value: `${used.toFixed(1)} GB`, icon: '📊', color: 'from-violet-500 to-indigo-500' },
                  { label: 'کل', value: `${total} GB`, icon: '💾', color: 'from-cyan-500 to-blue-500' },
                  { label: 'درصد', value: `${total > 0 ? ((used/total)*100).toFixed(0) : 0}%`, icon: '⚡', color: 'from-emerald-500 to-teal-500' },
                ].map((stat, i) => (
                  <div key={i} className={`
                    p-4 rounded-2xl backdrop-blur-xl border text-center group hover:scale-[1.02] transition-all duration-300
                    ${isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]' : 'bg-white/60 border-black/[0.04] hover:bg-white/80 shadow-sm'}
                  `}>
                    <div className={`w-8 h-8 mx-auto mb-2 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-sm shadow-lg`}>
                      {stat.icon}
                    </div>
                    <div className={`text-[10px] font-bold tracking-widest mb-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{stat.label}</div>
                    <div className={`text-[13px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Connection Card */}
            <div className="space-y-6">
              {hasProvision ? (
                <Card className="p-7 !rounded-[28px] animate-slide-up" style={{ animationDelay: '100ms' } as any}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.3)]">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`text-[16px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>اطلاعات اتصال</h3>
                      <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>برای اتصال به VPN استفاده کنید</p>
                    </div>
                    <div className="mr-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: 'نام کاربری', value: subscriptionData?.radius_username, key: 'username', icon: '👤' },
                      { label: 'رمز عبور', value: subscriptionData?.radius_password, key: 'password', icon: '🔑', secret: true },
                    ].map((field) => (
                      <div key={field.key} className={`
                        group p-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 hover:scale-[1.01]
                        ${isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10]' : 'bg-slate-50/80 border-black/[0.04] hover:bg-white hover:border-black/[0.08] shadow-sm'}
                      `}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{field.icon}</span>
                            <span className={`text-[12px] font-bold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{field.label}</span>
                          </div>
                          <div className="flex gap-1.5">
                            {field.secret && (
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] transition-all ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/60' : 'bg-white hover:bg-slate-50 text-slate-500 border border-black/[0.06]'}`}
                              >
                                {showPassword ? '🙈' : '👁️'}
                              </button>
                            )}
                            <button
                              onClick={() => copyToClipboard(field.value || '', field.key)}
                              className={`px-3 h-7 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${copiedField === field.key ? 'bg-emerald-500 text-white' : isDark ? 'bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/20' : 'bg-violet-500/10 text-violet-600 hover:bg-violet-500/15 border border-violet-500/15'}`}
                            >
                              {copiedField === field.key ? '✓ کپی شد' : 'کپی'}
                            </button>
                          </div>
                        </div>
                        <div className={`font-mono text-[13px] font-bold tracking-wide break-all p-3 rounded-xl ${isDark ? 'bg-black/20 text-white border border-white/[0.04]' : 'bg-white text-slate-900 border border-black/[0.06] shadow-inner'}`} dir="ltr">
                          {field.secret && !showPassword ? '•'.repeat(12) : field.value || '—'}
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => downloadConfig('tcp')}
                        className="group relative h-[52px] rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white text-[13px] font-black tracking-wide flex items-center justify-center gap-2 overflow-hidden hover:shadow-[0_8px_24px_rgba(6,182,214,0.3)] hover:-translate-y-[1px] active:scale-[0.98] transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          TCP
                        </span>
                      </button>
                      <button
                        onClick={() => downloadConfig('udp')}
                        className="group relative h-[52px] rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-[13px] font-black tracking-wide flex items-center justify-center gap-2 overflow-hidden hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:-translate-y-[1px] active:scale-[0.98] transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          UDP
                        </span>
                      </button>
                    </div>

                    <div className={`p-3 rounded-2xl flex items-center gap-2.5 text-[11px] ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                      <span className="text-sm">💡</span>
                      برای سرعت بیشتر UDP و برای پایداری بیشتر TCP استفاده کنید
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 !rounded-[24px] border-amber-500/20 bg-amber-500/5">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400 flex-shrink-0">⏳</div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>در صف فعال‌سازی</h4>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-amber-300/70' : 'text-amber-600/80'}`}>اشتراک شما فعال است و اطلاعات اتصال به زودی نمایش داده می‌شود.</p>
                    </div>
                  </div>
                </Card>
              )}

              <Link to="/plans" className="block">
                <div className={`
                  group relative p-[1px] rounded-[20px] overflow-hidden
                  bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500
                  hover:shadow-[0_12px_32px_rgba(139,92,246,0.3)] hover:-translate-y-[1px] transition-all duration-500
                `}>
                  <div className={`
                    relative h-[56px] rounded-[19px] flex items-center justify-center gap-2 text-[14px] font-black tracking-wide
                    ${isDark ? 'bg-[#0F172A] text-white group-hover:bg-[#0F172A]/90' : 'bg-white text-slate-900 group-hover:bg-white/90'}
                    transition-all duration-500
                  `}>
                    <span>✨</span>
                    تمدید یا خرید پلن جدید
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ) : hasPendingOrder ? (
          <Card className="p-10 !rounded-[32px] text-center animate-slide-up">
            <div className="inline-flex w-20 h-20 rounded-[24px] bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/20 items-center justify-center mb-6 text-3xl animate-float">⏳</div>
            <h2 className={`text-[20px] font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>در صف تأیید</h2>
            <p className={`text-[13px] mb-8 max-w-sm mx-auto leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-500'}`}>سفارش شما با موفقیت ثبت شده و در انتظار تأیید ادمین است. معمولاً کمتر از ۳۰ دقیقه تایید می‌شود.</p>
            <Link to="/plans">
              <Button variant="glass" className="w-full max-w-xs mx-auto">مشاهده پلن‌ها</Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-10 !rounded-[32px] text-center animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] via-transparent to-cyan-500/[0.03] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex w-20 h-20 rounded-[24px] bg-gradient-to-br from-violet-500 to-cyan-500 items-center justify-center mb-6 shadow-[0_12px_32px_rgba(99,102,241,0.3)] text-2xl animate-float">🚀</div>
              <h2 className={`text-[22px] font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>شروع کن، امن بمان</h2>
              <p className={`text-[13px] mb-8 max-w-sm mx-auto leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-500'}`}>هنوز اشتراک فعالی نداری. یک پلن انتخاب کن و در کمتر از یک دقیقه به اینترنت آزاد و امن متصل شو.</p>
              <Link to="/plans" className="inline-block">
                <Button variant="primary" size="lg" className="px-10">
                  <span className="flex items-center gap-2">
                    مشاهده پلن‌ها
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Button>
              </Link>
              <div className="mt-8 flex justify-center gap-6 text-[11px]">
                {[
                  { icon: '🔒', text: 'رمزگذاری شده' },
                  { icon: '⚡', text: 'سرعت بالا' },
                  { icon: '🌍', text: 'بدون محدودیت' },
                ].map((f, i) => (
                  <div key={i} className={`flex items-center gap-1.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                    <span>{f.icon}</span>
                    <span className="font-bold">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
