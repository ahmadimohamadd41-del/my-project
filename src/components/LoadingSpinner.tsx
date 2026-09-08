export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen app-bg">
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="w-14 h-14 rounded-full border-2 border-primary-500/20"></div>
          <div className="absolute inset-0 w-14 h-14 rounded-full border-t-2 border-primary-500 animate-spin"></div>
          <div className="absolute inset-2 w-10 h-10 rounded-full border-b-2 border-accent-500/60 animate-spin-slow"></div>
        </div>
        <p className="text-gray-400 mt-4 text-sm tracking-wide">در حال بارگذاری...</p>
      </div>
    </div>
  )
}
