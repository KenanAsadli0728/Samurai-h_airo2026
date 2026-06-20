'use client'

import { Sun, Wind, LayoutGrid, Zap, Globe, Layers } from 'lucide-react'
import { AppMode, EnergyType } from '@/lib/types'

interface NavbarProps {
  appMode: AppMode
  energyType: EnergyType
  onEnergyTypeChange: (t: EnergyType) => void
  onAppModeChange: (m: AppMode) => void
}

const TABS: { type: EnergyType; label: string; icon: typeof Sun; active: string }[] = [
  { type: 'solar',  label: 'Solar',    icon: Sun,        active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' },
  { type: 'wind',   label: 'Wind',     icon: Wind,       active: 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-lg shadow-cyan-500/25' },
  { type: 'both',   label: 'Combined', icon: LayoutGrid, active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' },
]

export default function Navbar({ appMode, energyType, onEnergyTypeChange, onAppModeChange }: NavbarProps) {
  return (
    <nav
      data-testid="navbar"
      className="flex-none h-14 bg-navy-800 border-b border-navy-600 flex items-center justify-between px-5 z-50"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-geo-DEFAULT to-cyan-400 flex items-center justify-center shadow-lg shadow-geo-DEFAULT/30">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-white font-outfit font-semibold text-base leading-tight tracking-tight">
            Günbəzgöz
          </h1>
          <p className="text-slate-400 text-xs font-plex">Satellite-driven renewable site analysis</p>
        </div>
      </div>

      {/* Center: mode indicator */}
      <div className="flex items-center gap-2">
        {appMode === 'geo-energy' ? (
          <div className="flex items-center gap-1 bg-navy-900 border border-navy-600 rounded-xl p-1" data-testid="energy-type-selector">
            {TABS.map(({ type, label, icon: Icon, active }) => (
              <button
                key={type}
                data-testid={`energy-tab-${type}`}
                onClick={() => onEnergyTypeChange(type)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium font-plex transition-all duration-200 ${
                  energyType === type ? active : 'text-slate-400 hover:text-white hover:-translate-y-px'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-plex font-semibold" data-testid="spectra-mode-indicator">
            <Layers className="w-3.5 h-3.5" />
            Günbəzgöz · ESI Mode
          </div>
        )}
      </div>

      {/* Right: Spectra toggle + badge */}
      <div className="flex items-center gap-3">
        <button
          data-testid="spectra-mode-btn"
          onClick={() => onAppModeChange(appMode === 'spectra' ? 'geo-energy' : 'spectra')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold font-plex transition-all duration-200 border ${
            appMode === 'spectra'
              ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-navy-700 border-navy-600 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Spectra
        </button>
        {appMode === 'geo-energy' && (
          <div className="flex items-center gap-2 text-slate-500 text-xs font-plex">
            <Globe className="w-3.5 h-3.5" />
            <span>Open Source GIS Data</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/25">
              v1.0
            </span>
          </div>
        )}
      </div>
    </nav>
  )
}
