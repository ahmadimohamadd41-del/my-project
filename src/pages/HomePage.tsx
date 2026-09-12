import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTelegram } from '@/hooks/useTelegram'
import { accountsApi, healthApi, purchasesApi, VPSCustomerAccount } from '@/api/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import UsageBar from '@/components/UsageBar'
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
  const [accountData, setAccountData] = useState<VPSCustomerAccount | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [health, setHealth] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState('')

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(''), 2000)
    } catch {
      // ignore
    }
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
        <div className="relative inline-flex">
          <div className="w-14 h-14 rounded-full border-2 border-primary-500/20"></div>
          <div className="absolute inset-0 w-14 h-14 rounded-full border-t-2 border-primary-500 animate-spin"></div>
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
    accountData?.purchases?.some(
      (p) => p.status === 'pending' || p.status === 'PENDING'
    )
  )

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-6">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 glow-primary"
              >
                پنل ادمین
              </Link>
            )}
            <Link
              to="/support"
              className="p-2.5 rounded-xl bg-navy-800/60 hover:bg-navy-700/60 transition-all duration-300 border border-navy-700/40 hover:border-primary-500/30"
              aria-label="پشتیبانی"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </Link>
            <Link
              to="/account"
              className="p-2.5 rounded-xl bg-navy-800/60 hover:bg-navy-700/60 transition-all duration-300 border border-navy-700/40 hover:border-primary-500/30"
              aria-label="پروفایل"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* System Status */}
        <Card className="mb-6 p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            {(() => {
              const isOnline =
                health?.status === 'ok' ||
                health?.status === 'healthy' ||
                health?.ok === true

              if (!health && loading) {
                return (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-warning-500" />
                    <span className="text-sm text-gray-300">وضعیت سرویس: در حال بررسی</span>
                  </>
                )
              }

              if (isOnline) {
                return (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-success-500 status-pulse" />
                    <span className="text-sm text-gray-300">سرور آنلاین</span>
                  </>
                )
              }

              return (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-error-500" />
                  <span className="text-sm text-gray-300">سرور قطع / در دسترس نیست</span>
                </>
              )
            })()}
          </div>
        </Card>

        {hasActiveSubscription ? (
          <>
            <Card className="mb-6 p-6 animate-slide-up">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-white mb-1">اشتراک فعال</h2>
                <p className="text-primary-400 font-semibold">
                  پلن: {planName}
                </p>
              </div>

              <div className="mb-5">
                <UsageBar
                  used={used}
                  total={total}
                  label={`مصرف: ${used} / ${total} گیگابایت`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-xl bg-navy-800/40 border border-navy-700/30">
                  <p className="text-xl font-bold text-white">
                    {expiryDate ? new Date(expiryDate).toLocaleDateString('fa-IR') : 'نامحدود'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">تاریخ انقضا</p>
                </div>
                <div className="p-3 rounded-xl bg-navy-800/40 border border-navy-700/30">
                  <p className="text-xl font-bold text-white">
                    {walletBalance === null ? '...' : walletBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">موجودی (تومان)</p>
                </div>
              </div>

              {/* Connection Info — only when provisioned */}
              {hasProvision ? (
                <div className="mt-6 p-4 rounded-xl bg-navy-900/60 border border-primary-500/15">
                  <div className="text-sm text-primary-400 mb-4 font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    اطلاعات اتصال
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400">سرور</span>
                      <span className="font-mono text-white">Server-{subscriptionData?.server_code || '49'}</span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <span className="text-gray-400">یوزرنیم</span>
                        <button
                          onClick={() => copyToClipboard(subscriptionData?.radius_username || '', 'username')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 transition-all duration-200 border border-primary-500/20"
                        >
                          {copiedField === 'username' ? 'کپی شد' : 'کپی یوزرنیم'}
                        </button>
                      </div>
                      <span className="font-mono text-white break-all block bg-navy-800/40 px-3 py-2 rounded-lg border border-navy-700/30">
                        {subscriptionData?.radius_username}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <span className="text-gray-400">پسورد</span>
                        <button
                          onClick={() => copyToClipboard(subscriptionData?.radius_password || '', 'password')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 transition-all duration-200 border border-primary-500/20"
                        >
                          {copiedField === 'password' ? 'کپی شد' : 'کپی پسورد'}
                        </button>
                      </div>
                      <span className="font-mono text-white break-all block bg-navy-800/40 px-3 py-2 rounded-lg border border-navy-700/30">
                        {subscriptionData?.radius_password || '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <a
                        href={`https://varminiapp.popserver.shop/api/?action=download_config&telegram_id=${user?.telegram_id}&proto=tcp`}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:from-blue-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-blue-500/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        دانلود TCP
                      </a>
                      <a
                        href={`https://varminiapp.popserver.shop/api/?action=download_config&telegram_id=${user?.telegram_id}&proto=udp`}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold hover:from-green-400 hover:to-green-500 transition-all duration-300 shadow-lg shadow-green-500/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        دانلود UDP
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                /* Active but not yet provisioned */
                <div className="mt-6 p-4 rounded-xl bg-warning-500/10 border border-warning-500/20">
                  <p className="text-sm text-warning-400">
                    اشتراک فعال است؛ فعال‌سازی سرویس در صف است. به‌زودی اطلاعات اتصال نمایش داده می‌شود.
                  </p>
                </div>
              )}
            </Card>

            <Link to="/plans">
              <Button variant="primary" className="w-full">
                تمدید یا خرید پلن جدید
              </Button>
            </Link>
          </>
        ) : hasPendingOrder ? (
          <Card className="p-8 animate-slide-up">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning-500/10 border border-warning-500/20 mb-5">
                <svg className="w-8 h-8 text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">در صف تأیید هستید</h2>
              <p className="text-gray-400 mb-6">سفارش شما ثبت شده و در انتظار تأیید ادمین است.</p>
              <Link to="/plans">
                <Button variant="secondary" className="w-full">
                  مشاهده پلن‌ها
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-8 animate-slide-up">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/20 mb-5">
                <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">اشتراک فعال ندارید</h2>
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



