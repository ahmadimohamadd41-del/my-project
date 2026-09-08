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

const ADMIN_TG_ID = 8869320234
const API = 'https://varminiapp.popserver.shop/api'

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth()

  const [tgId, setTgId] = useState(0)
  const [tgReady, setTgReady] = useState(false)

  // صبر برای آماده شدن Telegram WebApp (مهم)
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
        setTgReady(true) // وب یا بدون initData
        return
      }
      setTimeout(check, 100)
    }

    check()
  }, [])

  // شناسه نهایی: اول از Auth، بعد از تلگرام
  const resolvedId = Number(user?.telegram_id || tgId || 0)

  const isAdmin =
    resolvedId === ADMIN_TG_ID ||
    user?.is_admin === true ||
    Number(user?.is_admin) === 1

  const checking = authLoading || !tgReady

  // Stateهای سفارش‌ها و تنظیمات
  const [tab, setTab] = useState<'orders' | 'settings'>('orders')
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

  // در حال بررسی دسترسی
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <p className="text-gray-400 text-sm">در حال بررسی دسترسی...</p>
      </div>
    )
  }

  // دسترسی غیرمجاز
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">دسترسی غیرمجاز</h1>
          <p className="text-gray-400 mb-2 text-sm">
            پنل ادمین فقط برای ادمین و از داخل تلگرام در دسترس است.
          </p>
          <p className="text-xs text-gray-500 mb-4" dir="ltr">
            id: {resolvedId || 'none'}
          </p>
          <Link to="/" className="text-blue-400 text-sm">بازگشت به خانه</Link>
        </div>
      </div>
    )
  }

  // پنل ادمین (UI اصلی)
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-1">پنل ادمین</h1>
        <p className="text-sm text-gray-400 mb-4">مدیریت سفارش‌ها و تنظیمات پرداخت</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'orders' ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            سفارش‌ها
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'settings' ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            تنظیمات پرداخت
          </button>
        </div>

        {message && (
          <div className="mb-3 p-3 rounded bg-green-900/40 text-green-300 text-sm">{message}</div>
        )}
        {error && (
          <div className="mb-3 p-3 rounded bg-red-900/40 text-red-300 text-sm">{error}</div>
        )}

        {tab === 'orders' && (
          <>
            <button onClick={loadOrders} className="mb-4 px-4 py-2 rounded bg-gray-700 text-sm">
              بروزرسانی لیست
            </button>

            {loading ? (
              <p className="text-gray-400">در حال بارگذاری...</p>
            ) : orders.length === 0 ? (
              <p className="text-gray-400">سفارش pending وجود ندارد.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 rounded-xl bg-gray-800 border border-gray-700">
                    <div className="flex justify-between gap-2 mb-2">
                      <div className="font-bold">#{o.id}</div>
                      <div className="text-yellow-400 text-sm">{o.status}</div>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>پلن: {o.plan_name || o.plan_code || o.plan_id}</div>
                      <div>مبلغ: {Number(o.amount).toLocaleString('fa-IR')} تومان</div>
                      <div>پیگیری: {o.reference_number || '—'}</div>
                      <div>
                        کاربر: {o.first_name || '—'} {o.username ? `@${o.username}` : ''}{' '}
                        {o.telegram_id ? `(${o.telegram_id})` : ''}
                      </div>
                      <div className="text-gray-500 text-xs">{o.created_at}</div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => updateOrder(o.id, 'completed')}
                        className="flex-1 py-2 rounded bg-green-600 text-sm"
                      >
                        تأیید
                      </button>
                      <button
                        onClick={() => updateOrder(o.id, 'failed')}
                        className="flex-1 py-2 rounded bg-red-600 text-sm"
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

        {tab === 'settings' && (
          <div className="space-y-4 p-4 rounded-xl bg-gray-800 border border-gray-700">
            <h2 className="font-bold">کارت‌به‌کارت</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">شماره کارت</label>
              <input
                value={settings.card_number}
                onChange={(e) => setSettings({ ...settings, card_number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm"
                placeholder="6037-...."
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">نام صاحب کارت</label>
              <input
                value={settings.card_holder_name}
                onChange={(e) => setSettings({ ...settings, card_holder_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm"
                placeholder="نام و نام خانوادگی"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.card_to_card_enabled}
                onChange={(e) => setSettings({ ...settings, card_to_card_enabled: e.target.checked })}
              />
              فعال بودن کارت‌به‌کارت
            </label>

            <hr className="border-gray-700" />

            <h2 className="font-bold">درگاه آنلاین (اسکلت آینده)</h2>
            <p className="text-xs text-gray-500">
              فعلاً فقط اسکلت است. وقتی درگاه واقعی وصل شد، از اینجا فعال می‌شود.
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.gateway_enabled}
                onChange={(e) => setSettings({ ...settings, gateway_enabled: e.target.checked })}
              />
              فعال‌سازی درگاه (فعلاً بدون اتصال واقعی)
            </label>

            <div>
              <label className="block text-sm text-gray-400 mb-1">پروایدر</label>
              <select
                value={settings.gateway_provider}
                onChange={(e) => setSettings({ ...settings, gateway_provider: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm"
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
              className="w-full py-3 rounded-lg bg-blue-600 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </button>
          </div>
        )}

        <Link to="/" className="block text-center mt-6 text-sm text-blue-400">
          بازگشت به خانه
        </Link>
      </div>
    </div>
  )
}