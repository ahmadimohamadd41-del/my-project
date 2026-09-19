import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface CircularGaugeProps {
  used: number
  total: number
  label?: string
  size?: number
  expiryDate?: string | null
  planName?: string
}

export default function CircularGauge({ used, total, label, size = 240, expiryDate, planName }: CircularGaugeProps) {
  const { theme } = useTheme()
  const [animatedPercent, setAnimatedPercent] = useState(0)
  
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const remaining = Math.max(0, total - used)
  const remainingPercent = 100 - percentage

  useEffect(() => {
    const t = setTimeout(() => setAnimatedPercent(percentage), 100)
    return () => clearTimeout(t)
  }, [percentage])

  // Gauge config - 270 deg arc (from 135 to 405 deg)
  const strokeWidth = 14
  const radius = (size - strokeWidth * 2 - 20) / 2
  const circumference = 2 * Math.PI * radius
  const arcAngle = 270
  const arcLength = (arcAngle / 360) * circumference
  const gapLength = circumference - arcLength
  
  // For stroke-dasharray technique
  const progress = (animatedPercent / 100) * arcLength

  const getStatus = (pct: number) => {
    if (pct >= 90) return { text: 'بحرانی', color: '#EF4444', gradient: ['#EF4444', '#F87171'], emoji: '🔴' }
    if (pct >= 75) return { text: 'هشدار', color: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'], emoji: '🟡' }
    if (pct >= 50) return { text: 'متعادل', color: '#8B5CF6', gradient: ['#8B5CF6', '#06B6D4'], emoji: '🟣' }
    return { text: 'بهینه', color: '#10B981', gradient: ['#10B981', '#06B6D4'], emoji: '🟢' }
  }

  const status = getStatus(percentage)
  const isDark = theme === 'dark'

  // Tick marks - 10 ticks around the arc
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = 135 + (i * arcAngle) / 10
    const rad = (angle * Math.PI) / 180
    const innerR = radius - 6
    const outerR = radius + 6
    const isMajor = i % 2 === 0
    return {
      x1: size / 2 + Math.cos(rad) * (isMajor ? innerR - 4 : innerR),
      y1: size / 2 + Math.sin(rad) * (isMajor ? innerR - 4 : innerR),
      x2: size / 2 + Math.cos(rad) * (isMajor ? outerR + 2 : outerR),
      y2: size / 2 + Math.sin(rad) * (isMajor ? outerR + 2 : outerR),
      isMajor,
      angle,
    }
  })

  return (
    <div className="relative flex flex-col items-center">
      {/* Header badge */}
      {planName && (
        <div className={`
          mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide
          backdrop-blur-xl border flex items-center gap-2
          ${isDark 
            ? 'bg-white/[0.06] border-white/[0.08] text-white/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
            : 'bg-white/70 border-black/[0.06] text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)]'
          }
        `}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          {planName}
        </div>
      )}

      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow behind */}
        <div 
          className="absolute inset-0 rounded-full blur-[40px] opacity-30 transition-all duration-1000"
          style={{
            background: `conic-gradient(from 135deg, ${status.gradient[0]}, ${status.gradient[1]}, ${status.gradient[0]})`,
            transform: 'scale(0.85)',
          }}
        />

        <svg width={size} height={size} className="relative z-10 overflow-visible">
          <defs>
            <linearGradient id={`gauge-grad-${used}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={status.gradient[0]} />
              <stop offset="100%" stopColor={status.gradient[1]} />
            </linearGradient>
            <filter id={`glow-${used}`}>
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <radialGradient id={`center-grad-${used}`}>
              <stop offset="0%" stopColor={isDark ? '#1E293B' : '#FFFFFF'} stopOpacity={isDark ? 0.8 : 1} />
              <stop offset="100%" stopColor={isDark ? '#0F172A' : '#F8FAFC'} stopOpacity={isDark ? 0.9 : 1} />
            </radialGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${gapLength}`}
            strokeDashoffset={- (360 - 135) / 360 * circumference}
            transform={`rotate(0 ${size/2} ${size/2})`}
            className="transition-all duration-700"
          />

          {/* Ticks */}
          {ticks.map((tick, i) => (
            <line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={isDark ? (tick.isMajor ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)') : (tick.isMajor ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.06)')}
              strokeWidth={tick.isMajor ? 2 : 1}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}

          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#gauge-grad-${used})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeDashoffset={- (360 - 135) / 360 * circumference}
            filter={`url(#glow-${used})`}
            className="transition-all duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              filter: `drop-shadow(0 0 12px ${status.color}60)`,
            }}
          />

          {/* Inner highlight ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth - 8}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
            strokeWidth={1}
            strokeDasharray="3 6"
            opacity={0.5}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          {/* Center card */}
          <div className={`
            relative w-[58%] aspect-square rounded-full
            flex flex-col items-center justify-center
            backdrop-blur-2xl border
            transition-all duration-500
            ${isDark
              ? 'bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]'
              : 'bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,1),_rgba(248,250,252,0.9))] border-black/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,1)]'
            }
          `}>
            {/* Inner glow */}
            <div className="absolute inset-[1px] rounded-full bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

            <div className="relative flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className={`text-[2.2rem] font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                  {used.toFixed(1)}
                </span>
                <span className={`text-[0.9rem] font-bold opacity-60 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>GB</span>
              </div>

              <div className={`text-[0.7rem] font-medium tracking-widest mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                از {total} گیگ
              </div>

              {/* Percentage badge */}
              <div
                className="mt-3 px-3 py-1 rounded-full text-[0.75rem] font-black tracking-wide border backdrop-blur-xl transition-all duration-700"
                style={{
                  background: `linear-gradient(135deg, ${status.gradient[0]}15, ${status.gradient[1]}15)`,
                  borderColor: `${status.color}30`,
                  color: status.color,
                  boxShadow: `0 0 20px ${status.color}20, inset 0 1px 0 0 rgba(255,255,255,0.1)`,
                }}
              >
                {animatedPercent.toFixed(0)}%
              </div>

              <div className="mt-2 flex items-center gap-1">
                <span className="text-[0.65rem]">{status.emoji}</span>
                <span className={`text-[0.65rem] font-bold tracking-wide ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  {status.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating remaining */}
        <div className={`
          absolute -bottom-2 left-1/2 -translate-x-1/2
          px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap
          backdrop-blur-xl border flex items-center gap-2
          transition-all duration-500
          ${isDark
            ? 'bg-[#0F172A]/80 border-white/[0.08] text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
            : 'bg-white/90 border-black/[0.06] text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
          }
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${remainingPercent < 20 ? 'bg-red-400' : 'bg-emerald-400'} animate-pulse`} />
          {remaining.toFixed(1)} GB باقی‌مانده
        </div>
      </div>

      {/* Bottom stats */}
      <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-[320px]">
        <div className={`
          p-3 rounded-2xl backdrop-blur-xl border text-center
          ${isDark
            ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10]'
            : 'bg-white/60 border-black/[0.04] hover:bg-white/80 hover:border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]'
          }
          transition-all duration-300
        `}>
          <div className={`text-[0.65rem] font-bold tracking-widest mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>مصرف شده</div>
          <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`} dir="ltr">{used.toFixed(2)} GB</div>
        </div>
        <div className={`
          p-3 rounded-2xl backdrop-blur-xl border text-center
          ${isDark
            ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10]'
            : 'bg-white/60 border-black/[0.04] hover:bg-white/80 hover:border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]'
          }
          transition-all duration-300
        `}>
          <div className={`text-[0.65rem] font-bold tracking-widest mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>انقضا</div>
          <div className={`text-xs font-bold ${isDark ? 'text-white/90' : 'text-slate-900'}`}>
            {expiryDate ? new Date(expiryDate).toLocaleDateString('fa-IR') : 'نامحدود'}
          </div>
        </div>
      </div>

      {label && (
        <p className={`mt-4 text-xs ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
      )}
    </div>
  )
}
