import { ConstructionViolation } from './types'

function makeLot(centerLat: number, centerLng: number, size = 0.0035): GeoJSON.Feature<GeoJSON.Polygon> {
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

// Simulated Sentinel-1/Sentinel-2 bi-temporal change-detection output, cross-
// referenced against the municipal permit registry. confidence approximates
// a Siamese U-Net change-mask probability; geometry approximates the
// vectorized footprint delta between the historical and current pass.
export const MOCK_VIOLATIONS: ConstructionViolation[] = [
  {
    id: 'v1', neighborhood_id: 'n4', name: 'Plot 14B — Nizami',
    geometry: makeLot(40.3828, 49.8691),
    built_area_sqm: 412, permitted_area_sqm: 0,
    violation_type: 'unpermitted', confidence: 0.91,
    first_detected: '2025-03-18',
  },
  {
    id: 'v2', neighborhood_id: 'n4', name: 'Plot 22 — Nizami',
    geometry: makeLot(40.3801, 49.8645),
    built_area_sqm: 680, permitted_area_sqm: 420,
    violation_type: 'oversized', confidence: 0.84,
    first_detected: '2025-06-02',
  },
  {
    id: 'v3', neighborhood_id: 'n6', name: 'Refinery Periphery Plot 7 — Khatai',
    geometry: makeLot(40.3752, 49.9132),
    built_area_sqm: 905, permitted_area_sqm: 0,
    violation_type: 'unpermitted', confidence: 0.88,
    first_detected: '2025-01-09',
  },
  {
    id: 'v4', neighborhood_id: 'n6', name: 'Plot 3 — Khatai',
    geometry: makeLot(40.3789, 49.9067),
    built_area_sqm: 310, permitted_area_sqm: 310,
    violation_type: 'compliant', confidence: 0.95,
    first_detected: '2024-11-21',
  },
  {
    id: 'v5', neighborhood_id: 'n8', name: 'Oil-Field Periphery Plot 11 — Sabunchu',
    geometry: makeLot(40.4301, 49.9523),
    built_area_sqm: 540, permitted_area_sqm: 260,
    violation_type: 'oversized', confidence: 0.79,
    first_detected: '2025-07-14',
  },
  {
    id: 'v6', neighborhood_id: 'n8', name: 'Plot 19 — Sabunchu',
    geometry: makeLot(40.4258, 49.9468),
    built_area_sqm: 388, permitted_area_sqm: 0,
    violation_type: 'unpermitted', confidence: 0.86,
    first_detected: '2025-05-27',
  },
  {
    id: 'v7', neighborhood_id: 'n1', name: 'Old City Annex — Sabail',
    geometry: makeLot(40.3688, 49.8378),
    built_area_sqm: 295, permitted_area_sqm: 180,
    violation_type: 'oversized', confidence: 0.73,
    first_detected: '2025-04-05',
  },
  {
    id: 'v8', neighborhood_id: 'n2', name: 'Plot 5 — Nasimi',
    geometry: makeLot(40.3962, 49.8489),
    built_area_sqm: 450, permitted_area_sqm: 450,
    violation_type: 'compliant', confidence: 0.97,
    first_detected: '2024-09-30',
  },
  {
    id: 'v9', neighborhood_id: 'n3', name: 'Hillside Plot 9 — Yasamal',
    geometry: makeLot(40.3829, 49.8082),
    built_area_sqm: 265, permitted_area_sqm: 0,
    violation_type: 'unpermitted', confidence: 0.69,
    first_detected: '2025-08-02',
  },
  {
    id: 'v10', neighborhood_id: 'n7', name: 'Plot 2 — Binagadi',
    geometry: makeLot(40.5012, 49.7765),
    built_area_sqm: 210, permitted_area_sqm: 210,
    violation_type: 'compliant', confidence: 0.94,
    first_detected: '2024-12-15',
  },
]
