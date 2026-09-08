interface UsageBarProps {
  used: number
  total: number
  label?: string
}

export default function UsageBar({ used, total, label }: UsageBarProps) {
  const percentage = Math.min((used / total) * 100, 100)
  const remaining = total - used

  const getColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 75) return 'bg-yellow-500'
    if (pct >= 50) return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          <span className="text-sm text-gray-400">
            {used.toFixed(1)} / {total} GB
          </span>
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(percentage)} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-600">مصرف شده</span>
        <span className="text-xs text-gray-600">{remaining.toFixed(1)} GB باقی مانده</span>
      </div>
    </div>
  )
}