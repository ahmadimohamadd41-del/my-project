import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

type Order = {
  id: number
  customer_id: number
  plan_id: number | string
  amount: number | string
  status: string
  payment_method?: string
  reference_number?: string
  created_at?: string
  plan_name?: string
  plan_code?: string
  telegram_id?: number
  first_name?: string
  username?: string
}

type PaymentSettings = {
  card_number: string
  card_holder_name: string
  card_to_card_enabled: boolean
  gateway_enabled: boolean
  gateway_provider: string
}

type AdminUser = {
  telegram_id: number
  first_name?: string
  last_name?: string
  username?: string
  subscription?: {
    id?: number
    plan_name?: string
    plan_code?: string
    status?: string
    quota_used_gb?: string | number
    quota_limit_gb?: number
    expiry_date?: string
    radius_username?: string
    radius_password?: string
  } | null
}

const ADMIN_TG_ID = 8869320234
const API = 'https://varminiapp.popserver.shop/api'

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth()

  const [tgId, setTgId] = useState(0)
  const [tgReady, setTgReady] = useState(false)

  useEffect(() => {
    let tries = 0
    const maxTries = 20

    const check = () => {
      const id = Number(
        (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 0
      )

      if (id > 0) {
        setTgId(id)
        setTgReady(true)
        return
      }

      tries += 1
      if (tries >= maxTries) {
        setTgId(0)
        setTgReady(true)
        return
      }
      setTimeout(check, 100)
    }

    check()
  }, [])

  const resolvedId = Number(user?.telegram_id || tgId || 0)

  const isAdmin =
    resolvedId === ADMIN_TG_ID ||
    user?.is_admin === true ||
    Number(user?.is_admin) === 1

  const checking = authLoading || !tgReady

  const [tab, setTab] = useState<'orders' | 'settings' | 'users'>('orders')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [settings, setSettings] = useState<PaymentSettings>({
    card_number: '',
    card_holder_name: '',
    card_to_card_enabled: true,
    gateway_enabled: false,
    gateway_provider: 'none',
  })
  const [saving, setSaving] = useState(false)

  const [rejectOrder, setRejectOrder] = useState<Order | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copiedUserField, setCopiedUserField] = useState('')

  const [actionLoading, setActionLoading] = useState<Record<number, string | null>>({})
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null)
  const [userActionMessage, setUserActionMessage] = useState<Record<number, { type: 'ok' | 'error'; text: string } | null>>({})

  const performUserAction = async (
    tgId: number,
    subscriptionId: number,
    action: 'admin_suspend_sub' | 'admin_resume_sub' | 'admin_delete_sub',
    successMsg: string
  ) => {
    setActionLoading((prev) => ({ ...prev, [tgId]: action }))
    setUserActionMessage((prev) => ({ ...prev, [tgId]: null }))
    try {
      const res = await fetch(`${API}/?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          subscription_id: subscriptionId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setUserActionMessage((prev) => ({ ...prev, [tgId]: { type: 'ok', text: successMsg } }))
        await loadUsers()
      } else {
        setUserActionMessage((prev) => ({ ...prev, [tgId]: { type: 'error', text: data.error || 'خطا در عملیات' } }))
      }
    } catch (e: any) {
      setUserActionMessage((prev) => ({ ...prev, [tgId]: { type: 'error', text: e?.message || 'خطای شبکه' } }))
    } finally {
      setActionLoading((prev) => ({ ...prev, [tgId]: null }))
    }
  }

  const togglePasswordVisibility = (tgId: number) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(tgId)) next.delete(tgId)
      else next.add(tgId)
      return next
    })
  }

  const copyUserField = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUserField(field)
      setTimeout(() => setCopiedUserField(''), 2000)
    } catch {
      // ignore
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/?action=pending_orders`)
      const data = await res.json()
      if (data.ok) setOrders(data.orders || [])
      else setError(data.error || 'خطا در دریافت سفارش‌ها')
    } catch (e: any) {
      setError(e?.message || 'خطای شبکه')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const res = await fetch(`${API}/?action=admin_users&admin_telegram_id=${resolvedId}`)
      const data = await res.json()
      if (data.ok) setUsers(data.users || [])
      else setUsersError(data.error || 'خطا در دریافت لیست کاربران')
    } catch (e: any) {
      setUsersError(e?.message || 'خطای شبکه')
    } finally {
      setUsersLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API}/?action=payment_settings`)
      const data = await res.json()
      if (data.ok && data.settings) {
        setSettings({
          card_number: data.settings.card_number || '',
          card_holder_name: data.settings.card_holder_name || '',
          card_to_card_enabled: !!data.settings.card_to_card_enabled,
          gateway_enabled: !!data.settings.gateway_enabled,
          gateway_provider: data.settings.gateway_provider || 'none',
        })
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت تنظیمات')
    }
  }

  const updateOrder = async (orderId: number, status: 'completed' | 'failed') => {
    setMessage('')
    setError('')
    try {
      const res = await fetch(`${API}/?action=update_order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          status,
          admin_telegram_id: resolvedId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage(status === 'completed' ? `سفارش #${orderId} تأیید شد` : `سفارش #${orderId} رد شد`)
        await loadOrders()
      } else {
        setError(data.error || 'خطا در بروزرسانی')
      }
    } catch (e: any) {
      setError(e?.message || 'خطای شبکه')
    }
  }

  const submitReject = async () => {
    if (!rejectOrder) return
    if (!rejectReason.trim()) {
      setRejectError('دلیل رد را وارد کنید')
      return
    }
    setRejecting(true)
    setRejectError('')
    try {
      const res = await fetch(`${API}/?action=update_order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: rejectOrder.id,
          status: 'failed',
          reject_reason: rejectReason.trim(),
          admin_telegram_id: resolvedId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage(`سفارش #${rejectOrder.id} رد شد`)
        setRejectOrder(null)
        setRejectReason('')
        await loadOrders()
      } else {
        setRejectError(data.error || 'خطا در بروزرسانی')
      }
    } catch (e: any) {
      setRejectError(e?.message || 'خطای شبکه')
    } finally {
      setRejecting(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`${API}/?action=update_payment_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          card_number: settings.card_number.trim(),
          card_holder_name: settings.card_holder_name.trim(),
          card_to_card_enabled: settings.card_to_card_enabled,
          gateway_enabled: settings.gateway_enabled,
          gateway_provider: settings.gateway_provider,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage('تنظیمات پرداخت ذخیره شد')
        await loadSettings()
      } else {
        setError(data.error || 'خطا در ذخیره')
      }
    } catch (e: any) {
      setError(e?.message || 'خطای شبکه')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadOrders()
    loadSettings()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-4">
        <div className="relative inline-flex">
          <div className="w-14 h-14 rounded-full border-2 border-primary-500/20"></div>
          <div className="absolute inset-0 w-14 h-14 rounded-full border-t-2 border-primary-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error-500/10 border border-error-500/20 mb-5">
            <svg className="w-8 h-8 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">دسترسی غیرمجاز</h1>
          <p className="text-gray-400 mb-2 text-sm">
            پنل ادمین فقط برای ادمین و از داخل تلگرام در دسترس است.
          </p>
          <p className="text-xs text-gray-500 mb-5" dir="ltr">
            id: {resolvedId || 'none'}
          </p>
          <Link to="/" className="text-primary-400 text-sm hover:text-primary-300 transition">بازگشت به خانه</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg p-4">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-xl font-bold text-white mb-1">پنل ادمین</h1>
        <p className="text-sm text-gray-400 mb-6">مدیریت سفارش‌ها و تنظیمات پرداخت</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 p-1 rounded-xl bg-navy-900/60 border border-navy-700/40 w-fit">
          <button
            onClick={() => setTab('orders')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'orders' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            سفارش‌ها
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'settings' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            تنظیمات پرداخت
          </button>
          <button
            onClick={() => { setTab('users'); if (users.length === 0) loadUsers() }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'users' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            کاربران
          </button>
        </div>

        {message && (
          <div className="mb-4 p-3.5 rounded-xl bg-success-500/10 border border-success-500/30 text-success-300 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {tab === 'orders' && (
          <>
            <button onClick={loadOrders} className="mb-5 px-4 py-2 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm hover:border-primary-500/30 transition-all duration-300">
              بروزرسانی لیست
            </button>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="relative inline-flex">
                  <div className="w-10 h-10 rounded-full border-2 border-primary-500/20"></div>
                  <div className="absolute inset-0 w-10 h-10 rounded-full border-t-2 border-primary-500 animate-spin"></div>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                سفارش pending وجود ندارد.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="glass-card glass-card-hover rounded-2xl p-4">
                    <div className="flex justify-between gap-2 mb-3">
                      <div className="font-bold text-white">#{o.id}</div>
                      <div className="text-warning-400 text-sm px-2.5 py-0.5 rounded-lg bg-warning-500/10 border border-warning-500/20">{o.status}</div>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1.5">
                      <div>پلن: <span className="text-white">{o.plan_name || o.plan_code || o.plan_id}</span></div>
                      <div>مبلغ: <span className="text-primary-400 font-semibold">{Number(o.amount).toLocaleString('fa-IR')} تومان</span></div>
                      <div>پیگیری: <span className="font-mono text-gray-400">{o.reference_number || '—'}</span></div>
                      <div>
                        کاربر: {o.first_name || '—'} {o.username ? `@${o.username}` : ''}{' '}
                        {o.telegram_id ? `(${o.telegram_id})` : ''}
                      </div>
                      <div className="text-gray-500 text-xs">{o.created_at}</div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => updateOrder(o.id, 'completed')}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-success-500 to-success-600 text-sm font-semibold hover:from-success-400 hover:to-success-500 transition-all duration-300 shadow-lg shadow-success-500/20"
                      >
                        تأیید
                      </button>
                      <button
                        onClick={() => { setRejectOrder(o); setRejectReason(''); setRejectError('') }}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-error-500 to-error-600 text-sm font-semibold hover:from-error-400 hover:to-error-500 transition-all duration-300 shadow-lg shadow-error-500/20"
                      >
                        رد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <button onClick={loadUsers} className="mb-5 px-4 py-2 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm hover:border-primary-500/30 transition-all duration-300">
              بروزرسانی لیست
            </button>

            {usersError && (
              <div className="mb-4 p-3.5 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                {usersError}
              </div>
            )}

            {usersLoading ? (
              <div className="flex justify-center py-8">
                <div className="relative inline-flex">
                  <div className="w-10 h-10 rounded-full border-2 border-primary-500/20"></div>
                  <div className="absolute inset-0 w-10 h-10 rounded-full border-t-2 border-primary-500 animate-spin"></div>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-400">
                کاربری یافت نشد.
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const sub = u.subscription
                  const hasSub = sub && sub.status === 'active'
                  return (
                    <div key={u.telegram_id} className="glass-card glass-card-hover rounded-2xl p-4">
                      <div className="flex justify-between gap-2 mb-3">
                        <div className="font-bold text-white">
                          {u.first_name || '—'} {u.last_name || ''}
                          {u.username ? ` @${u.username}` : ''}
                        </div>
                        <div className="font-mono text-xs text-gray-400" dir="ltr">
                          {u.telegram_id}
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1.5">
                        <div>اشتراک: <span className="text-white">{hasSub ? (sub?.plan_name || sub?.plan_code || 'فعال') : 'بدون اشتراک'}</span></div>
                        {hasSub && (
                          <>
                            <div>حجم: <span className="font-mono text-white">{sub?.quota_used_gb ?? '0'} / {sub?.quota_limit_gb ?? '0'} GB</span></div>
                            <div>انقضا: <span className="text-white">{sub?.expiry_date ? new Date(sub.expiry_date).toLocaleDateString('fa-IR') : '—'}</span></div>
                            <div>
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className="text-gray-400">یوزرنیم</span>
                                {sub?.radius_username && (
                                  <button
                                    onClick={() => copyUserField(sub.radius_username!, `user-${u.telegram_id}`)}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 transition-all duration-200 border border-primary-500/20"
                                  >
                                    {copiedUserField === `user-${u.telegram_id}` ? 'کپی شد' : 'کپی یوزرنیم'}
                                  </button>
                                )}
                              </div>
                              <span className="font-mono text-white break-all block bg-navy-800/40 px-3 py-2 rounded-lg border border-navy-700/30">
                                {sub?.radius_username || '—'}
                              </span>
                            </div>
                            <div>
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className="text-gray-400">پسورد</span>
                                <div className="flex gap-1.5">
                                  {sub?.radius_password && (
                                    <button
                                      onClick={() => togglePasswordVisibility(u.telegram_id)}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-navy-700/40 text-gray-300 hover:bg-navy-700/60 transition-all duration-200 border border-navy-600/40"
                                    >
                                      {visiblePasswords.has(u.telegram_id) ? 'مخفی' : 'نمایش'}
                                    </button>
                                  )}
                                  {sub?.radius_password && (
                                    <button
                                      onClick={() => copyUserField(sub.radius_password!, `pass-${u.telegram_id}`)}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 transition-all duration-200 border border-primary-500/20"
                                    >
                                      {copiedUserField === `pass-${u.telegram_id}` ? 'کپی شد' : 'کپی پسورد'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono text-white break-all block bg-navy-800/40 px-3 py-2 rounded-lg border border-navy-700/30">
                                {sub?.radius_password
                                  ? (visiblePasswords.has(u.telegram_id) ? sub.radius_password : '••••••')
                                  : '—'}
                              </span>
                            </div>
                          </>
                        )}
                        <div>وضعیت: <span className={hasSub ? 'text-success-400' : sub?.status === 'suspended' ? 'text-warning-400' : 'text-gray-500'}>{hasSub ? 'فعال' : sub?.status === 'suspended' ? 'قطع شده' : 'غیرفعال'}</span></div>
                      </div>

                      {sub?.id && (
                        <>
                          {userActionMessage[u.telegram_id] && (
                            <div className={`mt-3 p-3 rounded-xl text-sm ${userActionMessage[u.telegram_id]!.type === 'ok' ? 'bg-success-500/10 border border-success-500/30 text-success-300' : 'bg-error-500/10 border border-error-500/30 text-error-300'}`}>
                              {userActionMessage[u.telegram_id]!.text}
                            </div>
                          )}

                          <div className="flex gap-2 mt-4">
                            {sub.status === 'active' && (
                              <button
                                onClick={() => performUserAction(u.telegram_id, sub.id!, 'admin_suspend_sub', 'سرویس قطع شد')}
                                disabled={!!actionLoading[u.telegram_id]}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-warning-500 to-warning-600 text-sm font-semibold hover:from-warning-400 hover:to-warning-500 transition-all duration-300 shadow-lg shadow-warning-500/20 disabled:opacity-50"
                              >
                                {actionLoading[u.telegram_id] === 'admin_suspend_sub' ? 'در حال انجام...' : 'قطع سرویس'}
                              </button>
                            )}
                            {sub.status === 'suspended' && (
                              <button
                                onClick={() => performUserAction(u.telegram_id, sub.id!, 'admin_resume_sub', 'سرویس فعال شد')}
                                disabled={!!actionLoading[u.telegram_id]}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-success-500 to-success-600 text-sm font-semibold hover:from-success-400 hover:to-success-500 transition-all duration-300 shadow-lg shadow-success-500/20 disabled:opacity-50"
                              >
                                {actionLoading[u.telegram_id] === 'admin_resume_sub' ? 'در حال انجام...' : 'فعال‌سازی'}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteUserId(u.telegram_id)}
                              disabled={!!actionLoading[u.telegram_id]}
                              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-error-500 to-error-600 text-sm font-semibold hover:from-error-400 hover:to-error-500 transition-all duration-300 shadow-lg shadow-error-500/20 disabled:opacity-50"
                            >
                              {actionLoading[u.telegram_id] === 'admin_delete_sub' ? 'در حال انجام...' : 'حذف اشتراک'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'settings' && (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h2 className="font-bold text-white">کارت‌به‌کارت</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-2">شماره کارت</label>
              <input
                value={settings.card_number}
                onChange={(e) => setSettings({ ...settings, card_number: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all"
                placeholder="6037-...."
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">نام صاحب کارت</label>
              <input
                value={settings.card_holder_name}
                onChange={(e) => setSettings({ ...settings, card_holder_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all"
                placeholder="نام و نام خانوادگی"
              />
            </div>

            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.card_to_card_enabled}
                onChange={(e) => setSettings({ ...settings, card_to_card_enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-primary-500"
              />
              فعال بودن کارت‌به‌کارت
            </label>

            <hr className="border-navy-700/50" />

            <h2 className="font-bold text-white">درگاه آنلاین (اسکلت آینده)</h2>
            <p className="text-xs text-gray-500">
              فعلاً فقط اسکلت است. وقتی درگاه واقعی وصل شد، از اینجا فعال می‌شود.
            </p>

            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gateway_enabled}
                onChange={(e) => setSettings({ ...settings, gateway_enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-primary-500"
              />
              فعال‌سازی درگاه (فعلاً بدون اتصال واقعی)
            </label>

            <div>
              <label className="block text-sm text-gray-400 mb-2">پروایدر</label>
              <select
                value={settings.gateway_provider}
                onChange={(e) => setSettings({ ...settings, gateway_provider: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all"
              >
                <option value="none">none</option>
                <option value="zarinpal">Zarinpal</option>
                <option value="idpay">IDPay</option>
                <option value="nextpay">NextPay</option>
              </select>
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 glow-primary disabled:opacity-50"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </button>
          </div>
        )}

        {/* Reject Modal */}
        {rejectOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-1">رد سفارش #{rejectOrder.id}</h3>
              <p className="text-sm text-gray-400 mb-4">لطفاً دلیل رد این سفارش را وارد کنید.</p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-error-500/40 focus:border-error-500/50 transition-all resize-none"
                rows={3}
                placeholder="مثال: رسید نامعتبر، مبلغ ناقص..."
                autoFocus
              />

              {rejectError && (
                <div className="mt-3 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                  {rejectError}
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { setRejectOrder(null); setRejectReason(''); setRejectError('') }}
                  disabled={rejecting}
                  className="flex-1 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm font-semibold text-gray-300 hover:border-navy-600 transition-all duration-300 disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  onClick={submitReject}
                  disabled={rejecting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-error-500 to-error-600 text-sm font-semibold hover:from-error-400 hover:to-error-500 transition-all duration-300 shadow-lg shadow-error-500/20 disabled:opacity-50"
                >
                  {rejecting ? 'در حال رد...' : 'تأیید رد'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Subscription Confirm Modal */}
        {confirmDeleteUserId !== null && (() => {
          const userToDelete = users.find((u) => u.telegram_id === confirmDeleteUserId)
          const subId = userToDelete?.subscription?.id
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="glass-card rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-white mb-2">حذف اشتراک</h3>
                <p className="text-sm text-gray-400 mb-5">
                  آیا مطمئنید می‌خواهید اشتراک {userToDelete?.subscription?.radius_username || userToDelete?.first_name || confirmDeleteUserId} را حذف کنید؟ این عمل برگشت‌پذیر نیست.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDeleteUserId(null)}
                    disabled={!!actionLoading[confirmDeleteUserId]}
                    className="flex-1 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm font-semibold text-gray-300 hover:border-navy-600 transition-all duration-300 disabled:opacity-50"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={() => {
                      if (subId) {
                        performUserAction(confirmDeleteUserId, subId, 'admin_delete_sub', 'اشتراک حذف شد')
                        setConfirmDeleteUserId(null)
                      }
                    }}
                    disabled={!!actionLoading[confirmDeleteUserId]}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-error-500 to-error-600 text-sm font-semibold hover:from-error-400 hover:to-error-500 transition-all duration-300 shadow-lg shadow-error-500/20 disabled:opacity-50"
                  >
                    بله، حذف کن
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        <Link to="/" className="block text-center mt-8 text-sm text-primary-400 hover:text-primary-300 transition">
          بازگشت به خانه
        </Link>
      </div>
    </div>
  )
}
