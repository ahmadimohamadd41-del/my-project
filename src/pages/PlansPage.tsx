import { useState, useEffect, useRef } from 'react'
import { plansApi, purchasesApi, VPSPlan } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import ThemeToggle from '@/components/ThemeToggle'
import { Link } from 'react-router-dom'

interface PaymentSettings {
  card_number: string
  card_holder_name: string
}

function normalizeReferenceNumber(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit: string) => String(digit.charCodeAt(0) - 1776))
    .replace(/[^0-9]/g, '')
}

export default function PlansPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [plans, setPlans] = useState<VPSPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<VPSPlan | null>(null)
  const [refNumber, setRefNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState<PaymentSettings>({
    card_number: '',
    card_holder_name: '',
  })
  const [discountCode, setDiscountCode] = useState('')
  const [discountValidating, setDiscountValidating] = useState(false)
  const [discountInfo, setDiscountInfo] = useState<{
    code: string
    percent: number
    amount_before: number
    discount_amount: number
    amount_after: number
  } | null>(null)
  const [discountError, setDiscountError] = useState('')

  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false)
  const [payMode, setPayMode] = useState<'card' | 'wallet'>('card')
  const [walletSubmitting, setWalletSubmitting] = useState(false)
  const [walletError, setWalletError] = useState('')
  const [walletSuccess, setWalletSuccess] = useState(false)

  const submittingRef = useRef(false)
  const [purchaseAttemptKey, setPurchaseAttemptKey] = useState('')

  const loadSettings = async () => {
    try {
      const res = await fetch('https://varminiapp.popserver.shop/api/?action=payment_settings')
      const data = await res.json()
      if (data.ok && data.settings) {
        setSettings({
          card_number: data.settings.card_number || '',
          card_holder_name: data.settings.card_holder_name || '',
        })
      }
    } catch (e) {
      console.error('Failed to load payment settings:', e)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const tgId = Number(user?.telegram_id) ||
          Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0
        const [plansData] = await Promise.all([
          plansApi.getAll(tgId || undefined),
          loadSettings(),
        ])
        setPlans(plansData)
      } catch (e) {
        console.error('Failed to load plans:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handlePurchase = async () => {
    if (!selectedPlan) return
    if (submittingRef.current) return
    submittingRef.current = true

    const telegramId =
      Number(user?.telegram_id) ||
      Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) ||
      0

    if (!telegramId) {
      submittingRef.current = false
      setFormError('هویت تلگرام شناسایی نشد. لطفاً اپ را از داخل تلگرام باز کنید.')
      return
    }
    if (!refNumber) {
      submittingRef.current = false
      setFormError('شماره پیگیری را وارد کنید')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      await purchasesApi.createOrder(
        selectedPlan.plan_code,
        'card_to_card',
        refNumber.trim(),
        telegramId,
        discountInfo?.code,
        purchaseAttemptKey,
      )
      setSuccessMessage('سفارش شما با موفقیت ثبت شد و پس از بررسی فعال خواهد شد.')
      setTimeout(() => {
        setSelectedPlan(null)
        setDiscountCode('')
        setDiscountInfo(null)
        setDiscountError('')
        setSuccessMessage(null)
        setRefNumber('')
        setPurchaseAttemptKey('')
        setPayMode('card')
        setWalletError('')
        setWalletSuccess(false)
        setWalletBalance(null)
      }, 3000)
    } catch (e: any) {
      setFormError('خطا در ثبت سفارش: ' + (e?.response?.data?.error || e.message))
    } finally {
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  const handleWalletPurchase = async () => {
    if (!selectedPlan) return
    if (walletSubmitting) return
    const telegramId = Number(user?.telegram_id) ||
      Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0
    if (!telegramId) {
      setWalletError('هویت تلگرام شناسایی نشد')
      return
    }
    const amount = discountInfo?.amount_after || selectedPlan.price_amount || 0
    if (walletBalance !== null && walletBalance < amount) {
      setWalletError(`موجودی کافی نیست. موجودی فعلی: ${walletBalance.toLocaleString('fa-IR')} تومان`)
      return
    }
    setWalletSubmitting(true)
    setWalletError('')
    try {
      const res = await fetch('https://varminiapp.popserver.shop/api/?action=create_order_wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_code: selectedPlan.plan_code,
          telegram_id: telegramId,
          discount_code: discountInfo?.code || null,
          idempotency_key: `ui-wallet-${Date.now()}-${telegramId}`,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setWalletSuccess(true)
        setTimeout(() => closePurchaseModal(), 5000)
      } else {
        setWalletError(data.error || 'خطا در خرید')
      }
    } catch (e: any) {
      setWalletError(e?.message || 'خطای شبکه')
    } finally {
      setWalletSubmitting(false)
    }
  }

  const validateDiscount = async () => {
    const code = discountCode.trim().toUpperCase()
    if (!code) {
      setDiscountInfo(null)
      setDiscountError('')
      return
    }
    if (!selectedPlan) return
    const telegramId = Number(user?.telegram_id) ||
      Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0
    if (!telegramId) {
      setDiscountError('هویت تلگرام شناسایی نشد')
      return
    }
    setDiscountValidating(true)
    setDiscountError('')
    try {
      const res = await fetch('https://varminiapp.popserver.shop/api/?action=validate_discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          code: code,
          plan_code: selectedPlan.plan_code,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setDiscountInfo({
          code: data.code,
          percent: data.percent,
          amount_before: data.amount_before,
          discount_amount: data.discount_amount,
          amount_after: data.amount_after,
        })
        setDiscountError('')
      } else {
        setDiscountInfo(null)
        setDiscountError(data.error || 'کد تخفیف معتبر نیست')
      }
    } catch {
      setDiscountInfo(null)
      setDiscountError('خطای شبکه')
    } finally {
      setDiscountValidating(false)
    }
  }

  const formatQuota = (bytes: number) => {
    if (!bytes) return '0 GB'
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(0)} گیگابایت`
    return `${(bytes / (1024 * 1024)).toFixed(0)} مگابایت`
  }

  const openPurchaseModal = (plan: VPSPlan) => {
    const tgId = Number(user?.telegram_id) ||
      Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0
    setSelectedPlan(plan)
    setFormError('')
    setRefNumber('')
    setDiscountCode('')
    setDiscountInfo(null)
    setDiscountError('')
    setPurchaseAttemptKey(`ui-order-${Date.now()}-${tgId}`)
    setPayMode('card')
    setWalletError('')
    setWalletSuccess(false)
    setWalletBalance(null)
    if (tgId) {
      setWalletBalanceLoading(true)
      fetch(`https://varminiapp.popserver.shop/api/?action=my_wallet&telegram_id=${tgId}`)
        .then(r => r.json())
        .then(d => { if (d?.ok) setWalletBalance(Number(d.balance) || 0) })
        .catch(() => setWalletBalance(null))
        .finally(() => setWalletBalanceLoading(false))
    }
  }

  const closePurchaseModal = () => {
    setSelectedPlan(null)
    setDiscountCode('')
    setDiscountInfo(null)
    setDiscountError('')
    setRefNumber('')
    setFormError('')
    setPurchaseAttemptKey('')
    setPayMode('card')
    setWalletError('')
    setWalletSuccess(false)
    setWalletBalance(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-[3px] border-violet-500/10" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-[3px] border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-8">
      <div className="max-w-6xl mx-auto animate-fade-in relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className={`
              w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center
              transition-all duration-300 hover:scale-105
              ${isDark ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.10] text-white/70' : 'bg-white/70 border-black/[0.06] hover:bg-white text-slate-600 shadow-sm'}
            `}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className={`text-[22px] font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn' }}>
                پلن‌های ویژه
              </h1>
              <p className={`text-[11px] font-bold tracking-[0.15em] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>PREMIUM PLANS • انتخاب کن، سریع وصل شو</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan, idx) => {
            const isPopular = idx === 1
            const quotaGB = Math.round(plan.quota_bytes / (1024*1024*1024))
            return (
              <Card key={plan.id} className={`flex flex-col p-7 group !rounded-[28px] relative overflow-visible ${isPopular ? '!border-violet-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)]' : ''}`} hover={true}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black tracking-widest shadow-lg">
                    ⭐ محبوب‌ترین
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`
                      w-12 h-12 rounded-2xl flex items-center justify-center text-xl
                      ${isDark ? 'bg-white/[0.06] border border-white/[0.08]' : 'bg-slate-50 border border-black/[0.04]'}
                      group-hover:scale-110 transition-transform duration-500
                    `}>
                      {quotaGB >= 100 ? '🚀' : quotaGB >= 50 ? '⚡' : '💎'}
                    </div>
                    {plan.is_partner_price && (
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-500 border border-amber-500/20 text-[10px] font-black tracking-wide">
                        🤝 همکار
                      </span>
                    )}
                  </div>

                  <h3 className={`text-[18px] font-black tracking-tight mb-2 group-hover:text-violet-400 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {plan.display_name || plan.plan_code}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-white/[0.06] text-white/60 border border-white/[0.06]' : 'bg-slate-100 text-slate-600 border border-black/[0.04]'}`}>
                      📦 {formatQuota(plan.quota_bytes)}
                    </span>
                    <span className={`text-[12px] px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-white/[0.06] text-white/60 border border-white/[0.06]' : 'bg-slate-100 text-slate-600 border border-black/[0.04]'}`}>
                      ⏱️ {Math.round((plan.duration_seconds || 2592000) / 86400)} روز
                    </span>
                  </div>
                </div>

                <div className="flex-1 mb-6">
                  <div className={`
                    relative p-5 rounded-[20px] text-center overflow-hidden
                    ${isDark ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06]' : 'bg-gradient-to-br from-slate-50 to-white border border-black/[0.04] shadow-sm'}
                  `}>
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.05] to-cyan-500/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                      <div className="flex items-baseline justify-center gap-2">
                        <span className={`text-[32px] font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn' }}>
                          {plan.price_amount ? Number(plan.price_amount).toLocaleString('fa-IR') : '0'}
                        </span>
                        <span className={`text-[12px] font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>تومان</span>
                      </div>
                      {plan.is_partner_price && (
                        <div className={`text-[11px] mt-1 line-through ${isDark ? 'text-white/30' : 'text-slate-400'}`} dir="ltr">
                          {Number(plan.original_price || 0).toLocaleString('fa-IR')} تومان
                        </div>
                      )}
                      {discountInfo === null && !plan.is_partner_price && (
                        <div className={`text-[10px] font-bold tracking-widest mt-2 ${isDark ? 'text-emerald-300/60' : 'text-emerald-600/70'}`}>
                          ✨ بهترین قیمت
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant={isPopular ? 'primary' : 'glass'}
                  size="lg"
                  onClick={() => openPurchaseModal(plan)}
                  className="w-full !rounded-2xl !h-[52px] !text-[14px]"
                >
                  <span className="flex items-center gap-2">
                    خرید پلن
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Button>
              </Card>
            )
          })}
        </div>

        {/* Purchase Modal - Masterpiece */}
        {selectedPlan && (
          <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="w-full max-w-[480px] !rounded-[28px] animate-slide-up flex flex-col max-h-[92vh] overflow-hidden p-0">
              <div className="flex-1 overflow-y-auto">
                {/* Modal Header */}
                <div className={`sticky top-0 z-10 p-6 backdrop-blur-2xl border-b ${isDark ? 'bg-[#111A2E]/80 border-white/[0.06]' : 'bg-white/80 border-black/[0.06]'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className={`text-[18px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        خرید {selectedPlan.display_name}
                      </h2>
                      <p className={`text-[12px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>انتخاب روش پرداخت و تکمیل خرید</p>
                    </div>
                    <button
                      onClick={closePurchaseModal}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {successMessage ? (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[20px] text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center text-2xl">✅</div>
                      <p className="font-bold">{successMessage}</p>
                    </div>
                  ) : walletSuccess ? (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[20px] text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center text-2xl animate-float">🎉</div>
                      <p className="font-black text-lg">سرویس فعال شد!</p>
                      <p className={`text-xs mt-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>اطلاعات اتصال به تلگرام ارسال شد.</p>
                    </div>
                  ) : (
                    <>
                      {/* Plan summary */}
                      <div className={`mb-6 p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-black/[0.04]'}`}>
                        <div className="flex justify-between items-center text-[13px]">
                          <span className={isDark ? 'text-white/50' : 'text-slate-500'}>حجم ترافیک</span>
                          <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatQuota(selectedPlan.quota_bytes)}</span>
                        </div>
                        {discountInfo ? (
                          <>
                            <div className="flex justify-between items-center text-[13px] mt-3">
                              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>مبلغ اصلی</span>
                              <span className={`font-bold ${isDark ? 'text-white/70' : 'text-slate-700'}`}>{discountInfo.amount_before.toLocaleString('fa-IR')} تومان</span>
                            </div>
                            <div className="flex justify-between items-center text-[13px] mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <span className="text-emerald-400 font-bold">تخفیف {discountInfo.percent}%</span>
                              <span className="font-black text-emerald-400">- {discountInfo.discount_amount.toLocaleString('fa-IR')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[14px] mt-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>مبلغ نهایی</span>
                              <span className="font-black text-violet-400 text-[16px]">{discountInfo.amount_after.toLocaleString('fa-IR')} تومان</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center text-[13px] mt-3">
                            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>مبلغ قابل پرداخت</span>
                            <span className="font-black text-violet-400 text-[16px]">{Number(selectedPlan.price_amount).toLocaleString('fa-IR')} تومان</span>
                          </div>
                        )}
                      </div>

                      {/* Card info */}
                      {payMode === 'card' && (
                        <div className={`mb-6 p-4 rounded-2xl border ${isDark ? 'bg-amber-500/5 border-amber-500/15' : 'bg-amber-50 border-amber-200'}`}>
                          <p className={`font-black text-[12px] mb-3 flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                            <span>💳</span> اطلاعات کارت به کارت
                          </p>
                          <div className="space-y-2 text-[12px]">
                            <div className="flex justify-between">
                              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>شماره کارت</span>
                              <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} dir="ltr">{settings.card_number || '...'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>به نام</span>
                              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{settings.card_holder_name || '...'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pay mode */}
                      <div className="mb-6">
                        <label className={`block text-[12px] font-black tracking-wide mb-3 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>روش پرداخت</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'card', label: 'کارت‌به‌کارت', icon: '💳' },
                            { id: 'wallet', label: 'کیف پول', icon: '💰' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { setPayMode(m.id as any); setWalletError('') }}
                              className={`h-[52px] rounded-2xl text-[13px] font-black transition-all duration-300 flex items-center justify-center gap-2 border ${
                                payMode === m.id
                                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-violet-500/30 shadow-[0_8px_24px_rgba(99,102,241,0.3)] scale-[1.02]'
                                  : isDark ? 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white/80' : 'bg-white border-black/[0.06] text-slate-600 hover:bg-slate-50 shadow-sm'
                              }`}
                            >
                              <span>{m.icon}</span> {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Discount */}
                      <div className="mb-6">
                        <label className={`block text-[12px] font-black tracking-wide mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>کد تخفیف</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
                              setDiscountInfo(null)
                              setDiscountError('')
                            }}
                            placeholder="WELCOME20"
                            dir="ltr"
                            maxLength={32}
                            className={`flex-1 h-[48px] px-4 rounded-2xl backdrop-blur-xl border text-[13px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all ${
                              isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30' : 'bg-white border-black/[0.08] text-slate-900 placeholder:text-slate-400 shadow-sm'
                            }`}
                          />
                          <Button variant="glass" onClick={validateDiscount} loading={discountValidating} disabled={!discountCode.trim()} className="!h-[48px] !rounded-2xl">
                            اعمال
                          </Button>
                        </div>
                        {discountError && <p className="mt-2 text-[12px] text-red-400 font-medium">{discountError}</p>}
                        {discountInfo && (
                          <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] font-bold flex justify-between items-center">
                            <span>✅ {discountInfo.code} ({discountInfo.percent}%)</span>
                            <button onClick={() => { setDiscountInfo(null); setDiscountCode('') }} className="text-red-400 hover:text-red-300 text-[11px]">حذف</button>
                          </div>
                        )}
                      </div>

                      {payMode === 'card' && (
                        <div className="mb-2">
                          <Input
                            label="شماره پیگیری"
                            placeholder="12345678"
                            value={refNumber}
                            inputMode="numeric"
                            onChange={e => {
                              setRefNumber(normalizeReferenceNumber(e.target.value))
                              setFormError('')
                            }}
                          />
                          {formError && <p className="mt-2 text-[12px] text-red-400 font-medium">{formError}</p>}
                        </div>
                      )}

                      {payMode === 'wallet' && (
                        <div className={`mb-4 p-4 rounded-2xl border space-y-2.5 ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-black/[0.04]'}`}>
                          <div className="flex justify-between text-[12px]">
                            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>موجودی</span>
                            <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{walletBalanceLoading ? '...' : walletBalance !== null ? `${walletBalance.toLocaleString('fa-IR')} تومان` : '—'}</span>
                          </div>
                          <div className="flex justify-between text-[12px]">
                            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>قابل پرداخت</span>
                            <span className="font-black text-violet-400">{(discountInfo?.amount_after || selectedPlan.price_amount || 0).toLocaleString('fa-IR')} تومان</span>
                          </div>
                        </div>
                      )}

                      {walletError && (
                        <div className="mb-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-medium">
                          {walletError}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!successMessage && !walletSuccess && (
                <div className={`p-4 border-t flex gap-3 justify-end backdrop-blur-xl ${isDark ? 'border-white/[0.06] bg-[#0F172A]/50' : 'border-black/[0.06] bg-white/50'}`}>
                  <Button variant="glass" onClick={closePurchaseModal} disabled={submitting || walletSubmitting}>
                    انصراف
                  </Button>
                  {payMode === 'card' ? (
                    <Button variant="primary" onClick={handlePurchase} loading={submitting} className="!rounded-2xl">
                      ثبت پرداخت
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleWalletPurchase}
                      loading={walletSubmitting}
                      disabled={walletBalance === null || walletBalance < (discountInfo?.amount_after || selectedPlan.price_amount || 0)}
                      className="!rounded-2xl"
                    >
                      💰 پرداخت از کیف پول
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
