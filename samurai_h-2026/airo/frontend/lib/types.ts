// ── Types ─────────────────────────────────────────────────────────────────────

export type EnergyType = 'solar' | 'wind' | 'both'

export interface BBox {
  min_lat: number
  min_lng: number
  max_lat: number
  max_lng: number
}

export interface AnalyzeRequest extends BBox {
  energy_type: EnergyType
}

export interface SolarData {
  type: 'solar'
  avg_ghi_kwh_m2_day: number
  optimal_tilt_degrees: number
  ndvi_index: number
  vegetation_exclusion_pct: number
  terrain_suitability_pct: number
  suitable_area_ha: number
  panel_efficiency_pct: number
  annual_energy_mwh: number
  peak_capacity_mw: number
  capacity_factor: number
  co2_offset_kt_yr: number
}

export interface WindData {
  type: 'wind'
  avg_wind_speed_ms: number
  wind_power_density_w_m2: number
  air_density_kg_m3: number
  num_turbines: number
  turbine_capacity_mw: number
  total_capacity_mw: number
  capacity_factor: number
  annual_energy_mwh: number
  co2_offset_kt_yr: number
}

export interface Infrastructure {
  grid_distance_km: number
  road_distance_km: number
  grid_connection_cost_m_usd: number
  grid_score: number
  road_score: number
  feasibility_score: number
}

export interface LandCover {
  forest_pct: number
  urban_pct: number
  water_pct: number
  barren_pct: number
  agricultural_pct: number
}

export interface RiskFactor {
  factor: string
  value: string
  risk: 'low' | 'medium' | 'high'
  description: string
}

export interface AnalysisResult {
  status: string
  timestamp: string
  bbox: BBox & { center_lat: number; center_lng: number }
  summary: {
    area_km2: number
    area_ha: number
    suitability_percentage: number
    annual_energy_mwh: number
    energy_type: string
    feasibility_score: number
  }
  solar: SolarData | null
  wind: WindData | null
  infrastructure: Infrastructure
  land_cover: LandCover
  risk_factors: RiskFactor[]
  heatmap_geojson: GeoJSON.FeatureCollection
  data_sources: Record<string, string>
}

export type LayerKey = 'satellite' | 'solar_heatmap' | 'wind_heatmap' | 'land_cover'
export type Layers = Record<LayerKey, boolean>

// ── App Mode ───────────────────────────────────────────────────────────────────
export type AppMode = 'geo-energy' | 'spectra'

// ── Spectra / ESI Types ────────────────────────────────────────────────────────
export type StressType = 'thermal' | 'lighting' | 'mixed'

export interface EsiNeighborhood {
  id: string
  name: string
  esi_score: number            // 0–100
  stress_type: StressType
  viirs_ntl: number            // night-time light radiance (nW/cm²/sr)
  lst_celsius: number          // land surface temperature (°C)
  land_use: string
  population_density: number   // persons/km²
  geometry: GeoJSON.Feature<GeoJSON.Polygon>
}

export interface SpectraData {
  city: string
  analyzed_at: string
  neighborhoods: EsiNeighborhood[]
}
