'use client'

import { useState } from 'react'
import { Layers, Upload, FileText, ChevronDown, ChevronUp, Thermometer, Lightbulb, Zap, Activity } from 'lucide-react'
import { SpectraData, StressType } from '@/lib/types'

interface SpectraSidebarProps {
  spectraData: SpectraData
  esiHeatmap: boolean
  onEsiHeatmapToggle: () => void
  selectedId: string | null
}

const STRESS_STYLES: Record<StressType, { label: string; bar: string; badge: string; icon: typeof Thermometer }> = {
  thermal:  { label: 'Thermal-Driven',  bar: 'bg-red-500',   badge: 'bg-red-500/15 border-red-500/30 text-red-400',   icon: Thermometer },
  lighting: { label: 'Lighting-Driven', bar: 'bg-amber-400', badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400', icon: Lightbulb },
  mixed:    { label: 'Mixed Stress',    bar: 'bg-orange-500', badge: 'bg-orange-500/15 border-orange-500/30 text-orange-400', icon: Zap },
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-navy-600 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-widest font-plex mb-2 hover:text-white transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && children}
    </div>
  )
}

export default function SpectraSidebar({ spectraData, esiHeatmap, onEsiHeatmapToggle, selectedId }: SpectraSidebarProps) {
  const hoods = spectraData.neighborhoods
  const total = hoods.length
  const highStress = hoods.filter(n => n.esi_score >= 75).length
  const avgEsi = Math.round(hoods.reduce((s, n) => s + n.esi_score, 0) / total)
  const selected = hoods.find(n => n.id === selectedId)

  const counts = {
    thermal:  hoods.filter(n => n.stress_type === 'thermal').length,
    lighting: hoods.filter(n => n.stress_type === 'lighting').length,
    mixed:    hoods.filter(n => n.stress_type === 'mixed').length,
  }

  return (
    <aside data-testid="spectra-sidebar" className="flex-none w-80 bg-navy-900 border-r border-navy-600 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-navy-600">
        <h2 className="text-white text-sm font-outfit font-semibold flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Activity className="w-3 h-3 text-indigo-400" />
          </span>
          Spectra ESI Analysis
        </h2>
        <p className="text-slate-500 text-xs font-plex mt-1">{spectraData.city}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Neighborhoods', value: total, sub: 'zones analyzed' },
            { label: 'High Stress', value: highStress, sub: 'ESI ≥ 75' },
            { label: 'Avg ESI Score', value: avgEsi, sub: 'out of 100' },
            { label: 'Critical', value: hoods.filter(n => n.esi_score >= 85).length, sub: 'ESI ≥ 85' },
          ].map(({ label, value, sub }) => (
            <div key={label} data-testid={`esi-stat-${label.toLowerCase().replace(/ /g, '-')}`} className="bg-navy-800 border border-navy-600 rounded-xl p-3">
              <div className="text-white font-outfit font-bold text-xl leading-tight">{value}</div>
              <div className="text-slate-300 text-xs font-semibold font-plex mt-0.5">{label}</div>
              <div className="text-slate-500 text-xs font-plex">{sub}</div>
            </div>
          ))}
        </div>

        {/* ESI stress distribution */}
        <Section title="Stress Distribution">
          <div className="space-y-2.5">
            {(Object.keys(counts) as StressType[]).map(type => {
              const { label, bar, badge, icon: Icon } = STRESS_STYLES[type]
              const pct = total > 0 ? Math.round((counts[type] / total) * 100) : 0
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-300 font-plex">{label}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border font-plex ${badge}`}>{counts[type]}</span>
                  </div>
                  <div className="w-full h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Selected neighborhood detail */}
        {selected && (
          <Section title="Selected Zone">
            <div className="bg-navy-800 border border-indigo-500/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-semibold font-outfit">{selected.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border font-plex ${STRESS_STYLES[selected.stress_type].badge}`}>
                  {STRESS_STYLES[selected.stress_type].label}
                </span>
              </div>
              {[
                { l: 'ESI Score', v: `${selected.esi_score}/100` },
                { l: 'LST', v: `${selected.lst_celsius} °C` },
                { l: 'VIIRS NTL', v: `${selected.viirs_ntl} nW/cm²/sr` },
                { l: 'Land Use', v: selected.land_use },
                { l: 'Pop. Density', v: `${selected.population_density.toLocaleString()}/km²` },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between text-xs">
                  <span className="text-slate-400 font-plex">{l}</span>
                  <span className="text-white font-mono">{v}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Data sources */}
        <Section title="Data Sources" defaultOpen={false}>
          <div className="space-y-2">
            {[
              { name: 'VIIRS Night-Time Light', source: 'NASA Black Marble', status: 'mock' },
              { name: 'Landsat Thermal (LST)', source: 'USGS Landsat 8/9', status: 'mock' },
              { name: 'Copernicus Land Use', source: 'ESA CORINE / GLC30', status: 'mock' },
            ].map(({ name, source, status }) => (
              <div key={name} className="flex items-center justify-between bg-navy-800 border border-navy-600 rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs text-white font-plex font-semibold">{name}</div>
                  <div className="text-xs text-slate-500 font-plex">{source}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 font-plex">mock</span>
                  <button
                    data-testid={`upload-${name.split(' ')[0].toLowerCase()}`}
                    title={`Upload ${name}`}
                    className="w-6 h-6 rounded flex items-center justify-center bg-navy-700 border border-navy-500 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Layer toggle */}
        <Section title="Map Layers">
          <button
            data-testid="layer-esi-heatmap"
            onClick={onEsiHeatmapToggle}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all duration-200 ${
              esiHeatmap
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                : 'bg-navy-700 border-navy-600 text-slate-400 hover:text-white hover:bg-navy-600'
            }`}
          >
            <div>
              <div className="text-xs font-semibold font-plex">ESI Heatmap</div>
              <div className="text-xs text-slate-500 mt-0.5 font-plex">Polygon stress overlay</div>
            </div>
            <div className={`w-9 h-5 rounded-full transition-all duration-200 relative flex-shrink-0 ${esiHeatmap ? 'bg-indigo-500' : 'bg-navy-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${esiHeatmap ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>
          <div className="mt-2 flex gap-2 flex-wrap">
            {([
              { label: 'Thermal', dot: 'bg-red-500' },
              { label: 'Lighting', dot: 'bg-amber-400' },
              { label: 'Mixed', dot: 'bg-orange-500' },
            ] as const).map(({ label, dot }) => (
              <div key={label} className="flex items-center gap-1 text-xs text-slate-500 font-plex">
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                {label}
              </div>
            ))}
          </div>
        </Section>

        {/* AI report stub */}
        <Section title="AI Report" defaultOpen={false}>
          <div className="bg-navy-800 border border-dashed border-navy-500 rounded-xl p-4 text-center">
            <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-xs font-plex mb-3 leading-relaxed">
              AI-generated intervention report for prioritized neighborhoods
            </p>
            <button
              data-testid="generate-ai-report-btn"
              className="w-full px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold font-plex hover:bg-indigo-500/20 transition-colors"
            >
              Generate Report (plug in AI)
            </button>
          </div>
        </Section>

        <p className="text-slate-600 text-xs font-plex leading-relaxed border-t border-navy-600 pt-3">
          Mock data pre-loaded · Replace with real VIIRS/Landsat/Copernicus uploads
        </p>
      </div>
    </aside>
  )
}
