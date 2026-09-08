interface UsageBarProps {
  used: number
  total: number
  label?: string
}

export default function UsageBar({ used, total, label }: UsageBarProps) {
  const percentage = Math.min((used / total) * 100, 100)
  const remaining = total - used

  const getColor = (pct: number) => {
    if (pct >= 90) return 'from-error-500 to-error-400'
    if (pct >= 75) return 'from-warning-500 to-warning-400'
    if (pct >= 50) return 'from-warning-500 to-accent-400'
    return 'from-primary-500 to-accent-400'
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          <span className="text-sm text-gray-400 font-mono">
            {used.toFixed(1)} / {total} GB
          </span>
        </div>
      )}
      <div className="h-2.5 bg-navy-800/80 rounded-full overflow-hidden border border-navy-700/40">
        <div
          className={`h-full bg-gradient-to-r ${getColor(percentage)} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-xs text-gray-500">مصرف شده</span>
        <span className="text-xs text-gray-500">{remaining.toFixed(1)} GB باقی مانده</span>
      </div>
    </div>
  )
}
