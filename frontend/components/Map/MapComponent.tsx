'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Rectangle, useMapEvents, useMap, ZoomControl } from 'react-leaflet'
import type { GeoJSON as GeoJSONType } from 'geojson'
import L from 'leaflet'
import { Square, MousePointer2, RotateCcw, AlertCircle, Loader2, Sun, Wind } from 'lucide-react'
import { AppMode, EnergyType, Layers, AnalysisResult, SpectraData, ConstructionViolation } from '@/lib/types'
import { analyzeRegion } from '@/lib/api'

// leaflet.heat is a UMD plugin that attaches itself to a global `L` —
// it must be required (not statically imported) after `window.L` is set,
// otherwise it throws "L is not defined" during the import hoist.
if (typeof window !== 'undefined') {
  ;(window as any).L = (window as any).L || L
  require('leaflet.heat')
}

// ── Tile URLs ──────────────────────────────────────────────────────────────────
const TILES = {
  voyager:   'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}
const ATTR = {
  voyager:   '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  satellite: 'Tiles &copy; Esri',
}

// ── Heat gradients (smooth light-spread glow) ──────────────────────────────────
const SOLAR_GRADIENT: Record<number, string> = {
  0.0: 'rgba(254,243,199,0)',
  0.25: '#FEF3C7',
  0.5: '#FDE68A',
  0.7: '#FCD34D',
  0.85: '#F59E0B',
  1.0: '#EA580C',
}
const WIND_GRADIENT: Record<number, string> = {
  0.0: 'rgba(207,250,254,0)',
  0.25: '#CFFAFE',
  0.5: '#A5F3FC',
  0.7: '#67E8F9',
  0.85: '#22D3EE',
  1.0: '#06B6D4',
}

function heatGradient(type: EnergyType) {
  return type === 'wind' ? WIND_GRADIENT : SOLAR_GRADIENT
}

// ── Energy heatmap (canvas-based, blurred for a continuous glow) ──────────────
function polygonCentroid(coords: number[][]): [number, number] {
  const pts = coords.slice(0, -1)
  const lat = pts.reduce((sum, p) => sum + p[1], 0) / pts.length
  const lng = pts.reduce((sum, p) => sum + p[0], 0) / pts.length
  return [lat, lng]
}

function HeatmapLayer({ data, energyType }: { data: GeoJSONType.FeatureCollection; energyType: EnergyType }) {
  const map = useMap()

  useEffect(() => {
    const points: L.HeatLatLngTuple[] = data.features.map((f: any) => {
      const ring = (f.geometry as GeoJSONType.Polygon).coordinates[0]
      const [lat, lng] = polygonCentroid(ring)
      const score = (f.properties as any)?.score ?? 0
      return [lat, lng, score]
    })

    const layer = L.heatLayer(points, {
      radius: 30,
      blur: 28,
      max: 1,
      minOpacity: 0.25,
      gradient: heatGradient(energyType),
    })
    layer.addTo(map)
    return () => { layer.remove() }
  }, [data, energyType, map])

  return null
}

// ── Night-light style city glow (rainbow radiance gradient) ───────────────────
const NIGHT_LIGHT_GRADIENT: Record<number, string> = {
  0.0: '#1e3a8a',
  0.15: '#0ea5e9',
  0.3: '#22d3ee',
  0.45: '#4ade80',
  0.58: '#a3e635',
  0.68: '#facc15',
  0.78: '#fb923c',
  0.88: '#ef4444',
  1.0: '#fef2f2',
}

function EsiGlowLayer({ neighborhoods }: { neighborhoods: { geometry: GeoJSONType.Feature<GeoJSONType.Polygon>; viirs_ntl: number }[] }) {
  const map = useMap()

  useEffect(() => {
    if (!neighborhoods.length) return
    const maxNtl = Math.max(...neighborhoods.map(n => n.viirs_ntl))
    const points: L.HeatLatLngTuple[] = neighborhoods.map((n) => {
      const ring = n.geometry.geometry.coordinates[0]
      const [lat, lng] = polygonCentroid(ring)
      return [lat, lng, Math.max(0.3, n.viirs_ntl / maxNtl)]
    })

    const layer = L.heatLayer(points, {
      radius: 95,
      blur: 75,
      max: 1,
      minOpacity: 0.4,
      gradient: NIGHT_LIGHT_GRADIENT,
    })
    layer.addTo(map)
    return () => { layer.remove() }
  }, [neighborhoods, map])

  return null
}

function selectionColor(type: EnergyType) {
  return type === 'solar' ? '#F59E0B' : type === 'wind' ? '#06B6D4' : '#10B981'
}

// ── Auto-pan controller ────────────────────────────────────────────────────────
function MapController({ flyTo }: { flyTo?: { center: [number, number]; zoom: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo.center, flyTo.zoom, { duration: 1.5 })
  }, [map, flyTo])
  return null
}

