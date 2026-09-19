import CircularGauge from './CircularGauge'

interface UsageBarProps {
  used: number
  total: number
  label?: string
  expiryDate?: string | null
  planName?: string
}

// Backward compatible wrapper - now uses masterpiece circular gauge
export default function UsageBar({ used, total, label, expiryDate, planName }: UsageBarProps) {
  return (
    <div className="w-full flex justify-center py-2">
      <CircularGauge 
        used={used} 
        total={total} 
        label={label}
        expiryDate={expiryDate}
        planName={planName}
        size={260}
      />
    </div>
  )
}

// Also export circular version directly
export { default as CircularUsage } from './CircularGauge'
