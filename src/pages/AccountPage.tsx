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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-right p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              بازگشت به اصلی
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">اطلاعات حساب</h1>
        </header>

        {/* User Info Card */}
        {user && (
          <Card className="mb-6 p-6">
            <div className="flex items-center gap-4 mb-4">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.first_name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user.first_name ? user.first_name[0] : 'U'}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.first_name} {user.last_name || ''}
                </h2>
                {user.username && (
                  <p className="text-gray-400 text-sm">@{user.username}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  شناسه تلگرام: {user.telegram_id || telegramId}
                </p>
              </div>
            </div>

            {/* Wallet Section */}
            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">موجودی کیف پول:</span>
                <span className="text-xl font-bold text-primary-500">
                  {account?.customer?.balance ? account.customer.balance.toLocaleString() : (user.balance ? user.balance.toLocaleString() : '0')} تومان
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Purchase History */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">تاریخچه خریدها</h2>

          {account?.purchases && account.purchases.length > 0 ? (
            <div className="space-y-4">
              {account.purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="p-4 bg-gray-800/50 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-medium">پلن #{purchase.plan_id}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {purchase.created_at ? new Date(purchase.created_at).toLocaleDateString('fa-IR') : 'ثبت شده'}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-primary-500 font-bold">
                      {purchase.amount.toLocaleString()} تومان
                    </p>
                    <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                      purchase.status === 'completed' || purchase.status === 'COMPLETED'
                        ? 'bg-green-900/30 text-green-400'
                        : purchase.status === 'pending' || purchase.status === 'PENDING'
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-red-900/30 text-red-400'
                    }`}>
                      {purchase.status === 'completed' || purchase.status === 'COMPLETED' ? 'موفق' :
                       purchase.status === 'pending' || purchase.status === 'PENDING' ? 'در حال بررسی' : 'ناموفق'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>هنوز خریدی ثبت نکرده‌اید.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
