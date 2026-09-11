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

type AdminPlan = {
  id: string
  plan_code: string
  name: string
  name_en?: string
  quota_gb: number
  duration_days: number
  price_amount: string | number
  price_currency: string
  is_active: number
}

type Ticket = {
  id: number
  subject: string
  status: 'open' | 'answered' | 'closed'
  last_sender: 'user' | 'admin'
  created_at: string
  updated_at: string
  telegram_id: number
  first_name?: string
  username?: string
  message_count: number
  last_message?: string
}

type TicketMessage = {
  id: number
  sender: 'user' | 'admin'
  message: string
  created_at: string
}

type Template = {
  template_key: string
  title: string
  template_text: string
  description?: string
  updated_at: string
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

  const [tab, setTab] = useState<'orders' | 'plans' | 'tickets' | 'templates' | 'settings' | 'users'>('orders')
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

  // ─── Plans state ───
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [editingPlan, setEditingPlan] = useState<Record<string, { price?: number | string; is_active?: boolean }>>({})
  const [planActionLoading, setPlanActionLoading] = useState<Record<string, boolean>>({})
  const [planMessage, setPlanMessage] = useState<Record<string, { type: 'ok' | 'error'; text: string } | null>>({})

  // ─── Create Plan state ───
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    plan_code: '',
    name: '',
    name_en: '',
    quota_gb: 20,
    duration_days: 30,
    price_amount: 50000,
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // ─── Delete Plan state ───
  const [deleteModalPlan, setDeleteModalPlan] = useState<AdminPlan | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // ─── Tickets state ───
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([])
  const [ticketMessagesLoading, setTicketMessagesLoading] = useState(false)
  const [ticketReply, setTicketReply] = useState('')
  const [ticketReplyLoading, setTicketReplyLoading] = useState(false)
  const [ticketReplyError, setTicketReplyError] = useState('')
  const [ticketActionLoading, setTicketActionLoading] = useState<Record<number, boolean>>({})
  const [ticketActionMessage, setTicketActionMessage] = useState('')

  const needsReplyCount = tickets.filter((t) => t.status === 'open' && t.last_sender === 'user').length

  // ─── Templates state ───
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateEditText, setTemplateEditText] = useState('')
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateSaveError, setTemplateSaveError] = useState('')
  const [templateMessage, setTemplateMessage] = useState('')

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

  const loadPlans = async () => {
    setPlansLoading(true)
    setPlansError('')
    try {
      const res = await fetch(`${API}/?action=admin_plans&admin_telegram_id=${resolvedId}`)
      const data = await res.json()
      if (data.ok) setPlans(data.plans || [])
      else setPlansError(data.error || 'خطا در دریافت پلن‌ها')
    } catch (e: any) {
      setPlansError(e?.message || 'خطای شبکه')
    } finally {
      setPlansLoading(false)
    }
  }

  const updatePlan = async (
    planId: string,
    changes: { price_amount?: number | string; is_active?: number }
  ) => {
    setPlanActionLoading((prev) => ({ ...prev, [planId]: true }))
    setPlanMessage((prev) => ({ ...prev, [planId]: null }))
    try {
      const res = await fetch(`${API}/?action=admin_update_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          plan_id: planId,
          ...changes,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setPlanMessage((prev) => ({ ...prev, [planId]: { type: 'ok', text: 'ذخیره شد' } }))
        setEditingPlan((prev) => {
          const next = { ...prev }
          delete next[planId]
          return next
        })
        await loadPlans()
        setTimeout(() => {
          setPlanMessage((prev) => ({ ...prev, [planId]: null }))
        }, 2500)
      } else {
        setPlanMessage((prev) => ({ ...prev, [planId]: { type: 'error', text: data.error || 'خطا در ذخیره' } }))
      }
    } catch (e: any) {
      setPlanMessage((prev) => ({ ...prev, [planId]: { type: 'error', text: e?.message || 'خطای شبکه' } }))
    } finally {
      setPlanActionLoading((prev) => ({ ...prev, [planId]: false }))
    }
  }

  const createPlan = async () => {
    setCreateLoading(true)
    setCreateError('')
    try {
      const res = await fetch(`${API}/?action=admin_create_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          ...createForm,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setShowCreateModal(false)
        setCreateForm({
          plan_code: '',
          name: '',
          name_en: '',
          quota_gb: 20,
          duration_days: 30,
          price_amount: 50000,
        })
        setMessage('پلن جدید با موفقیت اضافه شد')
        await loadPlans()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setCreateError(data.error || 'خطا در افزودن پلن')
      }
    } catch (e: any) {
      setCreateError(e?.message || 'خطای شبکه')
    } finally {
      setCreateLoading(false)
    }
  }

  const deletePlan = async () => {
    if (!deleteModalPlan) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const res = await fetch(`${API}/?action=admin_delete_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          plan_id: deleteModalPlan.id,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setDeleteModalPlan(null)
        setMessage('پلن حذف شد')
        await loadPlans()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setDeleteError(data.error || 'خطا در حذف پلن')
      }
    } catch (e: any) {
      setDeleteError(e?.message || 'خطای شبکه')
    } finally {
      setDeleteLoading(false)
    }
  }

  const loadTickets = async () => {
    setTicketsLoading(true)
    setTicketsError('')
    try {
      const res = await fetch(`${API}/?action=admin_tickets&admin_telegram_id=${resolvedId}`)
      const data = await res.json()
      if (data.ok) setTickets(data.tickets || [])
      else setTicketsError(data.error || 'خطا در دریافت تیکت‌ها')
    } catch (e: any) {
      setTicketsError(e?.message || 'خطای شبکه')
    } finally {
      setTicketsLoading(false)
    }
  }

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setTicketReply('')
    setTicketReplyError('')
    setTicketMessagesLoading(true)
    setTicketMessages([])
    try {
      const res = await fetch(`${API}/?action=ticket_detail&telegram_id=${ticket.telegram_id}&ticket_id=${ticket.id}`)
      const data = await res.json()
      if (data.ok && data.messages) {
        setTicketMessages(data.messages)
      } else {
        setTicketReplyError(data.error || 'خطا در دریافت پیام‌ها')
      }
    } catch (e: any) {
      setTicketReplyError(e?.message || 'خطای شبکه')
    } finally {
      setTicketMessagesLoading(false)
    }
  }

  const submitTicketReply = async () => {
    if (!selectedTicket) return
    if (!ticketReply.trim()) {
      setTicketReplyError('پیام خالی است')
      return
    }
    setTicketReplyLoading(true)
    setTicketReplyError('')
    try {
      const res = await fetch(`${API}/?action=admin_reply_ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          ticket_id: selectedTicket.id,
          message: ticketReply.trim(),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTicketReply('')
        await openTicket(selectedTicket)
        await loadTickets()
      } else {
        setTicketReplyError(data.error || 'خطا در ارسال پاسخ')
      }
    } catch (e: any) {
      setTicketReplyError(e?.message || 'خطای شبکه')
    } finally {
      setTicketReplyLoading(false)
    }
  }

  const closeTicket = async (ticketId: number) => {
    setTicketActionLoading((prev) => ({ ...prev, [ticketId]: true }))
    setTicketActionMessage('')
    try {
      const res = await fetch(`${API}/?action=admin_close_ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          ticket_id: ticketId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTicketActionMessage('تیکت بسته شد')
        setSelectedTicket(null)
        await loadTickets()
        setTimeout(() => setTicketActionMessage(''), 3000)
      } else {
        setTicketActionMessage(data.error || 'خطا در بستن تیکت')
      }
    } catch (e: any) {
      setTicketActionMessage(e?.message || 'خطای شبکه')
    } finally {
      setTicketActionLoading((prev) => ({ ...prev, [ticketId]: false }))
    }
  }

  const loadTemplates = async () => {
    setTemplatesLoading(true)
    setTemplatesError('')
    try {
      const res = await fetch(`${API}/?action=admin_templates&admin_telegram_id=${resolvedId}`)
      const data = await res.json()
      if (data.ok) setTemplates(data.templates || [])
      else setTemplatesError(data.error || 'خطا در دریافت پیام‌ها')
    } catch (e: any) {
      setTemplatesError(e?.message || 'خطای شبکه')
    } finally {
      setTemplatesLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!editingTemplate) return
    setTemplateSaving(true)
    setTemplateSaveError('')
    try {
      const res = await fetch(`${API}/?action=admin_update_template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: resolvedId,
          template_key: editingTemplate.template_key,
          template_text: templateEditText,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTemplateMessage('پیام ذخیره شد')
        setEditingTemplate(null)
        await loadTemplates()
        setTimeout(() => setTemplateMessage(''), 3000)
      } else {
        setTemplateSaveError(data.error || 'خطا در ذخیره')
      }
    } catch (e: any) {
      setTemplateSaveError(e?.message || 'خطای شبکه')
    } finally {
      setTemplateSaving(false)
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
        <p className="text-sm text-gray-400 mb-6">مدیریت سفارش‌ها، پلن‌ها و کاربران</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 p-1 rounded-xl bg-navy-900/60 border border-navy-700/40 w-fit flex-wrap">
          <button
            onClick={() => setTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'orders' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            سفارش‌ها
          </button>
          <button
            onClick={() => { setTab('plans'); if (plans.length === 0) loadPlans() }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'plans' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            پلن‌ها
          </button>
          <button
            onClick={() => { setTab('tickets'); if (tickets.length === 0) loadTickets() }}
            className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'tickets' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            تیکت‌ها
            {needsReplyCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-error-500 text-white text-xs font-bold border-2 border-navy-900">
                {needsReplyCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('templates'); if (templates.length === 0) loadTemplates() }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'templates' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            پیام‌ها
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'settings' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            تنظیمات
          </button>
          <button
            onClick={() => { setTab('users'); if (users.length === 0) loadUsers() }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'users' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white glow-primary' : 'text-gray-400 hover:text-gray-200'}`}
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

        {/* ─── Plans Tab ─── */}
        {tab === 'plans' && (
          <>
            <div className="flex gap-2 mb-5">
              <button onClick={loadPlans} className="px-4 py-2 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm hover:border-primary-500/30 transition-all duration-300">
                بروزرسانی
              </button>
              <button
                onClick={() => { setShowCreateModal(true); setCreateError('') }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-success-500 to-success-600 text-sm font-semibold hover:from-success-400 hover:to-success-500 transition-all duration-300 shadow-lg shadow-success-500/20"
              >
                + افزودن پلن جدید
              </button>
            </div>

            {plansError && (
              <div className="mb-4 p-3.5 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                {plansError}
              </div>
            )}

            {plansLoading ? (
              <div className="flex justify-center py-8">
                <div className="relative inline-flex">
                  <div className="w-10 h-10 rounded-full border-2 border-primary-500/20"></div>
                  <div className="absolute inset-0 w-10 h-10 rounded-full border-t-2 border-primary-500 animate-spin"></div>
                </div>
              </div>
            ) : plans.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-400">
                پلنی یافت نشد.
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((p) => {
                  const isActive = p.is_active === 1
                  const edit = editingPlan[p.id] || {}
                  const currentPrice = Number(p.price_amount) || 0
                  const editPrice = edit.price !== undefined ? Number(edit.price) : currentPrice
                  const editActive = edit.is_active !== undefined ? edit.is_active : isActive
                  const hasChange = editPrice !== currentPrice || editActive !== isActive
                  const isLoading = !!planActionLoading[p.id]
                  const msg = planMessage[p.id]

                  return (
                    <div key={p.id} className={`glass-card glass-card-hover rounded-2xl p-4 ${!isActive ? 'opacity-60' : ''}`}>
                      <div className="flex justify-between gap-2 mb-3">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs px-2.5 py-0.5 rounded-lg border ${isActive ? 'text-success-400 bg-success-500/10 border-success-500/20' : 'text-gray-500 bg-navy-800/60 border-navy-700/40'}`}>
                            {isActive ? 'فعال' : 'غیرفعال'}
                          </div>
                          <button
                            onClick={() => { setDeleteModalPlan(p); setDeleteError('') }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-error-500/15 text-error-300 hover:bg-error-500/25 transition-all duration-200 border border-error-500/20"
                          >
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-gray-300 space-y-1.5 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">کد پلن</span>
                          <span className="font-mono text-white" dir="ltr">{p.plan_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">حجم</span>
                          <span className="text-white">{p.quota_gb} گیگابایت</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">مدت</span>
                          <span className="text-white">{p.duration_days} روز</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1.5">قیمت (تومان)</label>
                        <input
                          type="number"
                          value={edit.price !== undefined ? edit.price : currentPrice}
                          onChange={(e) => {
                            const val = e.target.value
                            setEditingPlan((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], price: val === '' ? '' : Number(val) },
                            }))
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all font-mono"
                          dir="ltr"
                          min={0}
                          step={1000}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          فعلی: {currentPrice.toLocaleString('fa-IR')} تومان
                        </p>
                      </div>

                      <label className="flex items-center gap-3 text-sm cursor-pointer mb-4">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => {
                            setEditingPlan((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], is_active: e.target.checked },
                            }))
                          }}
                          className="w-4 h-4 rounded accent-primary-500"
                        />
                        نمایش به کاربران (فعال)
                      </label>

                      {msg && (
                        <div className={`mb-3 p-2.5 rounded-xl text-xs ${msg.type === 'ok' ? 'bg-success-500/10 border border-success-500/30 text-success-300' : 'bg-error-500/10 border border-error-500/30 text-error-300'}`}>
                          {msg.text}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          const changes: { price_amount?: number; is_active?: number } = {}
                          if (editPrice !== currentPrice) changes.price_amount = editPrice
                          if (editActive !== isActive) changes.is_active = editActive ? 1 : 0
                          if (Object.keys(changes).length > 0) {
                            updatePlan(p.id, changes)
                          }
                        }}
                        disabled={!hasChange || isLoading}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                          hasChange && !isLoading
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 glow-primary'
                            : 'bg-navy-800/60 text-gray-500 border border-navy-700/40 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? 'در حال ذخیره...' : hasChange ? 'ذخیره تغییرات' : 'تغییری وجود ندارد'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Tickets Tab ─── */}
        {tab === 'tickets' && (
          <>
            <button onClick={loadTickets} className="mb-5 px-4 py-2 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm hover:border-primary-500/30 transition-all duration-300">
              بروزرسانی لیست
            </button>

            {ticketActionMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-success-500/10 border border-success-500/30 text-success-300 text-sm">
                {ticketActionMessage}
              </div>
            )}

            {ticketsError && (
              <div className="mb-4 p-3.5 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                {ticketsError}
              </div>
            )}

            {ticketsLoading ? (
              <div className="flex justify-center py-8">
                <div className="relative inline-flex">
                  <div className="w-10 h-10 rounded-full border-2 border-primary-500/20"></div>
                  <div className="absolute inset-0 w-10 h-10 rounded-full border-t-2 border-primary-500 animate-spin"></div>
                </div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-400">
                تیکتی وجود ندارد.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => {
                  const needsReply = t.status === 'open' && t.last_sender === 'user'
                  const isAnswered = t.status === 'answered'
                  const isClosed = t.status === 'closed'
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTicket(t)}
                      className="glass-card glass-card-hover rounded-2xl p-4 cursor-pointer"
                    >
                      <div className="flex justify-between gap-2 mb-2">
                        <div className="font-bold text-white text-sm">{t.subject}</div>
                        {needsReply ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-error-500/10 border border-error-500/20 text-error-400 whitespace-nowrap">نیاز به پاسخ</span>
                        ) : isAnswered ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-success-500/10 border border-success-500/20 text-success-400 whitespace-nowrap">پاسخ داده شده</span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-navy-800/60 border border-navy-700/40 text-gray-500 whitespace-nowrap">بسته شده</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div className="text-gray-400">
                          {t.first_name || '—'} {t.username ? `@${t.username}` : ''}{' '}
                          {t.telegram_id ? `(${t.telegram_id})` : ''}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {t.message_count} پیام · {new Date(t.updated_at).toLocaleString('fa-IR')}
                        </div>
                        {t.last_message && (
                          <div className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {t.last_message.length > 100 ? t.last_message.slice(0, 100) + '...' : t.last_message}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Templates Tab ─── */}
        {tab === 'templates' && (
          <>
            <button onClick={loadTemplates} className="mb-5 px-4 py-2 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm hover:border-primary-500/30 transition-all duration-300">
              بروزرسانی لیست
            </button>

            {templateMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-success-500/10 border border-success-500/30 text-success-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {templateMessage}
              </div>
            )}

            {templatesError && (
              <div className="mb-4 p-3.5 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                {templatesError}
              </div>
            )}

            {templatesLoading ? (
              <div className="flex justify-center py-8">
                <div className="relative inline-flex">
                  <div className="w-10 h-10 rounded-full border-2 border-primary-500/20"></div>
                  <div className="absolute inset-0 w-10 h-10 rounded-full border-t-2 border-primary-500 animate-spin"></div>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-400">
                پیامی یافت نشد.
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div key={tpl.template_key} className="glass-card glass-card-hover rounded-2xl p-4">
                    <div className="flex justify-between gap-2 mb-2">
                      <div className="font-bold text-white">{tpl.title}</div>
                      <button
                        onClick={() => { setEditingTemplate(tpl); setTemplateEditText(tpl.template_text); setTemplateSaveError('') }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 transition-all duration-200 border border-primary-500/20"
                      >
                        ویرایش
                      </button>
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-gray-400 mb-2">{tpl.description}</p>
                    )}
                    <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                      {tpl.template_text.length > 100 ? tpl.template_text.slice(0, 100) + '...' : tpl.template_text}
                    </p>
                    <p className="text-xs text-gray-500">آخرین ویرایش: {new Date(tpl.updated_at).toLocaleString('fa-IR')}</p>
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
                  const hasSub = sub && (sub.status === 'active' || sub.status === 'suspended')
                  const isActive = sub && sub.status === 'active'
                  const isSuspended = sub && sub.status === 'suspended'
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
                        <div>
                          وضعیت:{' '}
                          <span className={isActive ? 'text-success-400' : isSuspended ? 'text-warning-400' : 'text-gray-500'}>
                            {isActive ? 'فعال' : isSuspended ? 'قطع شده' : 'غیرفعال'}
                          </span>
                        </div>
                      </div>

                      {sub?.id && (
                        <>
                          {userActionMessage[u.telegram_id] && (
                            <div className={`mt-3 p-3 rounded-xl text-sm ${userActionMessage[u.telegram_id]!.type === 'ok' ? 'bg-success-500/10 border border-success-500/30 text-success-300' : 'bg-error-500/10 border border-error-500/30 text-error-300'}`}>
                              {userActionMessage[u.telegram_id]!.text}
                            </div>
                          )}

                          <div className="flex gap-2 mt-4">
                            {isActive && (
                              <button
                                onClick={() => performUserAction(u.telegram_id, sub.id!, 'admin_suspend_sub', 'سرویس قطع شد')}
                                disabled={!!actionLoading[u.telegram_id]}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-warning-500 to-warning-600 text-sm font-semibold hover:from-warning-400 hover:to-warning-500 transition-all duration-300 shadow-lg shadow-warning-500/20 disabled:opacity-50"
                              >
                                {actionLoading[u.telegram_id] === 'admin_suspend_sub' ? 'در حال انجام...' : 'قطع سرویس'}
                              </button>
                            )}
                            {isSuspended && (
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

        {/* Create Plan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-4">افزودن پلن جدید</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">کد پلن *</label>
                  <input
                    value={createForm.plan_code}
                    onChange={(e) => setCreateForm({ ...createForm, plan_code: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
                    placeholder="40GB_30D"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">نام (فارسی) *</label>
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    placeholder="پلن ۴۰ گیگابایت"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">نام انگلیسی (اختیاری)</label>
                  <input
                    value={createForm.name_en}
                    onChange={(e) => setCreateForm({ ...createForm, name_en: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
                    placeholder="40GB Plan"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">حجم (GB) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="2.5"
                      max="400"
                      value={createForm.quota_gb}
                      onChange={(e) => setCreateForm({ ...createForm, quota_gb: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">مدت (روز) *</label>
                    <input
                      type="number"
                      min="1"
                      value={createForm.duration_days}
                      onChange={(e) => setCreateForm({ ...createForm, duration_days: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">قیمت (تومان) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={createForm.price_amount}
                    onChange={(e) => setCreateForm({ ...createForm, price_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {createError && (
                <div className="mt-3 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                  {createError}
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { setShowCreateModal(false); setCreateError('') }}
                  disabled={createLoading}
                  className="flex-1 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm font-semibold text-gray-300 hover:border-navy-600 transition-all duration-300 disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  onClick={createPlan}
                  disabled={createLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-success-500 to-success-600 text-sm font-semibold hover:from-success-400 hover:to-success-500 transition-all duration-300 shadow-lg shadow-success-500/20 disabled:opacity-50"
                >
                  {createLoading ? 'در حال افزودن...' : 'افزودن پلن'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Plan Confirm Modal */}
        {deleteModalPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-2">حذف پلن</h3>
              <p className="text-sm text-gray-400 mb-5">
                آیا مطمئنید می‌خواهید پلن «{deleteModalPlan.name}» ({deleteModalPlan.plan_code}) را حذف کنید؟
                این عمل برگشت‌پذیر نیست.
              </p>

              {deleteError && (
                <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setDeleteModalPlan(null); setDeleteError('') }}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm font-semibold text-gray-300 hover:border-navy-600 transition-all duration-300 disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  onClick={deletePlan}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-error-500 to-error-600 text-sm font-semibold hover:from-error-400 hover:to-error-500 transition-all duration-300 shadow-lg shadow-error-500/20 disabled:opacity-50"
                >
                  {deleteLoading ? 'در حال حذف...' : 'بله، حذف کن'}
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

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-start gap-2 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedTicket.subject}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedTicket.first_name || '—'} {selectedTicket.username ? `@${selectedTicket.username}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-gray-200 transition flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1" style={{ maxHeight: '300px' }}>
                {ticketMessagesLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="relative inline-flex">
                      <div className="w-8 h-8 rounded-full border-2 border-primary-500/20"></div>
                      <div className="absolute inset-0 w-8 h-8 rounded-full border-t-2 border-primary-500 animate-spin"></div>
                    </div>
                  </div>
                ) : ticketMessages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">پیامی وجود ندارد</p>
                ) : (
                  ticketMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                          m.sender === 'user'
                            ? 'bg-blue-500/15 border border-blue-500/20 text-blue-100 rounded-bl-md'
                            : 'bg-success-500/15 border border-success-500/20 text-success-100 rounded-br-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(m.created_at).toLocaleString('fa-IR')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply */}
              {selectedTicket.status !== 'closed' && (
                <>
                  {ticketReplyError && (
                    <div className="mb-3 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                      {ticketReplyError}
                    </div>
                  )}

                  <textarea
                    value={ticketReply}
                    onChange={(e) => setTicketReply(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all resize-none"
                    rows={3}
                    placeholder="پاسخ به تیکت..."
                  />

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => closeTicket(selectedTicket.id)}
                      disabled={!!ticketActionLoading[selectedTicket.id] || ticketReplyLoading}
                      className="px-4 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm font-semibold text-gray-300 hover:border-navy-600 transition-all duration-300 disabled:opacity-50"
                    >
                      {ticketActionLoading[selectedTicket.id] ? 'در حال...' : 'بستن تیکت'}
                    </button>
                    <button
                      onClick={submitTicketReply}
                      disabled={ticketReplyLoading}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 glow-primary disabled:opacity-50"
                    >
                      {ticketReplyLoading ? 'در حال ارسال...' : 'ارسال پاسخ'}
                    </button>
                  </div>
                </>
              )}

              {selectedTicket.status === 'closed' && (
                <p className="text-center text-gray-500 text-sm py-2">این تیکت بسته شده است.</p>
              )}
            </div>
          </div>
        )}

        {/* Template Edit Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="glass-card rounded-2xl w-full max-w-2xl my-4 max-h-[95vh] flex flex-col">
              {/* Success message */}
              {templateMessage && (
                <div className="flex-shrink-0 p-4 border-b border-navy-700/40">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-success-500/10 border border-success-500/30 text-success-300 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {templateMessage}
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex-shrink-0 p-4 border-b border-navy-700/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{editingTemplate.title}</h3>
                    <p className="text-xs text-gray-500 font-mono" dir="ltr">{editingTemplate.template_key}</p>
                  </div>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content - scroll area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-navy-900/60 rounded-xl p-3 border border-navy-700/40">
                  <p className="text-xs text-gray-400 mb-2">متغیرهای قابل استفاده:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span dir="ltr" className="text-gray-300">{'{order_id}'} — شماره سفارش</span>
                    <span dir="ltr" className="text-gray-300">{'{plan_name}'} — نام پلن</span>
                    <span dir="ltr" className="text-gray-300">{'{amount}'} — مبلغ</span>
                    <span dir="ltr" className="text-gray-300">{'{telegram_id}'} — آیدی تلگرام</span>
                    <span dir="ltr" className="text-gray-300">{'{first_name}'} — نام کاربر</span>
                    <span dir="ltr" className="text-gray-300">{'{username}'} — یوزرنیم تلگرام</span>
                    <span dir="ltr" className="text-gray-300">{'{user_display}'} — «telegram_id / first_name»</span>
                    <span dir="ltr" className="text-gray-300">{'{receipt}'} — کد پیگیری</span>
                    <span dir="ltr" className="text-gray-300">{'{radius_user}'} — یوزرنیم سرویس</span>
                    <span dir="ltr" className="text-gray-300">{'{password}'} — پسورد</span>
                    <span dir="ltr" className="text-gray-300">{'{expiry}'} — تاریخ انقضا</span>
                    <span dir="ltr" className="text-gray-300">{'{usage}'} — مصرف</span>
                    <span dir="ltr" className="text-gray-300">{'{quota}'} — حجم کل</span>
                    <span dir="ltr" className="text-gray-300">{'{days_left}'} — روزهای مانده</span>
                    <span dir="ltr" className="text-gray-300">{'{reject_reason}'} — دلیل رد</span>
                    <span dir="ltr" className="text-gray-300">{'{ticket_id}'} — شماره تیکت</span>
                    <span dir="ltr" className="text-gray-300">{'{subject}'} — موضوع</span>
                    <span dir="ltr" className="text-gray-300">{'{message}'} — متن پیام</span>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={templateEditText}
                  onChange={(e) => setTemplateEditText(e.target.value)}
                  disabled={templateSaving}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all resize-none disabled:opacity-50"
                  dir="ltr"
                  rows={12}
                  style={{ minHeight: '200px' }}
                  placeholder="متن پیام..."
                />

                {templateSaveError && (
                  <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                    {templateSaveError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 p-4 border-t border-navy-700/40 flex gap-2">
                <button
                  onClick={() => { setEditingTemplate(null); setTemplateSaveError(''); }}
                  disabled={templateSaving}
                  className="flex-1 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm font-semibold text-gray-300 disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={templateSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {templateSaving ? 'در حال ذخیره...' : 'ذخیره'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Link to="/" className="block text-center mt-8 text-sm text-primary-400 hover:text-primary-300 transition">
          بازگشت به خانه
        </Link>
      </div>
    </div>
  )
}