import { EsiNeighborhood, SpectraData } from './types'

function makePoly(centerLat: number, centerLng: number, size = 0.018): GeoJSON.Feature<GeoJSON.Polygon> {
  const h = size / 2
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [centerLng - h, centerLat - h],
        [centerLng + h, centerLat - h],
        [centerLng + h, centerLat + h],
        [centerLng - h, centerLat + h],
        [centerLng - h, centerLat - h],
      ]],
    },
  }
}

// Grid Security Blind Spot Score: high energy stress + low metering coverage
// means anomalous consumption (and potential grid tampering/theft) would go
// undetected the longest — these zones are de-prioritized for OT/grid monitoring.
function blindSpotScore(esiScore: number, meteringCoveragePct: number): number {
  return Math.round(esiScore * (1 - meteringCoveragePct / 100))
}

// Predicted Violation Risk: forward-looking likelihood of new unpermitted
// construction in the next 12 months. Densification pressure + poor metering
// coverage + an already-flagged grid blind spot compound into higher risk —
// the same zones nobody is watching energy-wise are the ones nobody is
// watching construction-wise either.
function predictedViolationRisk(populationDensity: number, meteringCoveragePct: number, blindSpot: number): number {
  const densification = Math.min(100, (populationDensity / 45_000) * 100)
  const monitoringGap = 100 - meteringCoveragePct
  return Math.round(0.35 * monitoringGap + 0.35 * densification + 0.30 * blindSpot)
}

// Urban Risk Score: the unified fusion metric — energy stress, grid security
// blind spots, and forward-looking construction risk collapsed into one
// per-neighborhood number for prioritizing inspections/monitoring resources.
function urbanRiskScore(esiScore: number, blindSpot: number, predictedRisk: number): number {
  return Math.round(0.4 * esiScore + 0.3 * blindSpot + 0.3 * predictedRisk)
}

type RawHood = Omit<EsiNeighborhood, 'grid_blind_spot_score' | 'predicted_violation_risk' | 'urban_risk_score'>

const raw: RawHood[] = [
  {
    id: 'n1', name: 'Sabail (Old City / Downtown)',
    esi_score: 86, stress_type: 'mixed',
    viirs_ntl: 221, lst_celsius: 39.4,
    land_use: 'Dense Urban / Historic Core', population_density: 41800,
    metering_coverage_pct: 72,
    geometry: makePoly(40.3666, 49.8352),
  },
  {
    id: 'n2', name: 'Nasimi',
    esi_score: 79, stress_type: 'lighting',
    viirs_ntl: 204, lst_celsius: 35.1,
    land_use: 'Commercial / High-Rise Residential', population_density: 36200,
    metering_coverage_pct: 65,
    geometry: makePoly(40.3947, 49.8460),
  },
  {
    id: 'n3', name: 'Yasamal',
    esi_score: 61, stress_type: 'thermal',
    viirs_ntl: 121, lst_celsius: 38.7,
    land_use: 'Residential / Hillside', population_density: 22500,
    metering_coverage_pct: 48,
    geometry: makePoly(40.3853, 49.8108),
  },
  {
    id: 'n4', name: 'Nizami',
    esi_score: 83, stress_type: 'thermal',
    viirs_ntl: 168, lst_celsius: 40.6,
    land_use: 'Soviet-Era Apartment Blocks', population_density: 33700,
    metering_coverage_pct: 39,
    geometry: makePoly(40.3815, 49.8670),
  },
  {
    id: 'n5', name: 'Narimanov',
    esi_score: 58, stress_type: 'mixed',
    viirs_ntl: 143, lst_celsius: 34.9,
    land_use: 'Mixed Residential / Institutional', population_density: 19400,
    metering_coverage_pct: 70,
    geometry: makePoly(40.4119, 49.8559),
  },
  {
    id: 'n6', name: 'Khatai',
    esi_score: 71, stress_type: 'thermal',
    viirs_ntl: 96, lst_celsius: 41.2,
    land_use: 'Industrial / Refinery-Adjacent', population_density: 17800,
    metering_coverage_pct: 28,
    geometry: makePoly(40.3775, 49.9100),
  },
  {
    id: 'n7', name: 'Binagadi',
    esi_score: 47, stress_type: 'lighting',
    viirs_ntl: 84, lst_celsius: 33.5,
    land_use: 'Suburban / Low-Density', population_density: 8600,
    metering_coverage_pct: 33,
    geometry: makePoly(40.4990, 49.7800),
  },
  {
    id: 'n8', name: 'Sabunchu',
    esi_score: 65, stress_type: 'mixed',
    viirs_ntl: 102, lst_celsius: 36.8,
    land_use: 'Industrial / Oil-Field Periphery', population_density: 14300,
    metering_coverage_pct: 24,
    geometry: makePoly(40.4280, 49.9500),
  },
]

const neighborhoods: EsiNeighborhood[] = raw.map(n => {
  const blindSpot = blindSpotScore(n.esi_score, n.metering_coverage_pct)
  const predictedRisk = predictedViolationRisk(n.population_density, n.metering_coverage_pct, blindSpot)
  return {
    ...n,
    grid_blind_spot_score: blindSpot,
    predicted_violation_risk: predictedRisk,
    urban_risk_score: urbanRiskScore(n.esi_score, blindSpot, predictedRisk),
  }
})

export const MOCK_SPECTRA_DATA: SpectraData = {
  city: 'Baku, Azerbaijan',
  analyzed_at: new Date().toISOString(),
  neighborhoods,
}
