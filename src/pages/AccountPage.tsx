import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTelegram } from '@/hooks/useTelegram'
import { accountsApi, VPSCustomerAccount } from '@/api/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Link } from 'react-router-dom'

export default function AccountPage() {
  const { user } = useAuth()
  const { initDataUnsafe } = useTelegram()
  const [account, setAccount] = useState<VPSCustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)

  const telegramId = typeof initDataUnsafe.user === 'object'
    ? (initDataUnsafe.user as any)?.id
    : null

  useEffect(() => {
    if (!telegramId) {
      setLoading(false)
      return
    }

    accountsApi.getByExternalRef(telegramId.toString())
      .then(data => setAccount(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [telegramId])

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
                  {account?.customer?.balance ? account.customer.balance.toLocaleString() : (user.balance ? user.balance.toLocaleString() : '0')} تومان
                </span>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 animate-slide-up">
          <h2 className="text-lg font-bold text-white mb-5">تاریخچه خریدها</h2>

          {account?.purchases && account.purchases.length > 0 ? (
            <div className="space-y-3">
              {account.purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="p-4 bg-navy-900/40 rounded-xl flex justify-between items-center border border-navy-700/30 hover:border-primary-500/20 transition-all duration-300"
                >
                  <div>
                    <p className="text-white font-semibold">پلن #{purchase.plan_id}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {purchase.created_at ? new Date(purchase.created_at).toLocaleDateString('fa-IR') : 'ثبت شده'}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-primary-400 font-bold">
                      {purchase.amount.toLocaleString()} تومان
                    </p>
                    <span className={`inline-block px-2.5 py-1 text-xs rounded-lg mt-1 font-medium ${
                      purchase.status === 'completed' || purchase.status === 'COMPLETED'
                        ? 'bg-success-500/15 text-success-400'
                        : purchase.status === 'pending' || purchase.status === 'PENDING'
                        ? 'bg-warning-500/15 text-warning-400'
                        : 'bg-error-500/15 text-error-400'
                    }`}>
                      {purchase.status === 'completed' || purchase.status === 'COMPLETED' ? 'موفق' :
                       purchase.status === 'pending' || purchase.status === 'PENDING' ? 'در حال بررسی' : 'ناموفق'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>هنوز خریدی ثبت نکرده‌اید.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