// ── Click-to-zoom (closer look at a country) ──────────────────────────────────
function CountryZoomControl({ disabled }: { disabled: boolean }) {
  const map = useMap()
  useMapEvents({
    click(e) {
      if (disabled) return
      const zoom = map.getZoom()
      if (zoom >= 8) return // already close enough, let normal panning take over
      const nextZoom = zoom < 5 ? 6 : Math.min(zoom + 2, 8)
      map.flyTo(e.latlng, nextZoom, { duration: 1.2 })
    },
  })
  return null
}

// ── Draw interaction ───────────────────────────────────────────────────────────
interface DrawControlProps {
  isDrawing: boolean
  onComplete: (bounds: L.LatLngBounds) => void
  onCancel: () => void
}

function DrawControl({ isDrawing, onComplete, onCancel }: DrawControlProps) {
  const map = useMap()
  const startRef = useRef<L.LatLng | null>(null)
  const [liveRect, setLiveRect] = useState<L.LatLngBounds | null>(null)

  useEffect(() => {
    const container = map.getContainer()
    if (isDrawing) {
      map.dragging.disable()
      map.doubleClickZoom.disable()
      container.classList.add('draw-mode-active')
    } else {
      map.dragging.enable()
      map.doubleClickZoom.enable()
      container.classList.remove('draw-mode-active')
      startRef.current = null
      setLiveRect(null)
    }
    return () => {
      map.dragging.enable()
      map.doubleClickZoom.enable()
      container.classList.remove('draw-mode-active')
    }
  }, [isDrawing, map])

  useMapEvents({
    mousedown(e) { if (!isDrawing) return; startRef.current = e.latlng; setLiveRect(null) },
    mousemove(e) { if (!isDrawing || !startRef.current) return; setLiveRect(L.latLngBounds(startRef.current, e.latlng)) },
    mouseup(e) {
      if (!isDrawing || !startRef.current) return
      const bounds = L.latLngBounds(startRef.current, e.latlng)
      const latDiff = Math.abs(bounds.getNorth() - bounds.getSouth())
      const lngDiff = Math.abs(bounds.getEast() - bounds.getWest())
      startRef.current = null; setLiveRect(null)
      if (latDiff > 0.005 && lngDiff > 0.005) onComplete(bounds)
    },
    keydown(e) { if ((e.originalEvent as KeyboardEvent).key === 'Escape') onCancel() },
  })

  if (!liveRect) return null
  return <Rectangle bounds={liveRect} pathOptions={{ color: '#10B981', weight: 2, fillOpacity: 0.06, dashArray: '6 4' }} />
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface MapComponentProps {
  appMode: AppMode
  energyType: EnergyType
  layers: Layers
  analysis: AnalysisResult | null
  spectraData?: SpectraData | null
  esiHeatmap?: boolean
  blindSpotLayer?: boolean
  violations?: ConstructionViolation[]
  violationLayer?: boolean
  selectedNeighborhoodId?: string | null
  onNeighborhoodSelect?: (id: string | null) => void
  selectedViolationId?: string | null
  onViolationSelect?: (id: string | null) => void
  onAnalysisStart: () => void
  onAnalysisComplete: (r: AnalysisResult) => void
  onAnalysisError: (msg: string) => void
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MapComponent({
  appMode, energyType, layers, analysis,
  spectraData, esiHeatmap, blindSpotLayer, violations, violationLayer,
  selectedNeighborhoodId, onNeighborhoodSelect, selectedViolationId, onViolationSelect,
  onAnalysisStart, onAnalysisComplete, onAnalysisError,
}: MapComponentProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esiGeoJSON = useMemo<GeoJSONType.FeatureCollection | null>(() => {
    if (!spectraData?.neighborhoods.length) return null
    return {
      type: 'FeatureCollection',
      features: spectraData.neighborhoods.map(n => ({
        ...n.geometry,
        properties: { id: n.id, name: n.name, esi_score: n.esi_score, stress_type: n.stress_type },
      })),
    }
  }, [spectraData])

  // Fill stays near-transparent so the night-light glow underneath shows through;
  // the polygon only carries the click target, tooltip, and selection outline.
  const esiStyle = useCallback((feature: GeoJSONType.Feature | undefined) => {
    const id = feature?.properties?.id as string
    const isSelected = id === selectedNeighborhoodId
    return {
      fillColor: '#FFFFFF',
      fillOpacity: isSelected ? 0.18 : 0.02,
      color: isSelected ? '#FFFFFF' : 'transparent',
      weight: isSelected ? 2.5 : 0,
    }
  }, [selectedNeighborhoodId])

  const onEachEsi = useCallback((feature: GeoJSONType.Feature, layer: L.Layer) => {
    layer.on('click', () => {
      const id = feature.properties?.id as string
      onNeighborhoodSelect?.(id === selectedNeighborhoodId ? null : id)
    })
    layer.bindTooltip(
      `<b>${feature.properties?.name}</b><br/>ESI: ${feature.properties?.esi_score} · ${feature.properties?.stress_type}`,
      { sticky: true }
    )
  }, [selectedNeighborhoodId, onNeighborhoodSelect])

  // Grid Security Blind Spots: zones where high energy stress meets low metering
  // coverage — anomalous load (tampering, theft, unmonitored OT activity) would
  // go undetected the longest here.
  const blindSpotGeoJSON = useMemo<GeoJSONType.FeatureCollection | null>(() => {
    if (!spectraData?.neighborhoods.length) return null
    const flagged = spectraData.neighborhoods.filter(n => n.grid_blind_spot_score >= 40)
    if (!flagged.length) return null
    return {
      type: 'FeatureCollection',
      features: flagged.map(n => ({
        ...n.geometry,
        properties: {
          id: n.id, name: n.name,
          grid_blind_spot_score: n.grid_blind_spot_score,
          metering_coverage_pct: n.metering_coverage_pct,
        },
      })),
    }
  }, [spectraData])

  const blindSpotStyle = useCallback((feature: GeoJSONType.Feature | undefined) => {
    const id = feature?.properties?.id as string
    const isSelected = id === selectedNeighborhoodId
    return {
      fillOpacity: 0,
      color: '#EF4444',
      weight: isSelected ? 3.5 : 2.5,
      dashArray: '5 4',
    }
  }, [selectedNeighborhoodId])

  const onEachBlindSpot = useCallback((feature: GeoJSONType.Feature, layer: L.Layer) => {
    layer.bindTooltip(
      `<b>⚠ Grid Security Blind Spot</b><br/>${feature.properties?.name}<br/>` +
      `Blind-spot risk: ${feature.properties?.grid_blind_spot_score}/100 · Metering coverage: ${feature.properties?.metering_coverage_pct}%`,
      { sticky: true }
    )
  }, [])

  // Construction Compliance: simulated bi-temporal change-detection output
  // (Sentinel-1/2 footprint delta) cross-referenced against the permit registry.
  const violationGeoJSON = useMemo<GeoJSONType.FeatureCollection | null>(() => {
    if (!violations?.length) return null
    return {
      type: 'FeatureCollection',
      features: violations.map(v => ({
        ...v.geometry,
        properties: {
          id: v.id, name: v.name, violation_type: v.violation_type,
          built_area_sqm: v.built_area_sqm, permitted_area_sqm: v.permitted_area_sqm,
          confidence: v.confidence, first_detected: v.first_detected,
        },
      })),
    }
  }, [violations])

  const violationStyle = useCallback((feature: GeoJSONType.Feature | undefined) => {
    const id = feature?.properties?.id as string
    const type = feature?.properties?.violation_type as ConstructionViolation['violation_type']
    const isSelected = id === selectedViolationId
    const color = type === 'unpermitted' ? '#DC2626' : type === 'oversized' ? '#F97316' : '#10B981'
    return {
      fillColor: color,
      fillOpacity: isSelected ? 0.55 : 0.35,
      color,
      weight: isSelected ? 3 : 1.5,
    }
  }, [selectedViolationId])

  const onEachViolation = useCallback((feature: GeoJSONType.Feature, layer: L.Layer) => {
    layer.on('click', () => {
      const id = feature.properties?.id as string
      onViolationSelect?.(id === selectedViolationId ? null : id)
    })
    const p = feature.properties as any
    const typeLabel = p.violation_type === 'unpermitted' ? 'Unpermitted' : p.violation_type === 'oversized' ? 'Oversized' : 'Compliant'
    layer.bindTooltip(
      `<b>${p.name}</b><br/>${typeLabel} · ${p.built_area_sqm}m² built / ${p.permitted_area_sqm}m² permitted<br/>` +
      `Detection confidence: ${Math.round(p.confidence * 100)}%`,
      { sticky: true }
    )
  }, [selectedViolationId, onViolationSelect])

  const flyTo = useMemo(() => {
    if (appMode === 'spectra' && spectraData?.neighborhoods.length) {
      return { center: [40.4093, 49.8671] as [number, number], zoom: 11 }
    }
    return null
  }, [appMode, spectraData])

  const selColor = selectionColor(energyType)

  const handleDrawComplete = useCallback(async (bounds: L.LatLngBounds) => {
    setSelectedBounds(bounds)
    setIsDrawing(false)
    setIsLoading(true)
    setError(null)
    onAnalysisStart()
    try {
      const result = await analyzeRegion({
        min_lat: bounds.getSouth(), min_lng: bounds.getWest(),
        max_lat: bounds.getNorth(), max_lng: bounds.getEast(),
        energy_type: energyType,
      })
      onAnalysisComplete(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg); onAnalysisError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [energyType, onAnalysisStart, onAnalysisComplete, onAnalysisError])

  const clearSelection = () => { setSelectedBounds(null); setIsDrawing(false); setError(null) }

  return (
    <div className="relative w-full h-full">
      {/* Draw controls — hidden in Spectra mode */}
      {appMode === 'geo-energy' && (
        <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2">
          <button
            data-testid="draw-zone-btn"
            onClick={() => { setIsDrawing(v => !v); setError(null) }}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold font-plex shadow-xl transition-all duration-200 ${
              isDrawing
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white scale-105 shadow-amber-500/30'
                : isLoading
                ? 'bg-white/90 text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-800 hover:shadow-2xl hover:-translate-y-0.5 border border-slate-200'
            }`}
          >
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              : isDrawing ? <><MousePointer2 className="w-4 h-4" /> Click & drag to select</>
              : <><Square className="w-4 h-4" /> Draw Analysis Zone</>}
          </button>
          {selectedBounds && !isLoading && (
            <button
              data-testid="clear-selection-btn"
              onClick={clearSelection}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium font-plex bg-white text-slate-500 hover:text-red-500 shadow-lg border border-slate-200 transition-all hover:-translate-y-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Selection
            </button>
          )}
        </div>
      )}

      {/* Mode legend (top-left) */}
      <div className="absolute top-4 left-4 z-[999]">
        {appMode === 'spectra' ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border text-xs font-semibold font-plex bg-indigo-50 border-indigo-200 text-indigo-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Spectra ESI · {spectraData?.city ?? 'No data'}
          </div>
        ) : (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border text-xs font-semibold font-plex ${
            energyType === 'solar' ? 'bg-amber-50 border-amber-200 text-amber-700'
              : energyType === 'wind' ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {energyType === 'solar' ? <Sun className="w-3.5 h-3.5" /> : energyType === 'wind' ? <Wind className="w-3.5 h-3.5" /> : <><Sun className="w-3 h-3" /><Wind className="w-3 h-3" /></>}
            {energyType === 'solar' ? 'Solar PV Mode' : energyType === 'wind' ? 'Wind Energy Mode' : 'Combined Analysis'}
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div data-testid="error-toast" className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-plex">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Draw mode instruction */}
      {isDrawing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[999] bg-slate-900/90 backdrop-blur text-white text-xs font-plex px-4 py-2 rounded-full shadow-xl">
          Press & drag to draw a rectangle · <span className="text-slate-400">Esc to cancel</span>
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer center={[25, 15]} zoom={3} minZoom={2} zoomControl={false} className="w-full h-full" style={{ background: '#e8f4f8' }}>
        <ZoomControl position="bottomright" />
        <MapController flyTo={flyTo} />

        <TileLayer
          key={layers.satellite ? 'sat' : 'voy'}
          url={layers.satellite ? TILES.satellite : TILES.voyager}
          attribution={layers.satellite ? ATTR.satellite : ATTR.voyager}
          maxZoom={19}
        />

        {/* Energy heatmap (geo-energy mode only) */}
        {appMode === 'geo-energy' && analysis?.heatmap_geojson && (layers.solar_heatmap || layers.wind_heatmap) && (
          <HeatmapLayer key={`hm-${analysis.timestamp}-${energyType}`} data={analysis.heatmap_geojson as GeoJSONType.FeatureCollection} energyType={energyType} />
        )}

        {/* ESI night-light glow (spectra mode) */}
        {appMode === 'spectra' && esiHeatmap && spectraData?.neighborhoods.length ? (
          <EsiGlowLayer neighborhoods={spectraData.neighborhoods} />
        ) : null}

        {/* Transparent click targets / selection outline + tooltips, on top of the glow */}
        {appMode === 'spectra' && esiHeatmap && esiGeoJSON && (
          <GeoJSON key={`esi-${selectedNeighborhoodId}`} data={esiGeoJSON} style={esiStyle as any} onEachFeature={onEachEsi} />
        )}

        {/* Grid Security Blind Spot overlay (spectra mode) */}
        {appMode === 'spectra' && blindSpotLayer && blindSpotGeoJSON && (
          <GeoJSON key={`blindspot-${selectedNeighborhoodId}`} data={blindSpotGeoJSON} style={blindSpotStyle as any} onEachFeature={onEachBlindSpot} />
        )}

        {/* Construction Compliance violations (spectra mode) */}
        {appMode === 'spectra' && violationLayer && violationGeoJSON && (
          <GeoJSON key={`violations-${selectedViolationId}`} data={violationGeoJSON} style={violationStyle as any} onEachFeature={onEachViolation} />
        )}

        {/* Selection rectangle */}
        {selectedBounds && (
          <Rectangle bounds={selectedBounds} pathOptions={{ color: selColor, weight: 2.5, fillColor: selColor, fillOpacity: 0.08, dashArray: '7 4' }} />
        )}

        <DrawControl isDrawing={isDrawing} onComplete={handleDrawComplete} onCancel={() => setIsDrawing(false)} />

        {appMode === 'geo-energy' && (
          <CountryZoomControl disabled={isDrawing || isLoading} />
        )}
      </MapContainer>

      {/* Energy heatmap legend */}
      {appMode === 'geo-energy' && (layers.solar_heatmap || layers.wind_heatmap) && analysis && (
        <div className="absolute bottom-8 right-4 z-[999] bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 px-4 py-3">
          <p className="text-xs font-semibold text-slate-600 font-plex mb-2">{layers.solar_heatmap ? 'Solar Potential' : 'Wind Potential'}</p>
          <div className="flex items-center gap-1">
            {(energyType !== 'wind' ? ['#FEF3C7', '#FCD34D', '#F59E0B'] : ['#CFFAFE', '#67E8F9', '#06B6D4']).map((c, i) => (
              <div key={c} className="flex flex-col items-center gap-1">
                <div className="w-6 h-4 rounded" style={{ background: c }} />
                <span className="text-xs text-slate-400 font-plex">{['Low', 'Med', 'High'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ESI legend */}
      {appMode === 'spectra' && esiHeatmap && (
        <div className="absolute bottom-14 right-4 z-[999] bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 px-4 py-3">
          <p className="text-xs font-semibold text-slate-600 font-plex mb-2">Energy Stress Index</p>
          <div className="space-y-1">
            {[
              { label: 'Thermal',  colors: ['#FCA5A5', '#F87171', '#DC2626'] },
              { label: 'Lighting', colors: ['#FDE68A', '#FBBF24', '#D97706'] },
              { label: 'Mixed',    colors: ['#FED7AA', '#FB923C', '#EA580C'] },
            ].map(({ label, colors }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-plex w-12">{label}</span>
                {colors.map((c, i) => (
                  <div key={i} className="w-5 h-3 rounded" style={{ background: c }} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400 font-plex">Low</span>
            <span className="text-xs text-slate-400 font-plex">High</span>
          </div>
        </div>
      )}

      {/* Bottom-left legend stack */}
      {appMode === 'spectra' && (blindSpotLayer || violationLayer) && (
        <div className="absolute bottom-8 left-4 z-[999] flex flex-col gap-2 max-w-[220px]">
          {blindSpotLayer && (
            <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-600 font-plex mb-1.5 flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm border-2 border-red-500" style={{ borderStyle: 'dashed' }} />
                Grid Security Blind Spots
              </p>
              <p className="text-xs text-slate-400 font-plex leading-snug">
                High energy stress + low metering coverage — anomalous load or tampering here would go undetected longest
              </p>
            </div>
          )}
          {violationLayer && (
            <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-600 font-plex mb-1.5">Construction Compliance</p>
              <div className="space-y-1">
                {[
                  { label: 'Unpermitted', color: '#DC2626' },
                  { label: 'Oversized', color: '#F97316' },
                  { label: 'Compliant', color: '#10B981' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500 font-plex">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
