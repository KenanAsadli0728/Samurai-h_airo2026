import { AnalyzeRequest, AnalysisResult } from './types'

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? ''

export async function analyzeRegion(req: AnalyzeRequest): Promise<AnalysisResult> {
  const res = await fetch(`${BASE}/api/analyze-region`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).detail ?? `Analysis failed (${res.status})`)
  }
  return res.json() as Promise<AnalysisResult>
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`)
    return res.ok
  } catch {
    return false
  }
}
