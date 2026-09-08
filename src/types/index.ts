export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

export interface Plan {
  id: string
  name: string
  quota_gb: number
  duration_days: number
  price_amount: number
  price_currency: string
  is_active: boolean
  max_speed_mbps?: number
}

export interface Subscription {
  id: string
  customer_id: string
  plan_id: string
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  start_date: string
  expiry_date: string
  remaining_days: number
  quota_limit_gb: number
  quota_used_gb: number
  quota_remaining_gb: number
  plan?: Plan
}

export interface Purchase {
  id: string
  customer_id: string
  plan_id: string
  amount: number
  currency: string
  status: 'completed' | 'pending' | 'failed' | 'cancelled'
  transaction_id?: string
  reference_number?: string
  created_at: string
  completed_at?: string
}

export interface Customer {
  id: string
  telegram_id: number
  username?: string
  first_name?: string
  last_name?: string
  photo_url?: string
  balance?: number
  is_partner?: boolean
  partner_id?: string
}

export interface UserAccount {
  customer: Customer
  subscription?: Subscription
  entitlements: Entitlement[]
  purchases: Purchase[]
}

export interface Entitlement {
  id: string
  customer_id: string
  type: string
  value: string
  expires_at?: string
}

export interface Partner {
  id: string
  customer_id: string
  balance: number
  min_wallet_balance: number
  is_approved: boolean
  approved_at?: string
  approved_by?: number
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface Settings {
  card_to_card_enabled: boolean
  partner_registration_enabled: boolean
  maintenance_mode: boolean
  min_partner_balance: number
  [key: string]: unknown
}

export interface SystemHealth {
  api_status: 'online' | 'offline'
  database_status: 'online' | 'offline'
  radius_status: 'online' | 'offline'
  last_check: string
}