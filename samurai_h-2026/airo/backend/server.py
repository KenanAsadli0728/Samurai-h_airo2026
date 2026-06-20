from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import math
from datetime import datetime

app = FastAPI(title="Geo-Energy Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request / Response Models ─────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    min_lat: float
    min_lng: float
    max_lat: float
    max_lng: float
    energy_type: str  # "solar" | "wind" | "both"

    @validator("energy_type")
    def validate_energy_type(cls, v):
        if v not in ["solar", "wind", "both"]:
            raise ValueError("energy_type must be solar, wind, or both")
        return v

    @validator("max_lat")
    def lat_range(cls, v, values):
        if "min_lat" in values and v <= values["min_lat"]:
            raise ValueError("max_lat must be greater than min_lat")
        return v

    @validator("max_lng")
    def lng_range(cls, v, values):
        if "min_lng" in values and v <= values["min_lng"]:
            raise ValueError("max_lng must be greater than min_lng")
        return v


# ─── Geographic Utilities ──────────────────────────────────────────────────────

def haversine_area_km2(min_lat, min_lng, max_lat, max_lng) -> float:
    """Return approximate area of the bounding box in km²."""
    R = 6371.0
    lat_diff = math.radians(abs(max_lat - min_lat))
    lng_diff = math.radians(abs(max_lng - min_lng))
    mid_lat = math.radians((min_lat + max_lat) / 2)
    height_km = R * lat_diff
    width_km = R * lng_diff * math.cos(mid_lat)
    return height_km * width_km


def ndvi_proxy(lat: float, lng: float) -> float:
    """
    Simulate NDVI (Normalized Difference Vegetation Index) 0–1.
    >0.5 = dense vegetation (protected / excluded zone).
    Based on latitude/longitude biome patterns.
    """
    if abs(lat) < 12:                          # Tropical forest belt
        return 0.62 + 0.15 * abs(math.sin(lng * 0.08))
    if 25 < abs(lat) < 42:                     # Semi-arid / steppe
        return 0.22 + 0.18 * abs(math.cos(lat * 0.28))
    if abs(lat) > 57:                          # Boreal / tundra
        return 0.42 + 0.15 * abs(math.sin(lat * 0.12))
    return 0.33 + 0.20 * abs(math.sin(lat * 0.21 + lng * 0.09))


def terrain_slope_factor(lat: float, lng: float) -> float:
    """
    Return terrain slope suitability 0–1 (1 = flat, 0 = steep).
    Mountain proxy based on known orographic bands.
    """
    mountain_zones = [
        (28, 50, 28, 55),    # Caucasus / Zagros / Elburz
        (60, 80, 25, 50),    # Himalayas / Hindu Kush
        (-80, -60, -55, 10), # Andes
        (-130, -105, 25, 60),# Rockies / Sierra Nevada
        (5, 38, 32, 45),     # Alps / Carpathians
    ]
    for lng_lo, lng_hi, lat_lo, lat_hi in mountain_zones:
        if lng_lo < lng < lng_hi and lat_lo < abs(lat) < lat_hi:
            return max(0.30, 0.72 - 0.10 * abs(math.sin(lat * 0.50)))
    return 0.86


def estimate_grid_distance(lat: float, lng: float) -> float:
    """Estimate distance to nearest electricity grid (km)."""
    urban_proxy = abs(math.sin(lat * 0.48) * math.cos(lng * 0.31))
    return round(max(0.5, 55.0 * (1.0 - urban_proxy)), 1)


def estimate_road_distance(lat: float, lng: float) -> float:
    """Estimate distance to nearest road (km)."""
    urban_proxy = abs(math.sin(lat * 0.48) * math.cos(lng * 0.31))
    return round(max(0.1, 22.0 * (1.0 - min(1.0, urban_proxy * 1.25))), 1)


# ─── Analysis Engines ──────────────────────────────────────────────────────────

def solar_analysis(min_lat, min_lng, max_lat, max_lng) -> Dict[str, Any]:
    """Solar PV potential via simplified clear-sky GHI model + NDVI exclusion."""
    clat = (min_lat + max_lat) / 2
    clng = (min_lng + max_lng) / 2

    area_km2 = haversine_area_km2(min_lat, min_lng, max_lat, max_lng)
    area_ha = area_km2 * 100.0

    # ── GHI (Global Horizontal Irradiance) ──────────────────────────
    lat_rad = math.radians(clat)
    base_ghi = 4.0 + 3.5 * math.cos(lat_rad)            # 4.0–7.5 kWh/m²/day
    altitude_bonus = 0.20 * terrain_slope_factor(clat, clng)
    avg_ghi = round(min(7.5, base_ghi + altitude_bonus), 2)

    # ── Exclusion zones (NDVI > 0.40) ──────────────────────────────
    ndvi = ndvi_proxy(clat, clng)
    veg_excl = round(max(0.0, (ndvi - 0.30) * 0.85), 3)

    # ── Terrain slope ───────────────────────────────────────────────
    slope = terrain_slope_factor(clat, clng)
    terrain_excl = 1.0 - slope

    # ── Net suitability ─────────────────────────────────────────────
    suitable_frac = round(min(0.94, max(0.18, 1.0 - veg_excl - terrain_excl * 0.38)), 3)
    suitable_ha = area_ha * suitable_frac
    suitable_m2 = suitable_ha * 10_000.0

    # ── Energy (IEC 61724 simplified) ───────────────────────────────
    panel_eff = 0.21           # Monocrystalline Si
    perf_ratio = 0.78          # Wiring / thermal / shading losses
    annual_kwh_m2 = avg_ghi * 365 * panel_eff * perf_ratio
    annual_mwh = round((suitable_m2 * annual_kwh_m2) / 1_000_000, 0)

    # Peak DC capacity (1 MWp ≈ 1.2 ha, module density 200 W/m²)
    peak_mw = round(suitable_ha / 1.2, 1)
    cap_factor = round(avg_ghi / 24.0, 3)
    co2_offset_kt = round(annual_mwh * 0.42 / 1_000.0, 2)   # kt CO₂/year

    return {
        "type": "solar",
        "avg_ghi_kwh_m2_day": avg_ghi,
        "optimal_tilt_degrees": round(abs(clat) + 8.0, 1),
        "ndvi_index": round(ndvi, 3),
        "vegetation_exclusion_pct": round(veg_excl * 100, 1),
        "terrain_suitability_pct": round(slope * 100, 1),
        "suitable_area_ha": round(suitable_ha, 1),
        "panel_efficiency_pct": round(panel_eff * 100, 1),
        "annual_energy_mwh": int(annual_mwh),
        "peak_capacity_mw": peak_mw,
        "capacity_factor": cap_factor,
        "co2_offset_kt_yr": co2_offset_kt,
    }


def wind_analysis(min_lat, min_lng, max_lat, max_lng) -> Dict[str, Any]:
    """Wind turbine potential via latitude-band climatology + power density."""
    clat = (min_lat + max_lat) / 2
    clng = (min_lng + max_lng) / 2

    area_km2 = haversine_area_km2(min_lat, min_lng, max_lat, max_lng)
    area_ha = area_km2 * 100.0

    # ── Wind speed model (Weibull mean proxy) ───────────────────────
    lat_abs = abs(clat)
    if lat_abs < 10:                              # Doldrums
        base_ws = 4.5
    elif lat_abs < 30:                            # Trade winds
        base_ws = 6.0 + 1.2 * math.sin(math.radians(lat_abs * 3))
    elif lat_abs < 60:                            # Westerlies (windiest)
        base_ws = 7.2 + 2.8 * math.sin(math.radians((lat_abs - 30) * 3))
    else:                                         # Polar
        base_ws = 6.8 - 0.04 * (lat_abs - 60)

    coastal_bonus = 0.6 * abs(math.sin(clng * 0.02))
    avg_ws = round(min(13.0, base_ws + coastal_bonus), 1)

    # ── Power density  P/A = ½ρv³ ───────────────────────────────────
    rho = 1.225   # kg/m³
    power_density = round(0.5 * rho * avg_ws ** 3, 0)

    # ── Turbine layout (5× rotor spacing, 4 MW / 120 m turbine) ────
    rotor_d = 120.0
    spacing = 5.0 * rotor_d
    ha_per_turbine = (spacing ** 2) / 10_000.0
    num_turbines = max(1, int(area_ha / ha_per_turbine * 0.25))  # 25% site use
    turbine_mw = 4.0
    total_mw = round(num_turbines * turbine_mw, 1)

    # ── Capacity factor ─────────────────────────────────────────────
    cf = round(min(0.48, max(0.14, (avg_ws / 15.0) * 0.48)), 3)
    annual_mwh = round(total_mw * cf * 8760, 0)
    co2_offset_kt = round(annual_mwh * 0.42 / 1_000.0, 2)

    return {
        "type": "wind",
        "avg_wind_speed_ms": avg_ws,
        "wind_power_density_w_m2": int(power_density),
        "air_density_kg_m3": rho,
        "num_turbines": num_turbines,
        "turbine_capacity_mw": turbine_mw,
        "total_capacity_mw": total_mw,
        "capacity_factor": cf,
        "annual_energy_mwh": int(annual_mwh),
        "co2_offset_kt_yr": co2_offset_kt,
    }


def infrastructure_score(min_lat, min_lng, max_lat, max_lng) -> Dict[str, Any]:
    clat = (min_lat + max_lat) / 2
    clng = (min_lng + max_lng) / 2

    grid_km = estimate_grid_distance(clat, clng)
    road_km = estimate_road_distance(clat, clng)
    area_km2 = haversine_area_km2(min_lat, min_lng, max_lat, max_lng)

    grid_score = round(max(0, 100 - grid_km * 1.6), 1)
    road_score = round(max(0, 100 - road_km * 3.2), 1)
    area_score = round(min(100, area_km2 * 0.6), 1)

    feasibility = int(0.40 * grid_score + 0.30 * road_score + 0.30 * area_score)
    feasibility = min(95, max(18, feasibility))

    return {
        "grid_distance_km": grid_km,
        "road_distance_km": road_km,
        "grid_connection_cost_m_usd": round(grid_km * 0.85, 2),
        "grid_score": grid_score,
        "road_score": road_score,
        "feasibility_score": feasibility,
    }


def land_cover(min_lat, min_lng, max_lat, max_lng) -> Dict[str, Any]:
    clat = (min_lat + max_lat) / 2
    clng = (min_lng + max_lng) / 2

    ndvi = ndvi_proxy(clat, clng)
    slope = terrain_slope_factor(clat, clng)

    forest = max(0.0, min(55.0, ndvi * 75 - 8))
    urban = max(0.0, min(28.0, 18 * abs(math.sin(clat * 0.30))))
    water = max(0.0, min(14.0, 9 * abs(math.cos(clng * 0.11))))
    barren = max(0.0, min(58.0, (1 - ndvi) * 58))
    agri = max(0.0, 100 - forest - urban - water - barren)

    total = forest + urban + water + barren + agri or 1
    return {
        "forest_pct": round(forest / total * 100, 1),
        "urban_pct": round(urban / total * 100, 1),
        "water_pct": round(water / total * 100, 1),
        "barren_pct": round(barren / total * 100, 1),
        "agricultural_pct": round(agri / total * 100, 1),
    }


def heatmap_geojson(min_lat, min_lng, max_lat, max_lng, energy_type: str) -> Dict:
    """
    Adaptive-resolution grid of colored cells for the map overlay.
    Score range 0–1 maps to color bins (high / medium / low).
    """
    area = haversine_area_km2(min_lat, min_lng, max_lat, max_lng)
    res = 15 if area < 100 else 12 if area < 1_000 else 10 if area < 10_000 else 8

    lat_step = (max_lat - min_lat) / res
    lng_step = (max_lng - min_lng) / res
    features = []

    for i in range(res):
        for j in range(res):
            clat = min_lat + (i + 0.5) * lat_step
            clng = min_lng + (j + 0.5) * lng_step

            if energy_type in ("solar", "both"):
                ndvi = ndvi_proxy(clat, clng)
                slope = terrain_slope_factor(clat, clng)
                ghi_norm = (4.0 + 3.5 * math.cos(math.radians(clat))) / 7.5
                solar_score = ghi_norm * slope * max(0.2, 1 - max(0, ndvi - 0.3))
                score = solar_score
            else:
                lat_abs = abs(clat)
                ws = 6.0 + 2.0 * math.sin(math.radians(lat_abs * 3)) if lat_abs < 60 else 5.5
                score = ws / 12.0

            # Add micro-variation for natural look
            score = max(0.05, min(1.0, score + 0.04 * math.sin(clat * 7 + clng * 5)))

            features.append({
                "type": "Feature",
                "properties": {
                    "score": round(score, 3),
                    "category": "high" if score > 0.68 else "medium" if score > 0.38 else "low",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [min_lng + j * lng_step,       min_lat + i * lat_step],
                        [min_lng + (j+1) * lng_step,   min_lat + i * lat_step],
                        [min_lng + (j+1) * lng_step,   min_lat + (i+1) * lat_step],
                        [min_lng + j * lng_step,       min_lat + (i+1) * lat_step],
                        [min_lng + j * lng_step,       min_lat + i * lat_step],
                    ]],
                },
            })

    return {"type": "FeatureCollection", "features": features}


