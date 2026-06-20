'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Loader2, Copy, Check, AlertCircle } from 'lucide-react'
import { EsiNeighborhood, EnergyReportResponse } from '@/lib/types'
import { generateEnergyReport } from '@/lib/api'

interface AIReportModalProps {
  city: string
  neighborhoods: EsiNeighborhood[]
  onClose: () => void
}

export default function AIReportModal({ city, neighborhoods, onClose }: AIReportModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<EnergyReportResponse | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateEnergyReport({
      city,
      neighborhoods: neighborhoods.map(n => ({
        id: n.id, name: n.name, esi_score: n.esi_score, stress_type: n.stress_type,
        lst_celsius: n.lst_celsius, viirs_ntl: n.viirs_ntl, population_density: n.population_density,
        metering_coverage_pct: n.metering_coverage_pct, grid_blind_spot_score: n.grid_blind_spot_score,
        urban_risk_score: n.urban_risk_score,
      })),
    })
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to generate report'))
      .finally(() => setLoading(false))
  }, [city, neighborhoods])

  const handleCopy = async () => {
    if (!report) return
    await navigator.clipboard.writeText(report.report_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        data-testid="ai-report-modal"
        className="bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-navy-600">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white text-sm font-outfit font-semibold">AI Intervention Report — {city}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center gap-2 px-5 py-8 text-red-400 text-sm font-plex">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {report && (
          <>
            <div className="flex-none flex items-center justify-between px-5 py-2.5 border-b border-navy-700 bg-navy-800/50">
              <span className="text-xs text-slate-500 font-plex">{report.summary}</span>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className="text-xs text-slate-500 font-mono">{report.report_id}</span>
                <button
                  data-testid="copy-report-btn"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-plex text-slate-300 hover:text-white bg-navy-700 hover:bg-navy-600 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">{report.report_text}</pre>
            </div>
            <div className="flex-none px-5 py-2.5 border-t border-navy-700 bg-navy-800/50">
              <p className="text-xs text-slate-500 font-plex">
                Template-generated from satellite-derived ESI signals. Subject to site survey before capital allocation.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
