'use client'

import { clsx } from 'clsx'

interface MetricCardProps {
  label: string
  value: string
  sub: string
  variant: 'geo' | 'solar' | 'wind' | 'purple'
  testId?: string
}

const VARIANTS = {
  geo:    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  solar:  'border-amber-500/30  bg-amber-500/10  text-amber-400',
  wind:   'border-cyan-500/30   bg-cyan-500/10   text-cyan-400',
  purple: 'border-violet-400/30 bg-violet-400/10 text-violet-400',
}

export default function MetricCard({ label, value, sub, variant, testId }: MetricCardProps) {
  return (
    <div
      data-testid={testId}
      className={clsx(
        'rounded-xl p-3.5 border transition-all duration-200 hover:-translate-y-px',
        VARIANTS[variant],
      )}
    >
      <div className="text-xl font-bold font-mono leading-none">{value}</div>
      <div className="text-slate-200 text-xs font-semibold font-plex mt-1.5">{label}</div>
      <div className="text-slate-500 text-xs font-plex mt-0.5">{sub}</div>
    </div>
  )
}
