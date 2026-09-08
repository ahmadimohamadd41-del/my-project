import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center p-6">
        <h1 className="text-6xl font-bold text-gray-700 mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-6">صفحه موردنظر پیدا نشد</p>
        <Link to="/">
          <Button variant="primary">بازگشت به خانه</Button>
        </Link>
      </div>
    </div>
  )
}