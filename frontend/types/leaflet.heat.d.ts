import * as L from 'leaflet'

declare module 'leaflet' {
  type HeatLatLngTuple = [number, number, number?]

  interface HeatMapOptions {
    minOpacity?: number
    maxZoom?: number
    max?: number
    radius?: number
    blur?: number
    gradient?: Record<number, string>
  }

  class HeatLayer extends L.Layer {
    constructor(latlngs: HeatLatLngTuple[], options?: HeatMapOptions)
    setLatLngs(latlngs: HeatLatLngTuple[]): this
    addLatLng(latlng: HeatLatLngTuple): this
    setOptions(options: HeatMapOptions): this
    redraw(): this
  }

  function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatMapOptions): HeatLayer
}
