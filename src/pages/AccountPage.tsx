import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTelegram } from '@/hooks/useTelegram'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Link } from 'react-router-dom'

const API = 'https://varminiapp.popserver.shop/api'

type WalletLedgerEntry = {
  id: number
  amount: number | string
  balance_after: number | string
  type?: string
  reference_type?: string
  reference_id?: string
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
  payment_method?: string
  reference_number?: string
  created_at?: string
}

export default function AccountPage() {
  const { user } = useAuth()
  const { initDataUnsafe } = useTelegram()

  const [loading, setLoading] = useState(true)

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([])
  const [walletLoading, setWalletLoading] = useState(false)

  // Topup state
  const [topups, setTopups] = useState<WalletTopup[]>([])
  const [topupsLoading, setTopupsLoading] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupRef, setTopupRef] = useState('')
  const [topupSubmitting, setTopupSubmitting] = useState(false)
  const [topupError, setTopupError] = useState('')
  const [topupSuccess, setTopupSuccess] = useState('')
  const [paymentSettings, setPaymentSettings] = useState({
    card_number: '',
    card_holder_name: '',
  })

  // Orders state (from cPanel MySQL)
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const telegramId =
    typeof initDataUnsafe.user === 'object'
      ? (initDataUnsafe.user as any)?.id
      : null

  useEffect(() => {
    const finalTgId = telegramId || user?.telegram_id
    if (!finalTgId) {
      setLoading(false)
      return
    }

    // ۱) دریافت موجودی و گردش حساب کیف پول
    setWalletLoading(true)
    fetch(`${API}/?action=my_wallet&telegram_id=${finalTgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          setWalletBalance(Number(data.balance) || 0)
          setWalletLedger(data.ledger || [])
        }
      })
      .catch((err) => console.error('wallet fetch error:', err))
      .finally(() => {
        setWalletLoading(false)
        setLoading(false)
      })

    // ۲) دریافت تاریخچه شارژهای کیف پول
    setTopupsLoading(true)
    fetch(`${API}/?action=my_wallet_topups&telegram_id=${finalTgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          setTopups(data.topups || [])
        }
      })
      .catch((err) => console.error('topups fetch error:', err))
      .finally(() => setTopupsLoading(false))

    // ۳) دریافت اطلاعات کارت جهت واریز
    fetch(`${API}/?action=payment_settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.settings) {
          setPaymentSettings({
            card_number: data.settings.card_number || '',
            card_holder_name: data.settings.card_holder_name || '',
          })
        }
      })
      .catch((err) => console.error('payment settings fetch error:', err))

    // ۴) تاریخچه سفارش‌ها از cPanel
    setOrdersLoading(true)
    fetch(`${API}/?action=my_orders&telegram_id=${finalTgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          setOrders(data.orders || [])
        }
      })
      .catch((err) => console.error('orders fetch error:', err))
      .finally(() => setOrdersLoading(false))
  }, [telegramId, user?.telegram_id])

  const submitTopup = async () => {
    const amt = Number(topupAmount)
    if (!amt || amt < 10000) {
      setTopupError('حداقل مبلغ شارژ ۱۰,۰۰۰ تومان است')
      return
    }
    if (amt > 50000000) {
      setTopupError('حداکثر مبلغ شارژ ۵۰,۰۰۰,۰۰۰ تومان است')
      return
    }
    if (!topupRef.trim() || topupRef.trim().length < 4) {
      setTopupError('شماره پیگیری الزامی است (حداقل ۴ رقم)')
      return
    }

    const finalTgId = telegramId || user?.telegram_id
    if (!finalTgId) {
      setTopupError('هویت تلگرام شناسایی نشد')
      return
    }

    setTopupSubmitting(true)
    setTopupError('')
    try {
      const res = await fetch(`${API}/?action=create_wallet_topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: finalTgId,
          amount: amt,
          reference_number: topupRef.trim(),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTopupSuccess(
          'درخواست شارژ ثبت شد. پس از تأیید ادمین، موجودی شما به‌روز می‌شود.'
        )
        setTopupAmount('')
        setTopupRef('')
        // بروزرسانی لیست شارژها
        const tRes = await fetch(
          `${API}/?action=my_wallet_topups&telegram_id=${finalTgId}`
        )
        const tData = await tRes.json()
        if (tData.ok) setTopups(tData.topups || [])
        setTimeout(() => {
          setShowTopupModal(false)
          setTopupSuccess('')
        }, 3000)
      } else {
        setTopupError(data.error || 'خطا در ثبت درخواست')
      }
    } catch (e: any) {
      setTopupError(e?.message || 'خطای شبکه')
    } finally {
      setTopupSubmitting(false)
    }
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
        <header className="flex justify-between items-center mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              بازگشت به اصلی
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">اطلاعات حساب</h1>
        </header>

        {user && (
          <Card className="mb-6 p-6 animate-slide-up">
            <div className="flex items-center gap-4 mb-5">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.first_name}
                  className="w-16 h-16 rounded-full border-2 border-primary-500/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/20">
                  {user.first_name ? user.first_name[0] : 'U'}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.first_name} {user.last_name || ''}
                </h2>
                {user.username && (
                  <p className="text-primary-400 text-sm">@{user.username}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  شناسه تلگرام: {user.telegram_id || telegramId}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-navy-700/50">
              <div className="flex justify-between items-center p-3 rounded-xl bg-navy-900/40">
                <span className="text-gray-400">موجودی کیف پول:</span>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  {walletBalance === null
                    ? '...'
                    : `${walletBalance.toLocaleString('fa-IR')} تومان`}
                </span>
              </div>

              {/* دکمه شارژ کیف پول */}
              <button
                onClick={() => {
                  setShowTopupModal(true)
                  setTopupAmount('')
                  setTopupRef('')
                  setTopupError('')
                  setTopupSuccess('')
                }}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-success-500 to-success-600 text-sm font-bold text-white hover:from-success-400 hover:to-success-500 transition-all duration-300 shadow-lg shadow-success-500/20"
              >
                💰 شارژ کیف پول
              </button>
            </div>
          </Card>
        )}

        {/* ─── ریز تراکنش‌های کیف پول ─── */}
        <Card className="mb-6 p-6 animate-slide-up">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">ریز تراکنش‌های کیف پول</h2>
            <span className="text-xs text-gray-500">آخرین ۲۰ مورد</span>
          </div>

          {walletLoading ? (
            <div className="flex justify-center py-6">
              <div className="relative inline-flex">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500/20"></div>
                <div className="absolute inset-0 w-8 h-8 rounded-full border-t-2 border-primary-500 animate-spin"></div>
              </div>
            </div>
          ) : walletLedger.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <p>هنوز تراکنشی ثبت نشده است.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {walletLedger.map((entry) => {
                const amount = Number(entry.amount) || 0
                const isPositive = amount > 0
                return (
                  <div
                    key={entry.id}
                    className="flex justify-between items-start gap-3 py-3 border-b border-navy-700/30 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-bold ${
                          isPositive ? 'text-success-400' : 'text-error-400'
                        }`}
                        dir="ltr"
                      >
                        {isPositive ? '+' : ''}
                        {amount.toLocaleString('fa-IR')} تومان
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        {entry.note || entry.type || '—'}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleString('fa-IR')
                          : '—'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-500">موجودی بعد</div>
                      <div className="text-sm text-gray-300 font-mono" dir="ltr">
                        {entry.balance_after != null
                          ? Number(entry.balance_after).toLocaleString('fa-IR')
                          : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ─── تاریخچه شارژها ─── */}
        <Card className="mb-6 p-6 animate-slide-up">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">تاریخچه شارژها</h2>
            <span className="text-xs text-gray-500">آخرین ۵۰ مورد</span>
          </div>

          {topupsLoading ? (
            <div className="flex justify-center py-6">
              <div className="relative inline-flex">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500/20"></div>
                <div className="absolute inset-0 w-8 h-8 rounded-full border-t-2 border-primary-500 animate-spin"></div>
              </div>
            </div>
          ) : topups.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-6">
              هنوز درخواست شارژی ثبت نکرده‌اید.
            </p>
          ) : (
            <div className="space-y-2">
              {topups.map((t) => {
                const statusLabel =
                  t.status === 'approved'
                    ? 'تأیید شده'
                    : t.status === 'rejected'
                    ? 'رد شده'
                    : 'در انتظار'
                const statusClass =
                  t.status === 'approved'
                    ? 'bg-success-500/15 text-success-400'
                    : t.status === 'rejected'
                    ? 'bg-error-500/15 text-error-400'
                    : 'bg-warning-500/15 text-warning-400'

                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-navy-800/40 border border-navy-700/30"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="text-sm">
                        <div className="text-white font-bold" dir="ltr">
                          {Number(t.amount).toLocaleString('fa-IR')} تومان
                        </div>
                        <div
                          className="text-xs text-gray-500 mt-0.5 font-mono"
                          dir="ltr"
                        >
                          #{t.reference_number}
                        </div>
                      </div>
                      <span
                        className={`inline-block px-2.5 py-1 text-xs rounded-lg font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    {t.status === 'rejected' && t.reject_reason && (
                      <div className="mt-2 p-2 rounded-lg bg-error-500/10 border border-error-500/20 text-error-300 text-xs">
                        دلیل رد: {t.reject_reason}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString('fa-IR')
                        : '—'}
                      {t.approved_at &&
                        ` · تأیید: ${new Date(t.approved_at).toLocaleString('fa-IR')}`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ─── تاریخچه خریدها (از cPanel) ─── */}
        <Card className="p-6 animate-slide-up">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">تاریخچه خریدها</h2>
            {ordersLoading && (
              <div className="relative inline-flex">
                <div className="w-5 h-5 rounded-full border-2 border-primary-500/20"></div>
                <div className="absolute inset-0 w-5 h-5 rounded-full border-t-2 border-primary-500 animate-spin"></div>
              </div>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p>هنوز خریدی ثبت نکرده‌اید.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const statusNorm = String(o.status || '').toLowerCase()
                const isCompleted = statusNorm === 'completed'
                const isPending = statusNorm === 'pending'
                const hasDiscount =
                  Number(o.discount_amount) > 0 && o.discount_code

                const statusLabel = isCompleted
                  ? 'موفق'
                  : isPending
                  ? 'در حال بررسی'
                  : 'ناموفق'

                const statusClass = isCompleted
                  ? 'bg-success-500/15 text-success-400'
                  : isPending
                  ? 'bg-warning-500/15 text-warning-400'
                  : 'bg-error-500/15 text-error-400'

                return (
                  <div
                    key={o.id}
                    className="p-4 bg-navy-900/40 rounded-xl border border-navy-700/30 hover:border-primary-500/20 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div>
                        <p className="text-white font-semibold">
                          {o.plan_name || o.plan_code || `پلن #${o.plan_id}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          سفارش #{o.id} ·{' '}
                          {o.created_at
                            ? new Date(o.created_at).toLocaleDateString('fa-IR')
                            : '—'}
                        </p>
                      </div>
                      <span
                        className={`inline-block px-2.5 py-1 text-xs rounded-lg font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-navy-700/30">
                      <div className="text-sm text-gray-300">
                        {hasDiscount ? (
                          <>
                            <span className="text-gray-500 text-xs">
                              مبلغ اصلی:{' '}
                            </span>
                            <span
                              className="text-gray-400 line-through text-xs mr-1"
                              dir="ltr"
                            >
                              {Number(
                                o.amount_before_discount
                              ).toLocaleString('fa-IR')}
                            </span>
                            <br />
                            <span className="text-success-400 font-bold">
                              {Number(o.amount).toLocaleString('fa-IR')} تومان
                            </span>
                            <span className="text-xs text-success-400 mr-2">
                              ({o.discount_code} -
                              {Number(o.discount_amount).toLocaleString('fa-IR')}
                              )
                            </span>
                          </>
                        ) : (
                          <span className="text-primary-400 font-bold">
                            {Number(o.amount).toLocaleString('fa-IR')} تومان
                          </span>
                        )}
                      </div>
                      {o.reference_number && (
                        <div
                          className="text-xs text-gray-500 font-mono"
                          dir="ltr"
                        >
                          #{o.reference_number}
                        </div>
                      )}
                    </div>

                    {!isCompleted && !isPending && (o as any).reject_reason && (
                      <div className="mt-2 p-2 rounded-lg bg-error-500/10 border border-error-500/20 text-error-300 text-xs">
                        دلیل: {(o as any).reject_reason}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ─── مودال شارژ کیف پول ─── */}
        {showTopupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-white">💰 شارژ کیف پول</h3>
                  <button
                    onClick={() => setShowTopupModal(false)}
                    className="text-gray-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>

                {topupSuccess ? (
                  <div className="p-5 bg-success-500/10 border border-success-500/30 text-success-300 rounded-xl text-center">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-success-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {topupSuccess}
                  </div>
                ) : (
                  <>
                    {/* اطلاعات کارت */}
                    <div className="mb-5 p-4 rounded-xl bg-navy-900/60 border border-warning-500/20 space-y-2 text-xs text-gray-300">
                      <p className="font-semibold text-warning-400 mb-2">
                        📌 ابتدا مبلغ را به کارت زیر واریز کنید:
                      </p>
                      <p>
                        شماره کارت:{' '}
                        <span className="font-mono text-white" dir="ltr">
                          {paymentSettings.card_number || '—'}
                        </span>
                      </p>
                      <p>
                        به نام:{' '}
                        <span className="text-white">
                          {paymentSettings.card_holder_name || '—'}
                        </span>
                      </p>
                    </div>

                    {/* مبلغ */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-300 mb-2">
                        مبلغ (تومان) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={topupAmount}
                        onChange={(e) => {
                          setTopupAmount(e.target.value.replace(/[^0-9]/g, ''))
                          setTopupError('')
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        placeholder="50000"
                        dir="ltr"
                      />
                      <div className="flex gap-2 mt-2">
                        {[50000, 100000, 200000, 500000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setTopupAmount(String(amt))}
                            className="flex-1 py-1.5 rounded-lg bg-navy-800/60 text-xs text-gray-300 hover:bg-navy-700/60 transition"
                            dir="ltr"
                          >
                            {amt.toLocaleString('fa-IR')}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        حداقل: ۱۰,۰۰۰ — حداکثر: ۵۰,۰۰۰,۰۰۰ تومان
                      </p>
                    </div>

                    {/* کد پیگیری */}
                    <div className="mb-5">
                      <label className="block text-sm text-gray-300 mb-2">
                        شماره پیگیری *
                      </label>
                      <input
                        type="text"
                        value={topupRef}
                        onChange={(e) => {
                          setTopupRef(e.target.value)
                          setTopupError('')
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        placeholder="مثلاً 12345678"
                        dir="ltr"
                        maxLength={64}
                      />
                    </div>

                    {topupError && (
                      <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                        {topupError}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => setShowTopupModal(false)}
                        disabled={topupSubmitting}
                      >
                        انصراف
                      </Button>
                      <Button
                        variant="primary"
                        onClick={submitTopup}
                        loading={topupSubmitting}
                      >
                        ثبت درخواست شارژ
                      </Button>
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