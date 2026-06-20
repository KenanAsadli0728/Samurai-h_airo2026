'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import { EsiNeighborhood, StressType } from '@/lib/types'

interface NeighborhoodDrawerProps {
  neighborhoods: EsiNeighborhood[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

type SortField = 'name' | 'esi_score' | 'stress_type' | 'viirs_ntl' | 'lst_celsius'
type SortDir = 'asc' | 'desc'

const STRESS_COLORS: Record<StressType, string> = {
  thermal:  'bg-red-500/15 border-red-500/30 text-red-400',
  lighting: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  mixed:    'bg-orange-500/15 border-orange-500/30 text-orange-400',
}

const ESI_BAR_COLOR = (score: number) =>
  score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-amber-400' : 'bg-emerald-500'

export default function NeighborhoodDrawer({ neighborhoods, selectedId, onSelect }: NeighborhoodDrawerProps) {
  const [open, setOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('esi_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...neighborhoods].sort((a, b) => {
      const av = a[sortField], bv = b[sortField]
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [neighborhoods, sortField, sortDir])

  const COLS: { field: SortField; label: string; width: string }[] = [
    { field: 'name',        label: 'Neighborhood',  width: 'flex-1 min-w-0' },
    { field: 'esi_score',   label: 'ESI',           width: 'w-20 text-center' },
    { field: 'stress_type', label: 'Type',          width: 'w-28' },
    { field: 'viirs_ntl',   label: 'NTL',           width: 'w-16 text-right' },
    { field: 'lst_celsius', label: 'LST °C',        width: 'w-16 text-right' },
  ]

  return (
    <div
      data-testid="neighborhood-drawer"
      className="absolute bottom-0 left-0 right-0 z-[1000] bg-navy-900/97 backdrop-blur-md border-t border-navy-600 shadow-2xl"
      style={{ maxHeight: open ? '260px' : '44px', transition: 'max-height 0.3s ease', overflow: 'hidden' }}
    >
      {/* Drag handle / toggle */}
      <button
        data-testid="drawer-toggle-btn"
        onClick={() => setOpen(v => !v)}
        className="w-full h-11 flex items-center justify-between px-4 hover:bg-navy-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 rounded-full bg-navy-600" />
          <span className="text-white text-xs font-semibold font-outfit">
            Neighborhood Rankings
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-plex">
            {neighborhoods.length}
          </span>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronUp className="w-4 h-4 text-slate-400" />
        }
      </button>

      {/* Table */}
      <div className="overflow-y-auto" style={{ maxHeight: '212px' }}>
        {/* Header row */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-navy-700 sticky top-0 bg-navy-900">
          {COLS.map(({ field, label, width }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`${width} flex items-center gap-1 text-xs font-semibold font-plex text-slate-400 hover:text-white transition-colors`}
            >
              {label}
              <ArrowUpDown className={`w-2.5 h-2.5 flex-shrink-0 ${sortField === field ? 'text-indigo-400' : 'text-slate-600'}`} />
            </button>
          ))}
        </div>

        {/* Data rows */}
        {sorted.map(n => (
          <button
            key={n.id}
            data-testid={`row-${n.id}`}
            onClick={() => onSelect(selectedId === n.id ? null : n.id)}
            className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-navy-800 transition-colors border-b border-navy-700/50 ${
              selectedId === n.id ? 'bg-indigo-500/10 border-indigo-500/20' : ''
            }`}
          >
            <span className="flex-1 min-w-0 text-xs text-white font-plex truncate">{n.name}</span>

            {/* ESI mini bar */}
            <div className="w-20 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${ESI_BAR_COLOR(n.esi_score)}`} style={{ width: `${n.esi_score}%` }} />
              </div>
              <span className="text-xs font-mono text-white w-6 text-right">{n.esi_score}</span>
            </div>

            <div className="w-28">
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border font-plex ${STRESS_COLORS[n.stress_type]}`}>
                {n.stress_type}
              </span>
            </div>
            <span className="w-16 text-right text-xs font-mono text-slate-400">{n.viirs_ntl}</span>
            <span className="w-16 text-right text-xs font-mono text-slate-400">{n.lst_celsius}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
