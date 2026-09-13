import { useState, useEffect, useRef } from 'react'
import { plansApi, purchasesApi, VPSPlan } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
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

  // ─── پرداخت با کیف پول ───
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false)
  const [payMode, setPayMode] = useState<'card' | 'wallet'>('card')
  const [walletSubmitting, setWalletSubmitting] = useState(false)
  const [walletError, setWalletError] = useState('')
  const [walletSuccess, setWalletSuccess] = useState(false)

  // جلوگیری از ثبت تکراری
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
        const [plansData] = await Promise.all([
          plansApi.getAll(),
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
      setFormError('هویت تلگرام شناسایی نشد. لطفاً اپ را از داخل تلگرام (لینک ربات) باز کنید.')
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
      setWalletError(`موجودی کافی نیست. موجودی فعلی: ${walletBalance.toLocaleString('fa-IR')} تومان — کمبود: ${(amount - walletBalance).toLocaleString('fa-IR')} تومان`)
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
        setTimeout(() => {
          closePurchaseModal()
        }, 5000)
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
    } catch (e: any) {
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

  // باز کردن مودال با ساخت idempotency key جدید
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
    // ریست حالت پرداخت کیف پول
    setPayMode('card')
    setWalletError('')
    setWalletSuccess(false)
    setWalletBalance(null)
    // دریافت موجودی کیف پول
    if (tgId) {
      setWalletBalanceLoading(true)
      fetch(`https://varminiapp.popserver.shop/api/?action=my_wallet&telegram_id=${tgId}`)
        .then(r => r.json())
        .then(d => { if (d?.ok) setWalletBalance(Number(d.balance) || 0) })
        .catch(() => setWalletBalance(null))
        .finally(() => setWalletBalanceLoading(false))
    }
  }

  // بستن مودال با پاک کردن همه چیز
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
        <div className="relative inline-flex">
          <div className="w-14 h-14 rounded-full border-2 border-primary-500/20"></div>
          <div className="absolute inset-0 w-14 h-14 rounded-full border-t-2 border-primary-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-6">
      <div className="max-w-6xl mx-auto animate-fade-in">
        <header className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              بازگشت به اصلی
            </Button>
          </Link>
        </header>

        <h1 className="text-2xl font-bold text-white mb-6">انتخاب پلن VPN</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col p-6 group">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white group-hover:text-primary-300 transition-colors duration-300">
                  {plan.display_name || plan.plan_code}
                </h3>
                <p className="text-gray-400 mt-1.5 text-sm">
                  ترافیک: {formatQuota(plan.quota_bytes)}
                </p>
              </div>

              <div className="flex-1 mb-5">
                <div className="text-center py-3 rounded-xl bg-navy-900/40 border border-navy-700/30">
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                    {plan.price_amount ? plan.price_amount.toLocaleString() : '0'}
                  </span>
                  <span className="text-gray-400 mr-2 text-sm">تومان</span>
                </div>
                <p className="text-center text-gray-500 text-sm mt-2">
                  مدت: {Math.round((plan.duration_seconds || 2592000) / 86400)} روز
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => openPurchaseModal(plan)}
              >
                خرید پلن
              </Button>
            </Card>
          ))}
        </div>

        {/* Purchase Modal */}
        {selectedPlan && (
          <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="w-full max-w-md animate-slide-up flex flex-col max-h-[90vh]">
              <div className="flex-1 overflow-y-auto p-6">
                <h2 className="text-xl font-bold text-white mb-5">
                  خرید پلن: {selectedPlan.display_name}
                </h2>

                {successMessage ? (
                  <div className="p-5 bg-success-500/10 border border-success-500/30 text-success-300 rounded-xl text-center mb-4">
                    <svg className="w-12 h-12 mx-auto mb-3 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {successMessage}
                  </div>
                ) : walletSuccess ? (
                  <div className="p-5 bg-success-500/10 border border-success-500/30 text-success-300 rounded-xl text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-bold">🎉 سرویس شما فعال شد!</p>
                    <p className="text-xs mt-2 text-gray-400">اطلاعات اتصال به تلگرام ارسال شد.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 space-y-2.5 text-sm text-gray-300">
                      <div className="flex justify-between p-2.5 rounded-lg bg-navy-900/40">
                        <span>حجم ترافیک:</span>
                        <span className="font-bold text-white">{formatQuota(selectedPlan.quota_bytes)}</span>
                      </div>

                      {discountInfo === null ? (
                        <div className="flex justify-between p-2.5 rounded-lg bg-navy-900/40">
                          <span>مبلغ قابل پرداخت:</span>
                          <span className="font-bold text-primary-400">{selectedPlan.price_amount?.toLocaleString()} تومان</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between p-2.5 rounded-lg bg-navy-900/40">
                            <span>مبلغ اصلی:</span>
                            <span className="font-bold text-white">{discountInfo.amount_before.toLocaleString()} تومان</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-lg bg-success-500/10 border border-success-500/20">
                            <span>تخفیف ({discountInfo.percent}%):</span>
                            <span className="font-bold text-success-400">
                              - {discountInfo.discount_amount.toLocaleString()} تومان
                            </span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-lg bg-primary-500/10 border border-primary-500/20">
                            <span>مبلغ نهایی:</span>
                            <span className="font-bold text-primary-300 text-lg">
                              {discountInfo.amount_after.toLocaleString()} تومان
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {payMode === 'card' && (
                      <div className="mb-6 bg-navy-900/60 p-4 rounded-xl border border-warning-500/20 text-xs text-gray-300 space-y-2">
                        <p className="font-semibold text-warning-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          اطلاعات کارت به کارت:
                        </p>
                        <p>
                          شماره کارت:{' '}
                          <span className="font-mono text-white">
                            {settings.card_number || 'در حال بارگذاری...'}
                          </span>
                        </p>
                        <p>
                          به نام:{' '}
                          <span className="text-white">
                            {settings.card_holder_name || 'در حال بارگذاری...'}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* انتخاب روش پرداخت */}
                    <div className="mb-6">
                      <label className="block text-sm text-gray-300 mb-2">روش پرداخت</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setPayMode('card'); setWalletError('') }}
                          className={`py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${payMode === 'card' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'bg-navy-800/60 border border-navy-700/40 text-gray-400'}`}
                        >
                          💳 کارت‌به‌کارت
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPayMode('wallet'); setWalletError('') }}
                          className={`py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${payMode === 'wallet' ? 'bg-gradient-to-r from-success-500 to-success-600 text-white glow-primary' : 'bg-navy-800/60 border border-navy-700/40 text-gray-400'}`}
                        >
                          💰 کیف پول
                        </button>
                      </div>
                    </div>

                    {/* کد تخفیف */}
                    <div className="mb-5">
                      <label className="block text-sm text-gray-300 mb-2">کد تخفیف (اختیاری)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={discountCode}
                          onChange={(e) => {
                            setDiscountCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
                            setDiscountInfo(null)
                            setDiscountError('')
                          }}
                          placeholder="مثلاً WELCOME20"
                          dir="ltr"
                          maxLength={32}
                          className="flex-1 px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        />
                        <Button
                          variant="ghost"
                          onClick={validateDiscount}
                          loading={discountValidating}
                          disabled={!discountCode.trim()}
                        >
                          اعمال
                        </Button>
                      </div>

                      {discountError && (
                        <p className="mt-2 text-sm text-error-400">{discountError}</p>
                      )}

                      {discountInfo && (
                        <div className="mt-3 p-3 rounded-xl bg-success-500/10 border border-success-500/30 text-success-300 text-sm flex justify-between items-center">
                          <span>
                            ✅ کد <span className="font-mono font-bold">{discountInfo.code}</span> اعمال شد
                            ({discountInfo.percent}% تخفیف)
                          </span>
                          <button
                            onClick={() => {
                              setDiscountInfo(null)
                              setDiscountCode('')
                            }}
                            className="text-error-400 hover:text-error-300 text-xs"
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </div>

                    {payMode === 'card' && (
                      <div className="mb-2">
                        <Input
                          label="شماره پیگیری / ارجاع کارت به کارت"
                          placeholder="مثلاً: 12345678"
                          value={refNumber}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-invalid={Boolean(formError)}
                          onChange={e => {
                            setRefNumber(normalizeReferenceNumber(e.target.value))
                            setFormError('')
                          }}
                        />
                        {formError && (
                          <p className="mt-2 text-sm text-error-400" role="alert">
                            {formError}
                          </p>
                        )}
                      </div>
                    )}

                    {payMode === 'wallet' && (
                      <>
                        <div className="mb-5 p-4 rounded-xl bg-navy-900/40 border border-navy-700/30 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">موجودی فعلی کیف پول</span>
                            <span className="text-white font-bold">
                              {walletBalanceLoading ? '...' : (walletBalance !== null ? walletBalance.toLocaleString('fa-IR') + ' تومان' : '—')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">مبلغ قابل پرداخت</span>
                            <span className="text-primary-400 font-bold">
                              {(discountInfo?.amount_after || selectedPlan.price_amount || 0).toLocaleString('fa-IR')} تومان
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-navy-700/30">
                            <span className="text-gray-400">موجودی بعد از خرید</span>
                            <span className={`font-bold ${
                              walletBalance !== null && walletBalance >= (discountInfo?.amount_after || selectedPlan.price_amount || 0)
                                ? 'text-success-400'
                                : 'text-error-400'
                            }`}>
                              {walletBalance !== null
                                ? Math.max(0, walletBalance - (discountInfo?.amount_after || selectedPlan.price_amount || 0)).toLocaleString('fa-IR') + ' تومان'
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {walletBalance !== null && walletBalance < (discountInfo?.amount_after || selectedPlan.price_amount || 0) && (
                          <div className="mb-5 p-3 rounded-xl bg-warning-500/10 border border-warning-500/30 text-warning-300 text-sm">
                            ⚠️ موجودی کافی نیست. لطفاً از پروفایل، کیف پول رو شارژ کنید.
                          </div>
                        )}
                      </>
                    )}

                    {walletError && (
                      <div className="mb-3 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                        {walletError}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!successMessage && !walletSuccess && (
                <div className="flex-shrink-0 p-4 border-t border-navy-700/40 flex gap-3 justify-end bg-navy-900/40">
                  <Button
                    variant="ghost"
                    onClick={closePurchaseModal}
                    disabled={submitting || walletSubmitting}
                  >
                    انصراف
                  </Button>
                  {payMode === 'card' ? (
                    <Button
                      variant="primary"
                      onClick={handlePurchase}
                      loading={submitting}
                    >
                      ثبت و تأیید پرداخت
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleWalletPurchase}
                      loading={walletSubmitting}
                      disabled={
                        walletBalance === null ||
                        walletBalance < (discountInfo?.amount_after || selectedPlan.price_amount || 0)
                      }
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
