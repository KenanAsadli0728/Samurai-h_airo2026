from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import hashlib
import math
from datetime import datetime, timedelta

app = FastAPI(title="Günbəzgöz API", version="1.0.0")

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


class ComplianceNoticeRequest(BaseModel):
    violation_id: str
    name: str
    neighborhood: str
    city: str
    violation_type: str  # "unpermitted" | "oversized" | "compliant"
    built_area_sqm: float
    permitted_area_sqm: float
    confidence: float
    first_detected: str
    lat: float
    lng: float

    @validator("violation_type")
    def validate_violation_type(cls, v):
        if v not in ("unpermitted", "oversized", "compliant"):
            raise ValueError("violation_type must be unpermitted, oversized, or compliant")
        return v


class EnergyReportNeighborhood(BaseModel):
    id: str
    name: str
    esi_score: float
    stress_type: str  # "thermal" | "lighting" | "mixed"
    lst_celsius: float
    viirs_ntl: float
    population_density: float
    metering_coverage_pct: float
    grid_blind_spot_score: float
    urban_risk_score: float

    @validator("stress_type")
    def validate_stress_type(cls, v):
        if v not in ("thermal", "lighting", "mixed"):
            raise ValueError("stress_type must be thermal, lighting, or mixed")
        return v


class EnergyReportRequest(BaseModel):
    city: str
    neighborhoods: List[EnergyReportNeighborhood]

    @validator("neighborhoods")
    def non_empty(cls, v):
        if not v:
            raise ValueError("neighborhoods must not be empty")
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


# ─── Construction Compliance ────────────────────────────────────────────────────
# Notice text is template-generated from the structured violation record
# (satellite change-detection output × permit-registry mismatch). This is the
# LLM plug-in point: swap the f-string templates below for a prompted call to
# an LLM provider for free-form drafting once an API key is configured —
# the structured fields (excess area, deadline, reference number) are already
# computed here either way.

VIOLATION_LABELS = {
    "unpermitted": ("Unpermitted Construction", "İcazəsiz Tikinti"),
    "oversized": ("Footprint Exceeds Permit", "İcazə Sahəsindən Artıq Tikinti"),
    "compliant": ("No Violation Detected", "Pozuntu Aşkar Edilmədi"),
}


def generate_compliance_notice(req: ComplianceNoticeRequest) -> Dict:
    ref_hash = hashlib.sha1(f"{req.violation_id}-{req.first_detected}".encode()).hexdigest()[:8].upper()
    reference_number = f"GG-{datetime.utcnow().year}-{ref_hash}"
    issued_at = datetime.utcnow()
    deadline = issued_at + timedelta(days=30)
    excess_sqm = max(0.0, req.built_area_sqm - req.permitted_area_sqm)
    excess_pct = round((excess_sqm / req.permitted_area_sqm) * 100, 1) if req.permitted_area_sqm > 0 else None
    label_en, label_az = VIOLATION_LABELS[req.violation_type]

    if req.permitted_area_sqm <= 0:
        excess_line_en = f"No permit on file — entire {req.built_area_sqm:.0f} m² footprint is unpermitted."
        excess_line_az = f"Qeydiyyatda icazə yoxdur — bütün {req.built_area_sqm:.0f} m² sahə icazəsizdir."
    elif excess_sqm > 0:
        excess_line_en = f"Excess footprint: {excess_sqm:.0f} m² ({excess_pct}% over permit)"
        excess_line_az = f"Artıq sahə: {excess_sqm:.0f} m² (icazədən {excess_pct}% çox)"
    else:
        excess_line_en = "No excess footprint recorded."
        excess_line_az = "Artıq sahə qeydə alınmayıb."

    letter_en = f"""NOTICE OF SATELLITE-DETECTED CONSTRUCTION COMPLIANCE REVIEW
Reference: {reference_number}
Issued: {issued_at.strftime('%Y-%m-%d')}
Jurisdiction: {req.city}

Subject: {label_en} — {req.name} ({req.neighborhood})

This notice is issued by Günbəzgöz Urban Compliance Monitoring on the basis of
satellite change detection cross-referenced against the municipal permit
registry.

Finding: {label_en}
Location: {req.lat:.5f}, {req.lng:.5f}
First detected: {req.first_detected}
Detection confidence: {round(req.confidence * 100, 1)}%
Built footprint (observed): {req.built_area_sqm:.0f} m²
Permitted footprint (registry): {req.permitted_area_sqm:.0f} m²
{excess_line_en}

Required action: The property owner or responsible agent must submit either
(a) valid permit documentation matching the observed footprint, or (b) a
remediation plan to bring the structure into compliance, no later than
{deadline.strftime('%Y-%m-%d')}.

Failure to respond by this date may result in referral for formal
zoning enforcement review.

— Günbəzgöz Urban Compliance Monitoring
This notice was generated from satellite-derived data and is subject to
field verification before formal enforcement action.
"""

    letter_az = f"""PEYK MƏLUMATLARI ƏSASINDA TİKİNTİ UYĞUNLUĞU BİLDİRİŞİ
Nömrə: {reference_number}
Tarix: {issued_at.strftime('%Y-%m-%d')}
Yurisdiksiya: {req.city}

Mövzu: {label_az} — {req.name} ({req.neighborhood})

Bu bildiriş Günbəzgöz Şəhər Uyğunluğu Monitoringi tərəfindən peyk dəyişiklik
aşkarlanması və bələdiyyə icazə reyestri ilə qarşılaşdırma əsasında verilmişdir.

Nəticə: {label_az}
Yer: {req.lat:.5f}, {req.lng:.5f}
İlk aşkarlanma: {req.first_detected}
Aşkarlanma etibarlılığı: {round(req.confidence * 100, 1)}%
Tikilmiş sahə (müşahidə): {req.built_area_sqm:.0f} m²
İcazə verilmiş sahə (reyestr): {req.permitted_area_sqm:.0f} m²
{excess_line_az}

Tələb olunan tədbir: Mülk sahibi və ya nümayəndəsi {deadline.strftime('%Y-%m-%d')}
tarixinədək (a) müşahidə olunan sahəyə uyğun etibarlı icazə sənədlərini, və ya
(b) uyğunluğun bərpası planını təqdim etməlidir.

Bu tarixədək cavab verilmədiyi halda, məsələ rəsmi zonalaşdırma icra
araşdırmasına yönəldilə bilər.

— Günbəzgöz Şəhər Uyğunluğu Monitoringi
Bu bildiriş peyk məlumatları əsasında yaradılmışdır və rəsmi icra
tədbirindən əvvəl yerində yoxlama tələb edir.
"""

    return {
        "reference_number": reference_number,
        "issued_at": issued_at.isoformat() + "Z",
        "deadline": deadline.isoformat() + "Z",
        "letter_en": letter_en.strip(),
        "letter_az": letter_az.strip(),
    }


