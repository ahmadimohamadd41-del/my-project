import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ThemeToggle'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
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
    if (!newSubject.trim() || !newMessage.trim()) { setSubmitError('موضوع و پیام را پر کنید'); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`${API}/?action=create_ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, subject: newSubject.trim(), message: newMessage.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setShowNewForm(false); setNewSubject(''); setNewMessage(''); await loadTickets()
      } else setSubmitError(data.error || 'خطا در ارسال')
    } catch (e: any) { setSubmitError(e?.message || 'خطای شبکه') }
    finally { setSubmitting(false) }
  }

  const openTicket = async (t: Ticket) => {
    setSelectedTicket(t); setReplyText(''); setReplyError(''); setMessagesLoading(true); setMessages([])
    try {
      const res = await fetch(`${API}/?action=ticket_detail&telegram_id=${telegramId}&ticket_id=${t.id}`)
      const data = await res.json()
      if (data.ok && data.messages) setMessages(data.messages)
      else setReplyError(data.error || 'خطا در دریافت پیام‌ها')
    } catch (e: any) { setReplyError(e?.message || 'خطای شبکه') }
    finally { setMessagesLoading(false) }
  }

  const submitReply = async () => {
    if (!selectedTicket) return
    if (!replyText.trim()) { setReplyError('پیام خالی است'); return }
    setReplyLoading(true); setReplyError('')
    try {
      const res = await fetch(`${API}/?action=user_reply_ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, ticket_id: selectedTicket.id, message: replyText.trim() }),
      })
      const data = await res.json()
      if (data.ok) { setReplyText(''); await openTicket(selectedTicket); await loadTickets() }
      else setReplyError(data.error || 'خطا در ارسال')
    } catch (e: any) { setReplyError(e?.message || 'خطای شبکه') }
    finally { setReplyLoading(false) }
  }

  const statusBadge = (t: Ticket) => {
    if (t.status === 'open' && t.last_sender === 'user') {
      return <span className="text-[11px] px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-500 font-black">در انتظار پاسخ</span>
    }
    if (t.status === 'answered' || (t.status === 'open' && t.last_sender === 'admin')) {
      return <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 font-black">پاسخ داده شده</span>
    }
    return <span className={`text-[11px] px-3 py-1 rounded-full font-bold border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white/30' : 'bg-slate-100 border-black/[0.04] text-slate-400'}`}>بسته شده</span>
  }

  return (
    <div className="min-h-screen app-bg text-right p-4 lg:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in relative z-10">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className={`w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center hover:scale-105 transition-all ${isDark ? 'bg-white/[0.06] border-white/[0.08] text-white/70' : 'bg-white/70 border-black/[0.06] text-slate-600 shadow-sm'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className={`text-[22px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn' }}>پشتیبانی 🎧</h1>
              <p className={`text-[11px] font-bold tracking-widest ${isDark ? 'text-white/40' : 'text-slate-400'}`}>SUPPORT • تیکت‌ها و پیام‌ها</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <button
          onClick={() => { setShowNewForm(true); setSubmitError('') }}
          className="w-full mb-6 h-[56px] rounded-[20px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-[14px] font-black flex items-center justify-center gap-2 hover:shadow-[0_12px_32px_rgba(99,102,241,0.3)] hover:-translate-y-[1px] active:scale-[0.98] transition-all"
        >
          <span className="text-lg">+</span> ارسال پیام جدید
        </button>

        {error && <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-bold">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <Card className="p-10 !rounded-[28px] text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-[24px] bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/15 flex items-center justify-center text-3xl">💬</div>
            <p className={`text-[14px] font-bold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>تیکتی نداری</p>
            <p className={`text-[12px] mt-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>اگه سوالی داری، پیام جدید بساز</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t.id} onClick={() => openTicket(t)} className="p-5 !rounded-[20px] cursor-pointer group hover:scale-[1.01]">
                <div className="flex justify-between gap-3 mb-2">
                  <div className={`font-black text-[14px] group-hover:text-violet-400 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.subject}</div>
                  {statusBadge(t)}
                </div>
                <div className={`text-[11px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{new Date(t.updated_at).toLocaleString('fa-IR')}</div>
              </Card>
            ))}
          </div>
        )}

        {/* New Ticket Modal */}
        {showNewForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
            <Card className="p-7 w-full max-w-md !rounded-[28px] animate-slide-up">
              <h3 className={`text-[18px] font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>پیام جدید ✨</h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-[12px] font-black mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>موضوع</label>
                  <input value={newSubject} onChange={e => setNewSubject(e.target.value)} className={`w-full h-[48px] px-4 rounded-2xl border text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900 shadow-sm'}`} placeholder="موضوع تیکت" autoFocus />
                </div>
                <div>
                  <label className={`block text-[12px] font-black mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>پیام</label>
                  <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} className={`w-full px-4 py-3 rounded-2xl border text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900 shadow-sm'}`} rows={4} placeholder="پیام خود را بنویسید..." />
                </div>
              </div>
              {submitError && <div className="mt-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold">{submitError}</div>}
              <div className="flex gap-3 mt-6">
                <Button variant="glass" onClick={() => { setShowNewForm(false); setNewSubject(''); setNewMessage(''); setSubmitError('') }} disabled={submitting} className="flex-1 !rounded-2xl">انصراف</Button>
                <Button variant="primary" onClick={submitNewTicket} disabled={submitting} loading={submitting} className="flex-1 !rounded-2xl">ارسال</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Ticket Detail */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
            <Card className="p-6 w-full max-w-md max-h-[85vh] flex flex-col !rounded-[28px] animate-slide-up">
              <div className="flex justify-between items-start gap-3 mb-5">
                <div>
                  <h3 className={`text-[16px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedTicket.subject}</h3>
                  <div className="mt-2">{statusBadge(selectedTicket)}</div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.06] text-white/60' : 'bg-slate-100 text-slate-500'}`}>✕</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-5 pr-1" style={{ maxHeight: '320px' }}>
                {messagesLoading ? (
                  <div className="flex justify-center py-8"><div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <p className={`text-center text-[12px] py-6 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>پیامی وجود ندارد</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-[18px] text-[13px] leading-relaxed ${m.sender === 'user' ? 'bg-gradient-to-br from-violet-500/15 to-indigo-500/15 border border-violet-500/20 text-violet-100 rounded-bl-[6px]' : 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-100 rounded-br-[6px]'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p className="text-[10px] opacity-50 mt-2">{new Date(m.created_at).toLocaleString('fa-IR')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedTicket.status !== 'closed' ? (
                <>
                  {replyError && <div className="mb-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold">{replyError}</div>}
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} className={`w-full px-4 py-3 rounded-2xl border text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900 shadow-sm'}`} rows={3} placeholder="پاسخ..." />
                  <Button variant="primary" onClick={submitReply} loading={replyLoading} className="w-full mt-3 !rounded-2xl">ارسال پاسخ</Button>
                </>
              ) : (
                <p className={`text-center text-[12px] py-3 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>این تیکت بسته شده است.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
