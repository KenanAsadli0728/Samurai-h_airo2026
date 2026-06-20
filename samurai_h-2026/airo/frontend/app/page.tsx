'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar/Sidebar'
import SpectraSidebar from '@/components/Spectra/SpectraSidebar'
import NeighborhoodDrawer from '@/components/Spectra/NeighborhoodDrawer'
import { MOCK_SPECTRA_DATA } from '@/lib/mockSpectraData'
import { AnalysisResult, EnergyType, Layers, AppMode } from '@/lib/types'

const MapView = dynamic(() => import('@/components/Map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 font-plex text-sm">Loading map engine…</p>
      </div>
    </div>
  ),
})

export default function HomePage() {
  // Geo-energy state
  const [appMode, setAppMode] = useState<AppMode>('geo-energy')
  const [energyType, setEnergyType] = useState<EnergyType>('solar')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [layers, setLayers] = useState<Layers>({
    satellite: false,
    solar_heatmap: false,
    wind_heatmap: false,
    land_cover: false,
  })

  // Spectra state
  const [spectraData] = useState(MOCK_SPECTRA_DATA)
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string | null>(null)
  const [esiHeatmap, setEsiHeatmap] = useState(true)

  const toggleLayer = (key: keyof Layers) =>
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysis(result)
    setIsAnalyzing(false)
    if (result.summary.energy_type === 'solar') {
      setLayers(prev => ({ ...prev, solar_heatmap: true, wind_heatmap: false }))
    } else if (result.summary.energy_type === 'wind') {
      setLayers(prev => ({ ...prev, wind_heatmap: true, solar_heatmap: false }))
    } else {
      setLayers(prev => ({ ...prev, solar_heatmap: true, wind_heatmap: true }))
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-navy-900">
      <Navbar
        appMode={appMode}
        energyType={energyType}
        onEnergyTypeChange={(t) => { setEnergyType(t); setAnalysis(null) }}
        onAppModeChange={setAppMode}
      />
      <div className="flex flex-1 overflow-hidden">
        {appMode === 'spectra' ? (
          <SpectraSidebar
            spectraData={spectraData}
            esiHeatmap={esiHeatmap}
            onEsiHeatmapToggle={() => setEsiHeatmap(v => !v)}
            selectedId={selectedNeighborhoodId}
          />
        ) : (
          <Sidebar
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            energyType={energyType}
            layers={layers}
            onLayerToggle={toggleLayer}
          />
        )}
        <div className="flex-1 relative overflow-hidden">
          <MapView
            appMode={appMode}
            energyType={energyType}
            layers={layers}
            analysis={analysis}
            spectraData={appMode === 'spectra' ? spectraData : null}
            esiHeatmap={esiHeatmap}
            selectedNeighborhoodId={selectedNeighborhoodId}
            onNeighborhoodSelect={setSelectedNeighborhoodId}
            onAnalysisStart={() => setIsAnalyzing(true)}
            onAnalysisComplete={handleAnalysisComplete}
            onAnalysisError={() => setIsAnalyzing(false)}
          />
          {appMode === 'spectra' && (
            <NeighborhoodDrawer
              neighborhoods={spectraData.neighborhoods}
              selectedId={selectedNeighborhoodId}
              onSelect={setSelectedNeighborhoodId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
