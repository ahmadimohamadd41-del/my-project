import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TelegramProvider } from '@/hooks/useTelegram'
import { AuthProvider, useAuth } from '@/hooks/useAuth'

import HomePage from '@/pages/HomePage'
import PlansPage from '@/pages/PlansPage'
import AccountPage from '@/pages/AccountPage'
import AdminDashboard from '@/admin/pages/DashboardPage'
import LoginPage from '@/pages/LoginPage'
import SupportPage from '@/pages/SupportPage'
import NotFoundPage from '@/pages/NotFoundPage'

import LoadingSpinner from '@/components/LoadingSpinner'
import TelegramApp from '@/components/TelegramApp'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/plans" element={<PlansPage />} />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/support" element={<SupportPage />} />
      {/* قفل ادمین داخل DashboardPage است (تلگرام + telegram_id) */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.ready?.()
        tg.expand?.()
      }
    } catch {
      // نادیده بگیر
    }
  }, [])

  // بدون مسدود کردن خارج از تلگرام — اپ همیشه رندر می‌شود
  return (
    <BrowserRouter>
      <TelegramProvider>
        <AuthProvider>
          <TelegramApp>
            <AppRoutes />
          </TelegramApp>
        </AuthProvider>
      </TelegramProvider>
    </BrowserRouter>
  )
}