def risk_factors(min_lat, min_lng, max_lat, max_lng, infra: Dict) -> List[Dict]:
    clat = (min_lat + max_lat) / 2
    clng = (min_lng + max_lng) / 2
    ndvi = ndvi_proxy(clat, clng)
    slope = terrain_slope_factor(clat, clng)

    def risk(val, lo, hi):
        return "low" if val < lo else "medium" if val < hi else "high"

    return [
        {
            "factor": "Grid Connection",
            "value": f"{infra['grid_distance_km']} km",
            "risk": risk(infra["grid_distance_km"], 10, 30),
            "description": "Distance to nearest HV electricity grid / substation",
        },
        {
            "factor": "Vegetation (NDVI)",
            "value": f"{ndvi:.2f}",
            "risk": risk(ndvi, 0.30, 0.50),
            "description": "NDVI >0.5 indicates protected green zone; excluded from siting",
        },
        {
            "factor": "Terrain Slope",
            "value": f"≈{100 - int(slope * 100)}° avg",
            "risk": risk(1 - slope, 0.20, 0.45),
            "description": "Slope >15° significantly reduces installation efficiency",
        },
        {
            "factor": "Road Accessibility",
            "value": f"{infra['road_distance_km']} km",
            "risk": risk(infra["road_distance_km"], 5, 15),
            "description": "Distance to nearest road (equipment transport & O&M)",
        },
    ]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Geo-Energy Intelligence", "version": "1.0.0"}


