import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTelegram } from '@/hooks/useTelegram'
import { accountsApi, healthApi, purchasesApi, VPSCustomerAccount } from '@/api/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import UsageBar from '@/components/UsageBar'
import { Link } from 'react-router-dom'
import { FiAlertCircle } from 'react-icons/fi'

// تایپ برای اطلاعات اشتراک از cPanel
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
  const [accountData, setAccountData] = useState<VPSCustomerAccount | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [health, setHealth] = useState<{ status: string; database: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const externalRef = typeof initDataUnsafe.user === 'object'
    ? (initDataUnsafe.user as any)?.id?.toString()
    : null

  // ============================================================
  // تشخیص ادمین برای نمایش دکمه پنل ادمین
  // ============================================================
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
        // گرفتن اطلاعات از VPS و cPanel همزمان
        const [accData, healthData, subData] = await Promise.all([
          externalRef ? accountsApi.getByExternalRef(externalRef) : Promise.resolve(null),
          healthApi.get(),
          user?.telegram_id ? purchasesApi.getMySubscription(user.telegram_id) : Promise.resolve(null),
        ])
        setAccountData(accData)
        setHealth(healthData)
        if (subData?.ok && subData.subscription) {
          setSubscriptionData(subData.subscription)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // ============================================================
  // 🔥 تغییر اصلی: استفاده از subscriptionData به جای accountData
  // ============================================================
  const hasActiveSubscription = subscriptionData?.status === 'active'
  const used = Number(subscriptionData?.quota_used_gb ?? 0)
  const total = Number(subscriptionData?.quota_limit_gb ?? 50)
  const expiryDate = subscriptionData?.expiry_date
  const planName = subscriptionData?.plan_name || subscriptionData?.plan_code || 'پلن فعال'

  // اطلاعات اتصال
  const hasProvision = subscriptionData?.radius_username && subscriptionData?.radius_password

  return (
    <div className="min-h-screen bg-gray-900 text-right p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">خوش آمدید</h1>
            {user && (
              <p className="text-gray-400">
                {user.first_name} {user.last_name || ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showAdmin && (
              <Link
                to="/admin"
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
              >
                پنل ادمین
              </Link>
            )}
            <Link
              to="/account"
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="پروفایل"
            >
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* System Status */}
        {health && (
          <Card className="mb-6 p-4">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${
                health.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-gray-300">
                وضعیت سرویس: {health.status === 'healthy' ? 'آنلاین' : 'در حال بررسی'}
              </span>
            </div>
          </Card>
        )}

        {/* ============================================================
            🔥 اشتراک فعال — از subscriptionData
            ============================================================ */}
        {hasActiveSubscription ? (
          <>
            <Card className="mb-6 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-2">اشتراک فعال</h2>
                <p className="text-primary-400 font-medium">
                  پلن: {planName}
                </p>
              </div>

              <div className="mb-4">
                <UsageBar
                  used={used}
                  total={total}
                  label={`مصرف: ${used} / ${total} گیگابایت`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {expiryDate ? new Date(expiryDate).toLocaleDateString('fa-IR') : 'نامحدود'}
                  </p>
                  <p className="text-sm text-gray-400">تاریخ انقضا</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {accountData?.customer?.balance?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-gray-400">موجودی (تومان)</p>
                </div>
              </div>

              {/* ============================================================
                  🔥 کارت اطلاعات اتصال
                  ============================================================ */}
              <div className="mt-6 p-4 rounded-xl bg-gray-800/80 border border-gray-700">
                <div className="text-sm text-green-400 mb-3">📡 اطلاعات اتصال</div>

                {!hasProvision ? (
                  <p className="text-sm text-yellow-400">
                    اشتراک ثبت شده؛ فعال‌سازی سرویس در صف است.
                  </p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">سرور</span>
                      <span className="font-mono text-white">Server-{subscriptionData?.server_code || '49'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">یوزرنیم</span>
                      <span className="font-mono text-white break-all">{subscriptionData?.radius_username}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">پسورد</span>
                      <span className="font-mono text-white break-all">
                        {subscriptionData?.radius_password || '—'}
                      </span>
                    </div>
                    {subscriptionData?.config_url && (
                      <a
                        href={subscriptionData.config_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center mt-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm"
                      >
                        📥 دریافت کانفیگ
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Link to="/plans">
              <Button variant="primary" className="w-full">
                تمدید یا خرید پلن جدید
              </Button>
            </Link>
          </>
        ) : (
          <Card className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-white mb-4">اشتراک فعال ندارید</h2>
              <p className="text-gray-400 mb-6">برای استفاده از سرویس VPN، لطفاً یک پلن انتخاب کنید.</p>
              <Link to="/plans">
                <Button variant="primary" className="w-full">
                  مشاهده پلن‌ها و خرید
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}