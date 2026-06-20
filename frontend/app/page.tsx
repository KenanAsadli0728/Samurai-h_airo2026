'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar/Sidebar'
import SpectraSidebar from '@/components/Spectra/SpectraSidebar'
import NeighborhoodDrawer from '@/components/Spectra/NeighborhoodDrawer'
import ComplianceNoticeModal from '@/components/Spectra/ComplianceNoticeModal'
import AIReportModal from '@/components/Spectra/AIReportModal'
import { MOCK_SPECTRA_DATA } from '@/lib/mockSpectraData'
import { MOCK_VIOLATIONS } from '@/lib/mockConstructionData'
import { AnalysisResult, EnergyType, Layers, AppMode, ConstructionViolation, ComplianceNoticeRequest } from '@/lib/types'

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
  const [blindSpotLayer, setBlindSpotLayer] = useState(false)

  // Construction compliance state
  const [violations] = useState<ConstructionViolation[]>(MOCK_VIOLATIONS)
  const [violationLayer, setViolationLayer] = useState(false)
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null)
  const [noticeRequest, setNoticeRequest] = useState<ComplianceNoticeRequest | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  const handleGenerateNotice = (v: ConstructionViolation) => {
    const ring = v.geometry.geometry.coordinates[0]
    const pts = ring.slice(0, -1)
    const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
    const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const neighborhood = spectraData.neighborhoods.find(n => n.id === v.neighborhood_id)
    setNoticeRequest({
      violation_id: v.id,
      name: v.name,
      neighborhood: neighborhood?.name ?? v.neighborhood_id,
      city: spectraData.city,
      violation_type: v.violation_type,
      built_area_sqm: v.built_area_sqm,
      permitted_area_sqm: v.permitted_area_sqm,
      confidence: v.confidence,
      first_detected: v.first_detected,
      lat, lng,
    })
  }

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
            blindSpotLayer={blindSpotLayer}
            onBlindSpotLayerToggle={() => setBlindSpotLayer(v => !v)}
            selectedId={selectedNeighborhoodId}
            violations={violations}
            violationLayer={violationLayer}
            onViolationLayerToggle={() => setViolationLayer(v => !v)}
            selectedViolationId={selectedViolationId}
            onSelectViolation={setSelectedViolationId}
            onGenerateNotice={handleGenerateNotice}
            onGenerateReport={() => setReportOpen(true)}
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
            blindSpotLayer={blindSpotLayer}
            violations={appMode === 'spectra' ? violations : undefined}
            violationLayer={violationLayer}
            selectedNeighborhoodId={selectedNeighborhoodId}
            onNeighborhoodSelect={setSelectedNeighborhoodId}
            selectedViolationId={selectedViolationId}
            onViolationSelect={setSelectedViolationId}
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
      {noticeRequest && (
        <ComplianceNoticeModal request={noticeRequest} onClose={() => setNoticeRequest(null)} />
      )}
      {reportOpen && (
        <AIReportModal city={spectraData.city} neighborhoods={spectraData.neighborhoods} onClose={() => setReportOpen(false)} />
      )}
    </div>
  )
}
