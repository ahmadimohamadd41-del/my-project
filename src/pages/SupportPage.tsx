import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

type Ticket = {
  id: number
  subject: string
  status: 'open' | 'answered' | 'closed'
  last_sender: 'user' | 'admin'
  created_at: string
  updated_at: string
}

type TicketMessage = {
  id: number
  sender: 'user' | 'admin'
  message: string
  created_at: string
}

const API = 'https://varminiapp.popserver.shop/api'

export default function SupportPage() {
  const { user } = useAuth()
  const telegramId = user?.telegram_id

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showNewForm, setShowNewForm] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState('')

  const loadTickets = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/?action=my_tickets&telegram_id=${telegramId}`)
      const data = await res.json()
      if (data.ok) setTickets(data.tickets || [])
      else setError(data.error || 'خطا در دریافت تیکت‌ها')
    } catch (e: any) {
      setError(e?.message || 'خطای شبکه')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (telegramId) loadTickets()
  }, [telegramId])

  const submitNewTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      setSubmitError('موضوع و پیام را پر کنید')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`${API}/?action=create_ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          subject: newSubject.trim(),
          message: newMessage.trim(),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setShowNewForm(false)
        setNewSubject('')
        setNewMessage('')
        await loadTickets()
      } else {
        setSubmitError(data.error || 'خطا در ارسال تیکت')
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'خطای شبکه')
    } finally {
      setSubmitting(false)
    }
  }

  const openTicket = async (t: Ticket) => {
    setSelectedTicket(t)
    setReplyText('')
    setReplyError('')
    setMessagesLoading(true)
    setMessages([])
    try {
      const res = await fetch(`${API}/?action=ticket_detail&telegram_id=${telegramId}&ticket_id=${t.id}`)
      const data = await res.json()
      if (data.ok && data.messages) {
        setMessages(data.messages)
      } else {
        setReplyError(data.error || 'خطا در دریافت پیام‌ها')
      }
    } catch (e: any) {
      setReplyError(e?.message || 'خطای شبکه')
    } finally {
      setMessagesLoading(false)
    }
  }

  const submitReply = async () => {
    if (!selectedTicket) return
    if (!replyText.trim()) {
      setReplyError('پیام خالی است')
      return
    }
    setReplyLoading(true)
    setReplyError('')
    try {
      const res = await fetch(`${API}/?action=user_reply_ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          ticket_id: selectedTicket.id,
          message: replyText.trim(),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setReplyText('')
        await openTicket(selectedTicket)
        await loadTickets()
      } else {
        setReplyError(data.error || 'خطا در ارسال پاسخ')
      }
    } catch (e: any) {
      setReplyError(e?.message || 'خطای شبکه')
    } finally {
      setReplyLoading(false)
    }
  }

  const statusBadge = (t: Ticket) => {
    if (t.status === 'open' && t.last_sender === 'user') {
      return <span className="text-xs px-2.5 py-0.5 rounded-lg bg-warning-500/10 border border-warning-500/20 text-warning-400 whitespace-nowrap">در انتظار پاسخ</span>
    }
    if (t.status === 'answered' || (t.status === 'open' && t.last_sender === 'admin')) {
      return <span className="text-xs px-2.5 py-0.5 rounded-lg bg-success-500/10 border border-success-500/20 text-success-400 whitespace-nowrap">پاسخ داده شده</span>
    }
    return <span className="text-xs px-2.5 py-0.5 rounded-lg bg-navy-800/60 border border-navy-700/40 text-gray-500 whitespace-nowrap">بسته شده</span>
  }

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-6">
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">پشتیبانی</h1>
            <p className="text-gray-400 text-sm">تیکت‌ها و پیام‌های پشتیبانی</p>
          </div>
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-navy-800/60 hover:bg-navy-700/60 transition-all duration-300 border border-navy-700/40 hover:border-primary-500/30"
            aria-label="بازگشت به خانه"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
        </div>

        {/* New Ticket Button */}
        <button
          onClick={() => { setShowNewForm(true); setSubmitError('') }}
          className="w-full mb-5 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 glow-primary flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          ارسال پیام جدید
        </button>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="relative inline-flex">
              <div className="w-10 h-10 rounded-full border-2 border-primary-500/20"></div>
              <div className="absolute inset-0 w-10 h-10 rounded-full border-t-2 border-primary-500 animate-spin"></div>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-gray-400">
            تیکتی نداری. اگه سؤالی داری، پیام جدید بساز.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => openTicket(t)}
                className="glass-card glass-card-hover rounded-2xl p-4 cursor-pointer"
              >
                <div className="flex justify-between gap-2 mb-2">
                  <div className="font-bold text-white text-sm">{t.subject}</div>
                  {statusBadge(t)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(t.updated_at).toLocaleString('fa-IR')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Ticket Modal */}
        {showNewForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-4">پیام جدید</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">موضوع</label>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all"
                    placeholder="موضوع تیکت"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">پیام</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all resize-none"
                    rows={4}
                    placeholder="پیام خود را بنویسید..."
                  />
                </div>
              </div>

              {submitError && (
                <div className="mt-3 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { setShowNewForm(false); setNewSubject(''); setNewMessage(''); setSubmitError('') }}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40 text-sm font-semibold text-gray-300 hover:border-navy-600 transition-all duration-300 disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  onClick={submitNewTicket}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 glow-primary disabled:opacity-50"
                >
                  {submitting ? 'در حال ارسال...' : 'ارسال'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-start gap-2 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedTicket.subject}</h3>
                  <div className="mt-1">{statusBadge(selectedTicket)}</div>
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
                {messagesLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="relative inline-flex">
                      <div className="w-8 h-8 rounded-full border-2 border-primary-500/20"></div>
                      <div className="absolute inset-0 w-8 h-8 rounded-full border-t-2 border-primary-500 animate-spin"></div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">پیامی وجود ندارد</p>
                ) : (
                  messages.map((m) => (
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
              {selectedTicket.status !== 'closed' ? (
                <>
                  {replyError && (
                    <div className="mb-3 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-300 text-sm">
                      {replyError}
                    </div>
                  )}

                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all resize-none"
                    rows={3}
                    placeholder="پاسخ..."
                  />

                  <button
                    onClick={submitReply}
                    disabled={replyLoading}
                    className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 glow-primary disabled:opacity-50"
                  >
                    {replyLoading ? 'در حال ارسال...' : 'ارسال پاسخ'}
                  </button>
                </>
              ) : (
                <p className="text-center text-gray-500 text-sm py-2">
                  این تیکت بسته شده است. برای ادامه، تیکت جدید بساز.
                </p>
              )}
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
