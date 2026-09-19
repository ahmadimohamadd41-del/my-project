import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTelegram } from '@/hooks/useTelegram'
import { useTheme } from '@/hooks/useTheme'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ThemeToggle from '@/components/ThemeToggle'
import { Link } from 'react-router-dom'

const API = 'https://varminiapp.popserver.shop/api'

type WalletLedgerEntry = {
  id: number
  amount: number | string
  balance_after: number | string
  type?: string
  note?: string
  created_at?: string
}

type WalletTopup = {
  id: number
  amount: number | string
  reference_number: string
  status: 'pending' | 'approved' | 'rejected' | string
  reject_reason?: string | null
  approved_at?: string | null
  created_at?: string
}

type MyOrder = {
  id: number
  plan_id: number | string
  plan_name?: string
  plan_code?: string
  amount: number | string
  amount_before_discount?: number | string
  discount_code?: string | null
  discount_amount?: number | string
  status: string
  reference_number?: string
  created_at?: string
}

export default function AccountPage() {
  const { user } = useAuth()
  const { initDataUnsafe } = useTelegram()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [loading, setLoading] = useState(true)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [topups, setTopups] = useState<WalletTopup[]>([])
  const [topupsLoading, setTopupsLoading] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupRef, setTopupRef] = useState('')
  const [topupSubmitting, setTopupSubmitting] = useState(false)
  const [topupError, setTopupError] = useState('')
  const [topupSuccess, setTopupSuccess] = useState('')
  const [paymentSettings, setPaymentSettings] = useState({ card_number: '', card_holder_name: '' })
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const telegramId = typeof initDataUnsafe.user === 'object' ? (initDataUnsafe.user as any)?.id : null

  useEffect(() => {
    const finalTgId = telegramId || user?.telegram_id
    if (!finalTgId) { setLoading(false); return }

    setWalletLoading(true)
    fetch(`${API}/?action=my_wallet&telegram_id=${finalTgId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok) {
          setWalletBalance(Number(data.balance) || 0)
          setWalletLedger(data.ledger || [])
        }
      })
      .finally(() => { setWalletLoading(false); setLoading(false) })

    setTopupsLoading(true)
    fetch(`${API}/?action=my_wallet_topups&telegram_id=${finalTgId}`)
      .then(r => r.json())
      .then(data => { if (data?.ok) setTopups(data.topups || []) })
      .finally(() => setTopupsLoading(false))

    fetch(`${API}/?action=payment_settings`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok && data.settings) {
          setPaymentSettings({
            card_number: data.settings.card_number || '',
            card_holder_name: data.settings.card_holder_name || '',
          })
        }
      })

    setOrdersLoading(true)
    fetch(`${API}/?action=my_orders&telegram_id=${finalTgId}`)
      .then(r => r.json())
      .then(data => { if (data?.ok) setOrders(data.orders || []) })
      .finally(() => setOrdersLoading(false))
  }, [telegramId, user?.telegram_id])

  const submitTopup = async () => {
    const amt = Number(topupAmount)
    if (!amt || amt < 10000) { setTopupError('حداقل ۱۰,۰۰۰ تومان'); return }
    if (amt > 50000000) { setTopupError('حداکثر ۵۰,۰۰۰,۰۰۰ تومان'); return }
    if (!topupRef.trim() || topupRef.trim().length < 4) { setTopupError('شماره پیگیری الزامی است'); return }
    const finalTgId = telegramId || user?.telegram_id
    if (!finalTgId) { setTopupError('هویت تلگرام شناسایی نشد'); return }

    setTopupSubmitting(true)
    setTopupError('')
    try {
      const res = await fetch(`${API}/?action=create_wallet_topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: finalTgId, amount: amt, reference_number: topupRef.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setTopupSuccess('درخواست شارژ ثبت شد. پس از تأیید ادمین موجودی به‌روز می‌شود.')
        setTopupAmount(''); setTopupRef('')
        const tRes = await fetch(`${API}/?action=my_wallet_topups&telegram_id=${finalTgId}`)
        const tData = await tRes.json()
        if (tData.ok) setTopups(tData.topups || [])
        setTimeout(() => { setShowTopupModal(false); setTopupSuccess('') }, 3000)
      } else setTopupError(data.error || 'خطا در ثبت')
    } catch (e: any) { setTopupError(e?.message || 'خطای شبکه') }
    finally { setTopupSubmitting(false) }
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
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className={`w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-white/[0.06] border-white/[0.08] text-white/70' : 'bg-white/70 border-black/[0.06] text-slate-600 shadow-sm'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className={`text-[22px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn' }}>حساب کاربری</h1>
              <p className={`text-[11px] font-bold tracking-widest mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>WALLET • ORDERS • HISTORY</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Telegram notice */}
        <Card className="mb-6 p-5 !rounded-[20px] !bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-cyan-500/10 border-violet-500/15">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl shadow-lg flex-shrink-0">📢</div>
            <div className="flex-1">
              <h3 className={`text-[14px] font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>اطلاع‌رسانی تلگرام</h3>
              <p className={`text-[12px] leading-relaxed mb-3 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>برای دریافت اطلاع‌رسانی شارژ و تایید سفارش، بات تلگرام را استارت کنید.</p>
              <a href="https://t.me/Var_vpn_sales_bot?start=start" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[12px] font-black hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition-all">
                📱 باز کردن بات
              </a>
            </div>
          </div>
        </Card>

        {user?.is_partner && (
          <Link to="/my-accounts" className="block mb-6 group">
            <div className="p-[1px] rounded-[20px] bg-gradient-to-r from-amber-500/50 to-orange-500/50 group-hover:from-amber-500 group-hover:to-orange-500 transition-all duration-500">
              <div className={`p-4 rounded-[19px] flex items-center gap-3 ${isDark ? 'bg-[#0F172A]' : 'bg-white'} group-hover:scale-[1.01] transition-transform`}>
                <div className="text-2xl">🤝</div>
                <div className="flex-1">
                  <div className={`text-[13px] font-black ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>اکانت‌های من</div>
                  <div className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>لیست اکانت‌های خریده‌شده</div>
                </div>
                <div className="text-amber-500">←</div>
              </div>
            </div>
          </Link>
        )}

        {/* Profile + Wallet */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-6">
            <Card className="p-7 !rounded-[28px]">
              <div className="flex items-center gap-5 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white text-2xl font-black shadow-[0_12px_32px_rgba(99,102,241,0.3)]">
                    {user.first_name ? user.first_name[0] : 'U'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px]">✓</div>
                </div>
                <div>
                  <h2 className={`text-[20px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.first_name} {user.last_name || ''}</h2>
                  {user.username && <p className="text-violet-400 text-[13px] font-bold">@{user.username}</p>}
                  <p className={`text-[11px] mt-1 font-mono ${isDark ? 'text-white/30' : 'text-slate-400'}`}>ID: {user.telegram_id || telegramId}</p>
                </div>
              </div>

              <div className={`p-5 rounded-[20px] border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-white/[0.06]' : 'bg-gradient-to-br from-slate-50 to-white border-black/[0.04] shadow-sm'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.05] to-cyan-500/[0.05]" />
                <div className="relative">
                  <div className={`text-[11px] font-black tracking-widest mb-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>موجودی کیف پول</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[28px] font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{walletBalance === null ? '...' : walletBalance.toLocaleString('fa-IR')}</span>
                    <span className={`text-[13px] font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>تومان</span>
                  </div>
                  <div className={`mt-3 h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`}>
                    <div className="h-full w-[65%] bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setShowTopupModal(true); setTopupAmount(''); setTopupRef(''); setTopupError(''); setTopupSuccess('') }}
                className="w-full mt-5 h-[52px] rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-[14px] font-black tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:-translate-y-[1px] active:scale-[0.98] transition-all"
              >
                <span>💰</span> شارژ کیف پول
              </button>
            </Card>

            <Card className="p-6 !rounded-[28px]">
              <div className="flex justify-between items-center mb-5">
                <h3 className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>آمار سریع</h3>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest ${isDark ? 'bg-white/[0.06] text-white/30' : 'bg-slate-100 text-slate-400'}`}>STATS</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'تعداد خریدها', value: orders.length, icon: '🛒', color: 'from-violet-500 to-indigo-500' },
                  { label: 'شارژهای موفق', value: topups.filter(t => t.status === 'approved').length, icon: '✅', color: 'from-emerald-500 to-teal-500' },
                  { label: 'تراکنش‌ها', value: walletLedger.length, icon: '📊', color: 'from-cyan-500 to-blue-500' },
                  { label: 'در انتظار', value: topups.filter(t => t.status === 'pending').length + orders.filter(o => String(o.status).toLowerCase() === 'pending').length, icon: '⏳', color: 'from-amber-500 to-orange-500' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-sm shadow-md`}>{s.icon}</div>
                    <div className="flex-1">
                      <div className={`text-[12px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{s.label}</div>
                      <div className={`text-[14px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Wallet ledger */}
        <Card className="mb-6 p-6 !rounded-[24px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-[16px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>ریز تراکنش‌ها</h2>
            <span className={`text-[11px] px-3 py-1 rounded-full font-bold ${isDark ? 'bg-white/[0.06] text-white/40' : 'bg-slate-100 text-slate-500'}`}>۲۰ مورد آخر</span>
          </div>
          {walletLoading ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" /></div>
          ) : walletLedger.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-500/10 flex items-center justify-center text-2xl">📭</div>
              <p className={`text-[13px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>هنوز تراکنشی ثبت نشده</p>
            </div>
          ) : (
            <div className="space-y-2">
              {walletLedger.slice(0, 20).map(entry => {
                const amount = Number(entry.amount) || 0
                const isPositive = amount > 0
                return (
                  <div key={entry.id} className={`flex justify-between items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.01] ${isDark ? 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]' : 'bg-slate-50/50 border-black/[0.04] hover:bg-white hover:border-black/[0.08] shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${isPositive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                        {isPositive ? '↑' : '↓'}
                      </div>
                      <div>
                        <div className={`text-[13px] font-black ${isPositive ? 'text-emerald-500' : 'text-red-500'}`} dir="ltr">{isPositive ? '+' : ''}{amount.toLocaleString('fa-IR')} تومان</div>
                        <div className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{entry.note || entry.type || '—'} • {entry.created_at ? new Date(entry.created_at).toLocaleDateString('fa-IR') : '—'}</div>
                      </div>
                    </div>
                    <div className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full ${isDark ? 'bg-white/[0.06] text-white/50' : 'bg-slate-100 text-slate-600'}`} dir="ltr">
                      {entry.balance_after != null ? Number(entry.balance_after).toLocaleString('fa-IR') : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Topups + Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 !rounded-[24px]">
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>تاریخچه شارژها</h2>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-white/[0.06] text-white/30' : 'bg-slate-100 text-slate-400'}`}>{topups.length}</span>
            </div>
            {topupsLoading ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" /></div>
            ) : topups.length === 0 ? (
              <p className={`text-center text-[12px] py-8 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>هنوز شارژی ثبت نکرده‌اید</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {topups.map(t => (
                  <div key={t.id} className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-slate-50 border-black/[0.04]'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`text-[13px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`} dir="ltr">{Number(t.amount).toLocaleString('fa-IR')} تومان</div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                        t.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500' : t.status === 'rejected' ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500'
                      }`}>{t.status === 'approved' ? 'تایید' : t.status === 'rejected' ? 'رد' : 'انتظار'}</span>
                    </div>
                    <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`} dir="ltr">#{t.reference_number}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 !rounded-[24px]">
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>تاریخچه خریدها</h2>
              {ordersLoading && <div className="w-4 h-4 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />}
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-500/10 flex items-center justify-center text-2xl">🛒</div>
                <p className={`text-[12px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>هنوز خریدی ثبت نکرده‌اید</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {orders.map(o => {
                  const isCompleted = String(o.status).toLowerCase() === 'completed'
                  const isPending = String(o.status).toLowerCase() === 'pending'
                  return (
                    <div key={o.id} className={`p-3 rounded-2xl border transition-all hover:scale-[1.01] ${isDark ? 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]' : 'bg-slate-50 border-black/[0.04] hover:bg-white shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[12px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{o.plan_name || o.plan_code || `پلن #${o.plan_id}`}</span>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isCompleted ? 'bg-emerald-500/15 text-emerald-500' : isPending ? 'bg-amber-500/15 text-amber-500' : 'bg-red-500/15 text-red-500'}`}>{isCompleted ? 'موفق' : isPending ? 'بررسی' : 'ناموفق'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-violet-400 text-[12px] font-black">{Number(o.amount).toLocaleString('fa-IR')} تومان</span>
                        <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>#{o.id} • {o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Topup Modal */}
        {showTopupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
            <Card className="w-full max-w-md !rounded-[28px] p-0 overflow-hidden animate-slide-up">
              <div className={`p-6 border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                <div className="flex justify-between items-center">
                  <h3 className={`text-[16px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>💰 شارژ کیف پول</h3>
                  <button onClick={() => setShowTopupModal(false)} className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.06] text-white/60' : 'bg-slate-100 text-slate-500'}`}>✕</button>
                </div>
              </div>
              <div className="p-6">
                {topupSuccess ? (
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[20px] text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center text-2xl">✅</div>
                    <p className="text-emerald-400 font-bold text-[13px] leading-relaxed">{topupSuccess}</p>
                  </div>
                ) : (
                  <>
                    <div className={`mb-5 p-4 rounded-2xl border ${isDark ? 'bg-amber-500/5 border-amber-500/15' : 'bg-amber-50 border-amber-200'}`}>
                      <p className={`font-black text-[11px] mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>📌 واریز به کارت زیر:</p>
                      <div className="space-y-1 text-[12px]">
                        <div className="flex justify-between"><span className={isDark ? 'text-white/50' : 'text-slate-500'}>شماره کارت</span><span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} dir="ltr">{paymentSettings.card_number || '—'}</span></div>
                        <div className="flex justify-between"><span className={isDark ? 'text-white/50' : 'text-slate-500'}>به نام</span><span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{paymentSettings.card_holder_name || '—'}</span></div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className={`block text-[12px] font-black mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>مبلغ (تومان)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={topupAmount}
                        onChange={e => { setTopupAmount(e.target.value.replace(/[^0-9]/g, '')); setTopupError('') }}
                        className={`w-full h-[48px] px-4 rounded-2xl border text-[14px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900 shadow-sm'}`}
                        placeholder="50000"
                        dir="ltr"
                      />
                      <div className="flex gap-2 mt-2">
                        {[50000, 100000, 200000, 500000].map(amt => (
                          <button key={amt} onClick={() => setTopupAmount(String(amt))} className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`} dir="ltr">{amt.toLocaleString('fa-IR')}</button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-5">
                      <label className={`block text-[12px] font-black mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>شماره پیگیری</label>
                      <input
                        type="text"
                        value={topupRef}
                        onChange={e => { setTopupRef(e.target.value); setTopupError('') }}
                        className={`w-full h-[48px] px-4 rounded-2xl border text-[13px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900 shadow-sm'}`}
                        placeholder="12345678"
                        dir="ltr"
                        maxLength={64}
                      />
                    </div>

                    {topupError && <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold">{topupError}</div>}

                    <div className="flex gap-3">
                      <Button variant="glass" onClick={() => setShowTopupModal(false)} disabled={topupSubmitting} className="flex-1 !rounded-2xl">انصراف</Button>
                      <Button variant="primary" onClick={submitTopup} loading={topupSubmitting} className="flex-1 !rounded-2xl">ثبت درخواست</Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
