'use client'

import { Sun, Wind, Layers, Activity, Loader2, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import MetricCard from './MetricCard'
import { AnalysisResult, EnergyType, Layers as LayersMap } from '@/lib/types'

interface SidebarProps {
  analysis: AnalysisResult | null
  isAnalyzing: boolean
  energyType: EnergyType
  layers: LayersMap
  onLayerToggle: (key: keyof LayersMap) => void
}

function LayerToggle({
  label, sub, active, onClick, testId, color,
}: {
  label: string; sub: string; active: boolean
  onClick: () => void; testId: string; color: string
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all duration-200 ${
        active
          ? `${color} border-opacity-40`
          : 'bg-navy-700 border-navy-600 text-slate-400 hover:text-white hover:bg-navy-600'
      }`}
    >
      <div>
        <div className="text-xs font-semibold font-plex">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5 font-plex">{sub}</div>
      </div>
      {/* Toggle pill */}
      <div className={`w-9 h-5 rounded-full transition-all duration-200 relative flex-shrink-0 ${active ? 'bg-current' : 'bg-navy-600'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${active ? 'left-4.5' : 'left-0.5'}`} />
      </div>
    </button>
  )
}

function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  const map = {
    low:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high:   'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border font-plex ${map[risk]}`}>
      {risk}
    </span>
  )
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

export default function Sidebar({ analysis, isAnalyzing, energyType, layers, onLayerToggle }: SidebarProps) {
  const s = analysis?.solar
  const w = analysis?.wind
  const infra = analysis?.infrastructure
  const lc = analysis?.land_cover
  const sum = analysis?.summary

  const fmtGwh = (mwh: number) => mwh >= 1_000_000 ? `${(mwh / 1_000_000).toFixed(1)} TWh` : mwh >= 1000 ? `${(mwh / 1000).toFixed(1)} GWh` : `${mwh.toLocaleString()} MWh`
  const fmtMW  = (mw: number)  => mw  >= 1_000_000 ? `${(mw  / 1_000_000).toFixed(2)} TW`  : mw  >= 1000  ? `${(mw  / 1000).toFixed(1)} GW`   : `${mw.toLocaleString()} MW`

  return (
    <aside
      data-testid="sidebar"
      className="flex-none w-80 bg-navy-900 border-r border-navy-600 flex flex-col overflow-hidden"
    >
      {/* ── Layer Controls ──────────────────────────────────── */}
      <div className="flex-none p-4 border-b border-navy-600">
        <h2 className="text-white text-sm font-outfit font-semibold flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-emerald-400" /> Map Layers
        </h2>
        <div className="space-y-2">
          <LayerToggle
            label="Satellite Imagery" sub="ESRI World Imagery"
            active={layers.satellite} onClick={() => onLayerToggle('satellite')}
            testId="layer-satellite" color="bg-slate-600/20 border-slate-500 text-slate-300"
          />
          <LayerToggle
            label="Solar Irradiation" sub="GHI Heatmap"
            active={layers.solar_heatmap} onClick={() => onLayerToggle('solar_heatmap')}
            testId="layer-solar" color="bg-amber-500/10 border-amber-500 text-amber-400"
          />
          <LayerToggle
            label="Wind Speed Contours" sub="Power Density"
            active={layers.wind_heatmap} onClick={() => onLayerToggle('wind_heatmap')}
            testId="layer-wind" color="bg-cyan-500/10 border-cyan-500 text-cyan-400"
          />
          <LayerToggle
            label="Land Cover" sub="NDVI Classification"
            active={layers.land_cover} onClick={() => onLayerToggle('land_cover')}
            testId="layer-landcover" color="bg-emerald-500/10 border-emerald-500 text-emerald-400"
          />
        </div>
      </div>

      {/* ── Analysis Panel ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-slate-300 text-sm font-semibold font-outfit">Analyzing region…</p>
            <p className="text-slate-500 text-xs font-plex mt-1">Running GIS analysis pipeline</p>
            <div className="mt-4 space-y-1.5 w-full">
              {['Computing GHI model…', 'Estimating NDVI mask…', 'Scoring infrastructure…'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-xs text-slate-500 font-plex">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        ) : analysis && sum ? (
          <div className="space-y-4 animate-fade-in">
            {/* ── Summary Cards ── */}
            <div>
              <h3 className="text-white text-sm font-outfit font-semibold flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-emerald-400" /> Analysis Results
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  label="Suitability" value={`${sum.suitability_percentage.toFixed(0)}%`}
                  sub="Overall score" variant="geo" testId="metric-suitability"
                />
                <MetricCard
                  label="Feasibility" value={`${sum.feasibility_score}/100`}
                  sub="CAPEX score" variant="wind" testId="metric-feasibility"
                />
                <MetricCard
                  label="Total Area" value={`${(sum.area_ha / 100).toFixed(0)} km²`}
                  sub={`${sum.area_ha.toFixed(0)} ha`} variant="purple" testId="metric-area"
                />
                <MetricCard
                  label="Annual Output" value={fmtGwh(sum.annual_energy_mwh)}
                  sub="Projected yield" variant="solar" testId="metric-output"
                />
              </div>
            </div>

            {/* ── Solar ── */}
            {s && (
              <Section title="Solar PV Analysis">
                <div className="space-y-2">
                  {[
                    { l: 'Avg GHI', v: `${s.avg_ghi_kwh_m2_day} kWh/m²/day`, hl: true },
                    { l: 'Peak Capacity', v: `${fmtMW(s.peak_capacity_mw)}p` },
                    { l: 'Capacity Factor', v: `${(s.capacity_factor * 100).toFixed(1)}%` },
                    { l: 'Optimal Tilt', v: `${s.optimal_tilt_degrees}°` },
                    { l: 'Suitable Area', v: `${s.suitable_area_ha.toFixed(0)} ha` },
                    { l: 'CO₂ Offset', v: `${s.co2_offset_kt_yr} kt/yr` },
                  ].map(({ l, v, hl }) => (
                    <div key={l} className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-plex">{l}</span>
                      <span className={`font-semibold font-mono ${hl ? 'text-solar-DEFAULT' : 'text-white'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Wind ── */}
            {w && (
              <Section title="Wind Energy Analysis">
                <div className="space-y-2">
                  {[
                    { l: 'Avg Wind Speed', v: `${w.avg_wind_speed_ms} m/s`, hl: true },
                    { l: 'Power Density', v: `${w.wind_power_density_w_m2} W/m²` },
                    { l: 'Turbines', v: `${w.num_turbines} × ${w.turbine_capacity_mw} MW` },
                    { l: 'Total Capacity', v: `${fmtMW(w.total_capacity_mw)}` },
                    { l: 'Capacity Factor', v: `${(w.capacity_factor * 100).toFixed(1)}%` },
                    { l: 'CO₂ Offset', v: `${w.co2_offset_kt_yr} kt/yr` },
                  ].map(({ l, v, hl }) => (
                    <div key={l} className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-plex">{l}</span>
                      <span className={`font-semibold font-mono ${hl ? 'text-wind-DEFAULT' : 'text-white'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Infrastructure ── */}
            {infra && analysis.risk_factors && (
              <Section title="Infrastructure Risk">
                <div className="space-y-2">
                  {analysis.risk_factors.map((rf) => (
                    <div key={rf.factor} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-400 font-plex truncate">{rf.factor}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-white font-mono">{rf.value}</span>
                        <RiskBadge risk={rf.risk} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2.5 rounded-lg bg-navy-700 border border-navy-600">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-plex">CAPEX: Grid connection</span>
                    <span className="text-white font-mono">${infra.grid_connection_cost_m_usd}M</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-plex">Road accessibility</span>
                    <span className="text-white font-mono">{infra.road_distance_km} km</span>
                  </div>
                </div>
              </Section>
            )}

            {/* ── Land Cover ── */}
            {lc && (
              <Section title="Land Cover Breakdown" defaultOpen={false}>
                <div className="space-y-2">
                  {[
                    { l: 'Barren / Suitable', v: lc.barren_pct, c: 'bg-amber-400' },
                    { l: 'Agricultural',      v: lc.agricultural_pct, c: 'bg-emerald-400' },
                    { l: 'Forest',            v: lc.forest_pct, c: 'bg-green-600' },
                    { l: 'Urban',             v: lc.urban_pct, c: 'bg-slate-400' },
                    { l: 'Water',             v: lc.water_pct, c: 'bg-sky-400' },
                  ].map(({ l, v, c }) => (
                    <div key={l}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400 font-plex">{l}</span>
                        <span className="text-white font-mono">{v.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-navy-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c} transition-all duration-500`} style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Data source note */}
            <p className="text-slate-600 text-xs font-plex leading-relaxed border-t border-navy-600 pt-3">
              Open-source proxy models · Replace with GEE Sentinel-2, SRTM DEM, and OSM Overpass for production
            </p>
          </div>
        ) : (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-white text-sm font-semibold font-outfit">Select an Analysis Zone</p>
            <p className="text-slate-500 text-xs font-plex mt-2 leading-relaxed">
              Click <span className="text-white font-semibold">"Draw Analysis Zone"</span> on the map, then click two points to define your region
            </p>
            <div className="mt-6 space-y-2 w-full text-left">
              {[
                { icon: Sun,  color: 'text-amber-400',   label: 'Solar PV suitability via GHI model' },
                { icon: Wind, color: 'text-cyan-400',    label: 'Wind power density via climatology' },
                { icon: Activity, color: 'text-emerald-400', label: 'CAPEX & infrastructure risk score' },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs text-slate-400 font-plex">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
