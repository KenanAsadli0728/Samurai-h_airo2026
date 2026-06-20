# Günbəzgöz — PRD

## Original Problem Statement
Extend an existing GIS Dashboard to include a new "Spectra" mode based on the paper "Spectra: A Multi-Sensor Earth Observation Framework for Urban Energy Stress Mapping in Data-Scarce Regions".

## User Personas
- GIS/Remote Sensing researchers working in data-scarce regions
- Urban energy planners and policy makers
- Hackathon participants (time/token-sensitive)

## Architecture
```
/app/
├── backend/
│   ├── server.py              # FastAPI — analyze-region, health
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx           # Main layout — appMode, spectra state
    ├── components/
    │   ├── Map/
    │   │   └── MapComponent.tsx  # React-Leaflet + ESI GeoJSON layer
    │   ├── Sidebar/
    │   │   ├── Sidebar.tsx       # Geo-energy sidebar
    │   │   └── MetricCard.tsx
    │   ├── Spectra/
    │   │   ├── SpectraSidebar.tsx   # ESI stats, upload stubs, AI report stub
    │   │   └── NeighborhoodDrawer.tsx # Bottom drawer, sortable ranking table
    │   └── Navbar.tsx            # appMode toggle (Spectra button)
    ├── lib/
    │   ├── api.ts
    │   ├── types.ts              # AppMode, StressType, EsiNeighborhood, SpectraData
    │   └── mockSpectraData.ts    # 8 Cairo mock neighborhoods
    ├── package.json
    ├── tailwind.config.ts
    └── next.config.js
```

## Tech Stack
- Next.js 14 App Router + TypeScript
- React-Leaflet (interactive map, GeoJSON polygon layers)
- CartoDB Voyager + ESRI Satellite base tiles
- Tailwind CSS (JIT — no dynamic color interpolation)
- FastAPI + Python backend
- MongoDB (not yet used — stateless for now)

## What's Been Implemented

### Phase 1 — Geo-Energy Base (completed in previous session)
- Next.js + FastAPI setup
- React-Leaflet interactive map with bounding box draw tool
- Navbar with Solar / Wind / Combined tabs
- Sidebar with layer controls + analysis results panel
- MetricCard components
- `/api/analyze-region` endpoint (math estimation: GHI, wind density, CAPEX scoring)
- `/api/health` endpoint
- Fixed Tailwind JIT dynamic color bug

### Phase 2 — Spectra Mode (completed 2026-02)
- `AppMode` type (`geo-energy` | `spectra`)
- `EsiNeighborhood`, `SpectraData`, `StressType` types in `lib/types.ts`
- Mock data: 8 Cairo metropolitan neighborhoods in `lib/mockSpectraData.ts`
- Navbar: Spectra button (right side) toggles appMode; Solar/Wind/Combined hidden in Spectra mode
- SpectraSidebar: ESI summary cards, stress distribution bars (thermal/lighting/mixed), data source upload stubs (VIIRS/Landsat/Copernicus), ESI heatmap layer toggle, AI Report placeholder
- MapComponent: ESI GeoJSON polygon heatmap (red=thermal, amber=lighting, orange=mixed), auto-pan to Cairo on mode switch, ESI legend, neighborhood tooltip on hover, click-to-select
- NeighborhoodDrawer: fixed-bottom slide-up panel, sortable table (Name, ESI, Type, NTL, LST °C), row click selection synced with map + sidebar
- All 12 Spectra frontend tests passed ✅

## Core Requirements Status
| Requirement | Status |
|---|---|
| Spectra navbar tab | ✅ Done |
| ESI polygon heatmap on map | ✅ Done (mock data) |
| Spectra sidebar with ESI breakdown | ✅ Done |
| Sortable neighborhood ranking drawer | ✅ Done |
| Data upload UI stubs | ✅ Done |
| AI Report scaffold | ✅ Done (stub button) |
| Globally selectable map | ✅ (user navigates to any city) |
| Geo-energy mode intact | ✅ Unchanged |

## Backlog / Roadmap

### P0 (User to implement)
- Replace MOCK_SPECTRA_DATA with real VIIRS/Landsat/Copernicus data (user uploads)
- Implement AI report generation (user integrates their AI)

### P1
- `/api/spectra-analyze` backend endpoint (when user provides real data pipeline)
- File upload API to accept GeoJSON/CSV neighborhood data
- ESI score formula backend: ESI = f(VIIRS_NTL, LST, LandUse)

### P2
- Multi-city support (global city picker)
- Export ESI report as PDF
- Time-series animation of ESI changes
- Copernicus land-use layer toggle (separate from ESI heatmap)
