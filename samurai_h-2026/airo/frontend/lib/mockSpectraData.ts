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

const neighborhoods: EsiNeighborhood[] = [
  {
    id: 'n1', name: 'Downtown Cairo',
    esi_score: 88, stress_type: 'mixed',
    viirs_ntl: 214, lst_celsius: 44.8,
    land_use: 'Dense Urban', population_density: 43200,
    geometry: makePoly(30.044, 31.235),
  },
  {
    id: 'n2', name: 'Giza',
    esi_score: 81, stress_type: 'thermal',
    viirs_ntl: 98, lst_celsius: 47.2,
    land_use: 'Urban / Peri-urban', population_density: 28500,
    geometry: makePoly(30.003, 31.213),
  },
  {
    id: 'n3', name: 'Heliopolis',
    esi_score: 64, stress_type: 'mixed',
    viirs_ntl: 142, lst_celsius: 40.1,
    land_use: 'Residential', population_density: 18700,
    geometry: makePoly(30.087, 31.322),
  },
  {
    id: 'n4', name: 'Nasr City',
    esi_score: 77, stress_type: 'lighting',
    viirs_ntl: 198, lst_celsius: 38.5,
    land_use: 'Commercial / Residential', population_density: 35100,
    geometry: makePoly(30.064, 31.337),
  },
  {
    id: 'n5', name: 'Zamalek',
    esi_score: 52, stress_type: 'lighting',
    viirs_ntl: 167, lst_celsius: 36.8,
    land_use: 'Residential / Diplomatic', population_density: 12400,
    geometry: makePoly(30.062, 31.222),
  },
  {
    id: 'n6', name: 'Maadi',
    esi_score: 38, stress_type: 'mixed',
    viirs_ntl: 88, lst_celsius: 34.2,
    land_use: 'Suburban Residential', population_density: 9800,
    geometry: makePoly(29.958, 31.258),
  },
  {
    id: 'n7', name: 'New Cairo',
    esi_score: 57, stress_type: 'thermal',
    viirs_ntl: 76, lst_celsius: 42.6,
    land_use: 'New Urban Development', population_density: 7200,
    geometry: makePoly(30.027, 31.473),
  },
  {
    id: 'n8', name: 'Shubra',
    esi_score: 74, stress_type: 'thermal',
    viirs_ntl: 112, lst_celsius: 45.4,
    land_use: 'Dense Residential', population_density: 39600,
    geometry: makePoly(30.109, 31.256),
  },
]

export const MOCK_SPECTRA_DATA: SpectraData = {
  city: 'Cairo Metropolitan Area',
  analyzed_at: new Date().toISOString(),
  neighborhoods,
}
