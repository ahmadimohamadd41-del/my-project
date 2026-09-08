import { useState, useEffect } from 'react'
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

export default function PlansPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<VPSPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<VPSPlan | null>(null)
  const [refNumber, setRefNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState<PaymentSettings>({
    card_number: '',
    card_holder_name: '',
  })

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

    const telegramId =
      Number(user?.telegram_id) ||
      Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) ||
      0

    console.log('purchase telegramId=', telegramId, 'user=', user)

    if (!telegramId) {
      alert('هویت تلگرام شناسایی نشد. لطفاً اپ را از داخل تلگرام (لینک ربات) باز کنید.')
      return
    }

    if (!refNumber.trim()) {
      alert('لطفاً شماره پیگیری را وارد کنید.')
      return
    }

    setSubmitting(true)
    try {
      await purchasesApi.createOrder(
        selectedPlan.plan_code,
        'card_to_card',
        refNumber.trim(),
        telegramId
      )
      setSuccessMessage('سفارش شما با موفقیت ثبت شد و پس از بررسی فعال خواهد شد.')
      setTimeout(() => {
        setSelectedPlan(null)
        setSuccessMessage(null)
        setRefNumber('')
      }, 3000)
    } catch (e: any) {
      alert('خطا در ثبت سفارش: ' + (e?.response?.data?.error || e.message))
    } finally {
      setSubmitting(false)
    }
  }

  const formatQuota = (bytes: number) => {
    if (!bytes) return '0 GB'
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(0)} گیگابایت`
    return `${(bytes / (1024 * 1024)).toFixed(0)} مگابایت`
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
                onClick={() => setSelectedPlan(plan)}
              >
                خرید پلن
              </Button>
            </Card>
          ))}
        </div>

        {/* Purchase Modal */}
        {selectedPlan && (
          <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="w-full max-w-md p-6 animate-slide-up">
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
              ) : (
                <>
                  <div className="mb-6 space-y-2.5 text-sm text-gray-300">
                    <div className="flex justify-between p-2.5 rounded-lg bg-navy-900/40">
                      <span>حجم ترافیک:</span>
                      <span className="font-bold text-white">{formatQuota(selectedPlan.quota_bytes)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg bg-navy-900/40">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="font-bold text-primary-400">{selectedPlan.price_amount?.toLocaleString()} تومان</span>
                    </div>
                  </div>

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

                  <div className="mb-6">
                    <Input
                      label="شماره پیگیری / ارجاع کارت به کارت"
                      placeholder="مثلاً: 12345678"
                      value={refNumber}
                      onChange={e => setRefNumber(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedPlan(null)}
                      disabled={submitting}
                    >
                      انصراف
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handlePurchase}
                      loading={submitting}
                    >
                      ثبت و تأیید پرداخت
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
