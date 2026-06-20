'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Rectangle, useMapEvents, useMap, ZoomControl } from 'react-leaflet'
import type { GeoJSON as GeoJSONType } from 'geojson'
import L from 'leaflet'
import { Square, MousePointer2, RotateCcw, AlertCircle, Loader2, Sun, Wind } from 'lucide-react'
import { AppMode, EnergyType, Layers, AnalysisResult, SpectraData, StressType } from '@/lib/types'
import { analyzeRegion } from '@/lib/api'

// ── Tile URLs ──────────────────────────────────────────────────────────────────
const TILES = {
  voyager:   'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}
const ATTR = {
  voyager:   '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  satellite: 'Tiles &copy; Esri',
}

// ── Score → fill color ─────────────────────────────────────────────────────────
function scoreColor(score: number, type: EnergyType): string {
  if (type === 'wind') {
    if (score > 0.68) return '#06B6D4'
    if (score > 0.38) return '#67E8F9'
    return '#CFFAFE'
  }
  if (score > 0.68) return '#F59E0B'
  if (score > 0.38) return '#FCD34D'
  return '#FEF3C7'
}

// ── ESI stress type → fill color ───────────────────────────────────────────────
function esiColor(stressType: StressType, score: number): string {
  if (stressType === 'thermal') {
    if (score >= 75) return '#DC2626'
    if (score >= 50) return '#F87171'
    return '#FCA5A5'
  }
  if (stressType === 'lighting') {
    if (score >= 75) return '#D97706'
    if (score >= 50) return '#FBBF24'
    return '#FDE68A'
  }
  if (score >= 75) return '#EA580C'
  if (score >= 50) return '#FB923C'
  return '#FED7AA'
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
  selectedNeighborhoodId?: string | null
  onNeighborhoodSelect?: (id: string | null) => void
  onAnalysisStart: () => void
  onAnalysisComplete: (r: AnalysisResult) => void
  onAnalysisError: (msg: string) => void
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MapComponent({
  appMode, energyType, layers, analysis,
  spectraData, esiHeatmap, selectedNeighborhoodId, onNeighborhoodSelect,
  onAnalysisStart, onAnalysisComplete, onAnalysisError,
}: MapComponentProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const heatmapStyle = useCallback((feature: GeoJSONType.Feature | undefined) => {
    const score = (feature?.properties as any)?.score ?? 0
    return { fillColor: scoreColor(score, energyType), fillOpacity: 0.60, color: 'transparent', weight: 0 }
  }, [energyType])

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

  const esiStyle = useCallback((feature: GeoJSONType.Feature | undefined) => {
    const id = feature?.properties?.id as string
    const stress = feature?.properties?.stress_type as StressType
    const score = feature?.properties?.esi_score as number
    const isSelected = id === selectedNeighborhoodId
    return {
      fillColor: esiColor(stress, score),
      fillOpacity: isSelected ? 0.85 : 0.60,
      color: isSelected ? '#FFFFFF' : '#00000022',
      weight: isSelected ? 2 : 0.5,
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

  const flyTo = useMemo(() => {
    if (appMode === 'spectra' && spectraData?.neighborhoods.length) {
      return { center: [30.05, 31.28] as [number, number], zoom: 11 }
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
          <GeoJSON key={`hm-${analysis.timestamp}-${energyType}`} data={analysis.heatmap_geojson as GeoJSONType.FeatureCollection} style={heatmapStyle as any} />
        )}

        {/* ESI heatmap (spectra mode) */}
        {appMode === 'spectra' && esiHeatmap && esiGeoJSON && (
          <GeoJSON key={`esi-${selectedNeighborhoodId}`} data={esiGeoJSON} style={esiStyle as any} onEachFeature={onEachEsi} />
        )}

        {/* Selection rectangle */}
        {selectedBounds && (
          <Rectangle bounds={selectedBounds} pathOptions={{ color: selColor, weight: 2.5, fillColor: selColor, fillOpacity: 0.08, dashArray: '7 4' }} />
        )}

        <DrawControl isDrawing={isDrawing} onComplete={handleDrawComplete} onCancel={() => setIsDrawing(false)} />
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
    </div>
  )
}
