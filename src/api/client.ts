import { vpsApi, cpanelApi } from '@/lib/api'

// Alignment with VPS PostgreSQL Schema types
export interface VPSPlan {
  id: string
  plan_code: string
  display_name: string
  quota_bytes: number
  duration_seconds: number
  price_amount: number
  price_currency: string
  plan_status: string
}

export interface VPSCustomerAccount {
  customer: {
    id: string
    external_ref: string
    display_name?: string
    contact_email?: string
    customer_status: string
    balance: number
    created_at?: string
  }
  subscription?: {
    id: string
    customer_id: string
    plan_id: string
    subscription_status: string
    valid_from?: string
    valid_until?: string
  }
  purchases: Array<{
    id: string
    plan_id: string
    status: string
    amount: number
    created_at?: string
  }>
}

// 1. VPS API Calls (Health, Customer, Usage)
// Note: plans now come from cPanel (see plansApi below)

export const plansApi = {
  /**
   * ✅ FIX: Plans now come from cPanel (not VPS)
   * تا وقتی ادمین قیمت یا وضعیت پلن را تغییر می‌دهد، فروشگاه فوری آپدیت شود
   */
  getAll: async (): Promise<VPSPlan[]> => {
    try {
      // cache-busting با timestamp
      const response = await cpanelApi.get(`?action=plans&_=${Date.now()}`)
      const cpanelPlans = response.data?.plans || []

      // Map cPanel format → VPSPlan
      return cpanelPlans.map((p: any) => ({
        id: String(p.id),
        plan_code: p.plan_code,
        display_name: p.name,
        quota_bytes: (Number(p.quota_gb) || 0) * 1024 * 1024 * 1024,
        duration_seconds: (Number(p.duration_days) || 30) * 86400,
        price_amount: Number(p.price_amount) || 0,
        price_currency: p.price_currency || 'IRR',
        plan_status: Number(p.is_active) === 1 ? 'active' : 'inactive',
      }))
    } catch (err) {
      console.error('Failed to fetch plans from cPanel:', err)
      return []
    }
  },
}

export const accountsApi = {
  getByExternalRef: async (externalRef: string | number): Promise<VPSCustomerAccount | null> => {
    try {
      const response = await vpsApi.get<VPSCustomerAccount>(`/v1/customers/${externalRef}`)
      return response.data
    } catch (err) {
      console.error(`Failed to fetch account for ref ${externalRef}:`, err)
      return null
    }
  },
}

export const healthApi = {
  get: async (): Promise<{ status: string; database: string }> => {
    try {
      const response = await vpsApi.get('/health')
      return response.data
    } catch (err) {
      return { status: 'unhealthy', database: 'disconnected' }
    }
  },
}

// 2. cPanel Business API Calls (Auth, Orders, Partner, Admin)
export const authApi = {
  telegram: async (initData: string): Promise<{ token: string; user: any }> => {
    const response = await cpanelApi.post('?action=auth', { init_data: initData })
    return response.data
  },
}

export const purchasesApi = {
  // ─── ایجاد سفارش جدید (با telegram_id و idempotency) ───
  createOrder: async (
    planCode: string,
    paymentMethod: 'card_to_card' | 'gateway' = 'card_to_card',
    referenceNumber?: string,
    telegramId?: number
  ) => {
    const response = await cpanelApi.post('?action=create_order', {
      plan_code: planCode,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      telegram_id: telegramId,
      idempotency_key: `web-${telegramId || 0}-${planCode}-${Date.now()}`,
    })
    return response.data
  },

  // ─── گرفتن تاریخچه سفارش‌ها ───
  getHistory: async () => {
    const response = await cpanelApi.get('?action=orders')
    return response.data
  },

  // ─── گرفتن اشتراک فعال کاربر (با اطلاعات اتصال) ───
  getMySubscription: async (telegramId: number) => {
    const response = await cpanelApi.get(`?action=my_subscription&telegram_id=${telegramId}`)
    return response.data
  },
}

export const adminApi = {
  getStats: async () => {
    const response = await cpanelApi.get('/admin.php?action=stats')
    return response.data
  },
}

export default {
  plans: plansApi,
  accounts: accountsApi,
  health: healthApi,
  auth: authApi,
  purchases: purchasesApi,
  admin: adminApi,
}