@app.post("/api/analyze-region")
def analyze_region(req: AnalyzeRequest):
    area_km2 = haversine_area_km2(req.min_lat, req.min_lng, req.max_lat, req.max_lng)

    if area_km2 < 0.05:
        raise HTTPException(400, "Selected area too small — minimum 0.05 km²")
    if area_km2 > 800_000:
        raise HTTPException(400, "Selected area too large — maximum 800,000 km²")

    clat = (req.min_lat + req.max_lat) / 2
    clng = (req.min_lng + req.max_lng) / 2
    area_ha = area_km2 * 100.0

    solar  = solar_analysis(req.min_lat, req.min_lng, req.max_lat, req.max_lng)  if req.energy_type in ("solar", "both")  else None
    wind   = wind_analysis(req.min_lat, req.min_lng, req.max_lat, req.max_lng)   if req.energy_type in ("wind", "both")   else None
    infra  = infrastructure_score(req.min_lat, req.min_lng, req.max_lat, req.max_lng)
    lcover = land_cover(req.min_lat, req.min_lng, req.max_lat, req.max_lng)
    risks  = risk_factors(req.min_lat, req.min_lng, req.max_lat, req.max_lng, infra)
    hmap   = heatmap_geojson(req.min_lat, req.min_lng, req.max_lat, req.max_lng, req.energy_type)

    # ── Overall suitability ──────────────────────────────────────────
    primary_cf = (solar or wind or {}).get("capacity_factor", 0.20)
    terrain_pct = (solar or {}).get("terrain_suitability_pct", 70)
    suitability = min(96, max(28,
        infra["feasibility_score"] * 0.38 +
        terrain_pct * 0.32 +
        (primary_cf * 100) * 0.30
    ))

    # ── Primary annual output ────────────────────────────────────────
    if solar and wind:
        annual_mwh = solar["annual_energy_mwh"] + wind["annual_energy_mwh"]
    elif solar:
        annual_mwh = solar["annual_energy_mwh"]
    elif wind:
        annual_mwh = wind["annual_energy_mwh"]
    else:
        annual_mwh = 0

    return {
        "status": "success",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "bbox": {
            "min_lat": req.min_lat, "min_lng": req.min_lng,
            "max_lat": req.max_lat, "max_lng": req.max_lng,
            "center_lat": round(clat, 5), "center_lng": round(clng, 5),
        },
        "summary": {
            "area_km2": round(area_km2, 2),
            "area_ha": round(area_ha, 1),
            "suitability_percentage": round(suitability, 1),
            "annual_energy_mwh": annual_mwh,
            "energy_type": req.energy_type,
            "feasibility_score": infra["feasibility_score"],
        },
        "solar": solar,
        "wind": wind,
        "infrastructure": infra,
        "land_cover": lcover,
        "risk_factors": risks,
        "heatmap_geojson": hmap,
        "data_sources": {
            "irradiance": "Simplified GHI astronomical model (proxy: PVGIS / NASA POWER)",
            "wind": "Latitude-band Weibull mean wind climatology",
            "land_cover": "NDVI biome proxy (proxy: Sentinel-2 / ESA WorldCover)",
            "infrastructure": "Grid-proximity model (proxy: OpenStreetMap Overpass API)",
            "note": "Drop-in replacement with real GEE Sentinel-2, SRTM DEM, and OSM data for production.",
        },
    }
