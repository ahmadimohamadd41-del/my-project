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

  // Orders state (from cPanel MySQL)
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const telegramId = typeof initDataUnsafe.user === 'object'
    ? (initDataUnsafe.user as any)?.id
    : null

  useEffect(() => {
    const finalTgId = telegramId || user?.telegram_id
    if (!finalTgId) {
      setLoading(false)
      return
    }

    // کیف پول
    setWalletLoading(true)
    fetch(`${API}/?action=my_wallet&telegram_id=${finalTgId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok) {
          setWalletBalance(Number(data.balance) || 0)
          setWalletLedger(data.ledger || [])
        }
      })
      .catch(err => console.error('wallet fetch error:', err))
      .finally(() => {
        setWalletLoading(false)
        setLoading(false)
      })

    // تاریخچه سفارش‌ها از cPanel
    setOrdersLoading(true)
    fetch(`${API}/?action=my_orders&telegram_id=${finalTgId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok) {
          setOrders(data.orders || [])
        }
      })
      .catch(err => console.error('orders fetch error:', err))
      .finally(() => setOrdersLoading(false))
  }, [telegramId, user?.telegram_id])

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
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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
                        className={`text-sm font-bold ${isPositive ? 'text-success-400' : 'text-error-400'}`}
                        dir="ltr"
                      >
                        {isPositive ? '+' : ''}{amount.toLocaleString('fa-IR')} تومان
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
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>هنوز خریدی ثبت نکرده‌اید.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const statusNorm = String(o.status || '').toLowerCase()
                const isCompleted = statusNorm === 'completed'
                const isPending = statusNorm === 'pending'
                const hasDiscount = Number(o.discount_amount) > 0 && o.discount_code

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
                          سفارش #{o.id} · {o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—'}
                        </p>
                      </div>
                      <span className={`inline-block px-2.5 py-1 text-xs rounded-lg font-medium ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-navy-700/30">
                      <div className="text-sm text-gray-300">
                        {hasDiscount ? (
                          <>
                            <span className="text-gray-500 text-xs">مبلغ اصلی: </span>
                            <span className="text-gray-400 line-through text-xs mr-1" dir="ltr">
                              {Number(o.amount_before_discount).toLocaleString('fa-IR')}
                            </span>
                            <br />
                            <span className="text-success-400 font-bold">
                              {Number(o.amount).toLocaleString('fa-IR')} تومان
                            </span>
                            <span className="text-xs text-success-400 mr-2">
                              ({o.discount_code} -{Number(o.discount_amount).toLocaleString('fa-IR')})
                            </span>
                          </>
                        ) : (
                          <span className="text-primary-400 font-bold">
                            {Number(o.amount).toLocaleString('fa-IR')} تومان
                          </span>
                        )}
                      </div>
                      {o.reference_number && (
                        <div className="text-xs text-gray-500 font-mono" dir="ltr">
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
      </div>
    </div>
  )
}