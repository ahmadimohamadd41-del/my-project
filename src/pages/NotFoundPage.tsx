import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen app-bg flex items-center justify-center">
      <div className="text-center p-6 animate-fade-in">
        <h1 className="text-7xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <p className="text-xl text-gray-400 mb-8">صفحه موردنظر پیدا نشد</p>
        <Link to="/">
          <Button variant="primary">بازگشت به خانه</Button>
        </Link>
      </div>
    </div>
  )
}