# ─── AI Intervention Report ─────────────────────────────────────────────────────
# Template-generated from the structured ESI/blind-spot/urban-risk fields already
# computed client-side. Same LLM plug-in point as the compliance notice above:
# swap the recommendation lookup + f-string for a prompted call once a provider
# key is configured — the structured ranking/priority logic stays the same either way.

THERMAL_INTERVENTIONS = [
    "Building envelope insulation retrofit (walls + roof)",
    "Cool-roof / high-albedo coating to cut peak surface temperature",
    "Window thermal-break / double-glazing upgrade",
]
LIGHTING_INTERVENTIONS = [
    "LED retrofit with occupancy/daylight sensors",
    "Smart-meter rollout to enable demand-response programs",
    "Public lighting curfew dimming (post-midnight)",
]


def priority_label(esi_score: float) -> str:
    if esi_score >= 85:
        return "CRITICAL"
    if esi_score >= 70:
        return "HIGH"
    if esi_score >= 50:
        return "MEDIUM"
    return "LOW"


def interventions_for(stress_type: str) -> List[str]:
    if stress_type == "thermal":
        return THERMAL_INTERVENTIONS[:3]
    if stress_type == "lighting":
        return LIGHTING_INTERVENTIONS[:3]
    return [THERMAL_INTERVENTIONS[0], THERMAL_INTERVENTIONS[1], LIGHTING_INTERVENTIONS[0], LIGHTING_INTERVENTIONS[1]]


def generate_energy_report(req: EnergyReportRequest) -> Dict:
    report_id = f"AIR-{datetime.utcnow().year}-{hashlib.sha1(req.city.encode()).hexdigest()[:6].upper()}"
    generated_at = datetime.utcnow()
    hoods = sorted(req.neighborhoods, key=lambda n: n.esi_score, reverse=True)
    top = hoods[:5]

    total = len(hoods)
    avg_esi = round(sum(n.esi_score for n in hoods) / total, 1)
    avg_urban_risk = round(sum(n.urban_risk_score for n in hoods) / total, 1)
    high_stress = sum(1 for n in hoods if n.esi_score >= 75)
    blind_spots = sum(1 for n in hoods if n.grid_blind_spot_score >= 40)

    summary = (
        f"{total} zones analyzed in {req.city}. Average ESI {avg_esi}/100, "
        f"average Urban Risk Score {avg_urban_risk}/100. {high_stress} zones at high "
        f"energy stress (ESI ≥ 75); {blind_spots} flagged as grid security blind spots."
    )

    sections = []
    for n in top:
        priority = priority_label(n.esi_score)
        impact_pct = min(38, round(n.esi_score * 0.35 + 5))
        actions = interventions_for(n.stress_type)
        action_lines = "\n".join(f"  - {a}" for a in actions)
        sections.append(
            f"[{priority}] {n.name}\n"
            f"  ESI: {n.esi_score}/100  ·  Stress type: {n.stress_type}  ·  Urban Risk: {n.urban_risk_score}/100\n"
            f"  LST: {n.lst_celsius}°C  ·  NTL: {n.viirs_ntl} nW/cm²/sr  ·  Metering coverage: {n.metering_coverage_pct}%\n"
            f"  Recommended interventions:\n{action_lines}\n"
            f"  Estimated stress reduction if implemented: ~{impact_pct}%"
        )

    report_text = (
        f"AI-GENERATED ENERGY INTERVENTION REPORT\n"
        f"Reference: {report_id}\n"
        f"Generated: {generated_at.strftime('%Y-%m-%d %H:%M UTC')}\n"
        f"Jurisdiction: {req.city}\n\n"
        f"EXECUTIVE SUMMARY\n{summary}\n\n"
        f"PRIORITIZED ZONES (top {len(top)} by ESI score)\n\n"
        + "\n\n".join(sections)
        + "\n\nNOTE: Recommendations are template-generated from satellite-derived ESI, "
        "thermal, and night-light signals. Subject to site survey before capital allocation."
    )

    return {
        "report_id": report_id,
        "generated_at": generated_at.isoformat() + "Z",
        "city": req.city,
        "summary": summary,
        "report_text": report_text,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Günbəzgöz", "version": "1.0.0"}


@app.post("/api/construction/generate-notice")
def construction_generate_notice(req: ComplianceNoticeRequest):
    if req.violation_type == "compliant":
        raise HTTPException(400, "Cannot generate a compliance notice for a compliant property")
    return generate_compliance_notice(req)


@app.post("/api/energy/generate-report")
def energy_generate_report(req: EnergyReportRequest):
    return generate_energy_report(req)


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
