"""
demo_data.py
=============
DEMO REJİMİ — NASA token olmadan sistemi sınamaq üçün.

QEYD: Bu modul HƏQİQİ peyk datası DEYİL. NASA Black Marble (VNP46A2) real
datasının statistik xüsusiyyətlərini (gündəlik radiance səviyyəsi, bulud
səbəbli boşluqlar, sənaye/şəhər/kənd radiance diapazonları EOG-nin nəşr etdiyi
dəyərlərə əsaslanır) təqlid edən sintetik vaxt sıraları yaradır ki,
pipeline-ı dərhal test edə biləsiniz.

REAL DATA ilə işləmək üçün data_loader.py-dakı funksiyaları NASA Earthdata
tokeni ilə işlədin (bax: README.md). Bu fayl yalnız boru kəmərinin (pipeline)
düzgün işlədiyini göstərmək məqsədi daşıyır.

Radiance diapazonları EOG (Earth Observation Group, Colorado School of Mines)
nəşr etdiyi tipik dəyərlərə əsaslanır:
    - Kənd/işıqsız ərazi:        0.1 - 0.5  nW/cm²/sr
    - Yaşayış zonası:            1 - 8      nW/cm²/sr
    - Yüngül sənaye/ticarət:     5 - 20     nW/cm²/sr
    - Ağır sənaye (24/7 iş):     15 - 60    nW/cm²/sr
    - Qaz alovlanması (flaring): 30 - 200+  nW/cm²/sr
"""

import numpy as np
import pandas as pd
from data_loader import IndustrialSite


def generate_demo_sites() -> list:
    """Nümunə sənaye zonaları (Azərbaycan və qonşu regiondan real koordinatlar)."""
    return [
        IndustrialSite("Sumqayıt Sənaye Qovşağı", 40.5892, 49.6685, 2.0, "metallurgiya/kimya"),
        IndustrialSite("Bakı Neft Emalı Zonası (Heydər Əliyev NEZ)", 40.4231, 49.8763, 2.5, "neft-kimya"),
        IndustrialSite("Qaradağ Sement Zavodu", 40.2939, 49.4717, 1.5, "sement"),
        IndustrialSite("Mingəçevir Sənaye Zonası", 40.7700, 47.0500, 1.5, "energetika/maşınqayırma"),
        IndustrialSite("Balaxanı-Sabunçu Neft Mədənləri", 40.4756, 49.9528, 2.0, "neft-qaz"),
        IndustrialSite("Gəncə Sənaye Parkı", 40.6828, 46.3606, 1.5, "yüngül sənaye"),
    ]


def _seasonal_and_weekly_pattern(n_days: int, base: float, weekday_drop: float = 0.0) -> np.ndarray:
    t = np.arange(n_days)
    weekly = 1.0 - weekday_drop * (((t % 7) >= 5).astype(float))  # həftə sonu enerji düşür (əgər iş rejimi belədirsə)
    seasonal = 1.0 + 0.06 * np.sin(2 * np.pi * t / 365.0 - np.pi / 2)  # qışda az da olsa artım (işıqlanma)
    return base * weekly * seasonal


def generate_demo_timeseries(
    sites: list,
    start_date: str = "2024-01-01",
    n_days: int = 365,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Hər sənaye zonası üçün gündəlik radiance vaxt sırası yaradır.
    Real VIIRS datasında olduğu kimi: bulud səbəbli NaN boşluqlar,
    sensor gurultusu (noise), tədricən trend (məs. zavodun genişlənməsi)
    və anomal "sıçrayışlar" (məs. yeni xətt işə düşməsi) daxil edilir.
    """
    rng = np.random.default_rng(seed)
    dates = pd.date_range(start_date, periods=n_days, freq="D")
    rows = []

    # Hər zona üçün sektora görə tipik baza radiance + davranış profili təyin edirik
    sector_profile = {
        "metallurgiya/kimya":          dict(base=38, noise=4.0, weekday_drop=0.05, trend=0.010, flare=False),
        "neft-kimya":                  dict(base=55, noise=6.0, weekday_drop=0.02, trend=0.004, flare=True),
        "sement":                      dict(base=22, noise=3.0, weekday_drop=0.15, trend=-0.005, flare=False),
        "energetika/maşınqayırma":     dict(base=30, noise=3.5, weekday_drop=0.10, trend=0.002, flare=False),
        "neft-qaz":                    dict(base=48, noise=5.0, weekday_drop=0.03, trend=0.001, flare=True),
        "yüngül sənaye":               dict(base=14, noise=2.0, weekday_drop=0.30, trend=0.020, flare=False),
    }

    for site in sites:
        prof = sector_profile.get(site.sector, dict(base=10, noise=2, weekday_drop=0.1, trend=0.0, flare=False))
        base_series = _seasonal_and_weekly_pattern(n_days, prof["base"], prof["weekday_drop"])

        # Uzunmüddətli trend (zavod genişlənir/daralır)
        trend = prof["trend"] * np.arange(n_days)

        # Sensor + atmosfer gurultusu
        noise = rng.normal(0, prof["noise"], n_days)

        # Qaz alovlanması olan obyektlərdə ara-sıra kəskin pik (flaring event)
        flare_spikes = np.zeros(n_days)
        if prof["flare"]:
            flare_days = rng.choice(n_days, size=int(n_days * 0.04), replace=False)
            flare_spikes[flare_days] = rng.uniform(20, 80, size=len(flare_days))

        # Anomal "gizli istehsal artımı" hadisəsi - son 60 gündə bir zonada qəsdən sıçrayış
        radiance = base_series + trend + noise + flare_spikes
        radiance = np.clip(radiance, 0.2, None)

        # Bulud örtüyü səbəbindən təsadüfi məlumat boşluqları (~18% gün, real VIIRS-ə uyğun)
        cloud_mask = rng.random(n_days) < 0.18
        radiance_with_gaps = radiance.copy()
        radiance_with_gaps[cloud_mask] = np.nan

        for d, val, raw in zip(dates, radiance_with_gaps, radiance):
            rows.append({
                "site_name": site.name,
                "sector": site.sector,
                "lat": site.lat,
                "lon": site.lon,
                "date": d,
                "radiance_nW_cm2_sr": val,
                "cloud_free": not np.isnan(val),
            })

    df = pd.DataFrame(rows)
    return df


# Bilərəkdən bir zonaya "gizli istehsal artımı" inject edirik ki,
# anomaliya-aşkarlama modeli bunu tapa bilsin (demo məqsədilə)
def inject_hidden_ramp_up(df: pd.DataFrame, site_name: str, start_day_idx: int = 280, growth: float = 0.4) -> pd.DataFrame:
    df = df.copy()
    mask = df["site_name"] == site_name
    site_dates = df.loc[mask, "date"].sort_values().unique()
    ramp_start_date = site_dates[start_day_idx]
    ramp_mask = mask & (df["date"] >= ramp_start_date)
    n = ramp_mask.sum()
    ramp = np.linspace(0, growth, n)
    df.loc[ramp_mask, "radiance_nW_cm2_sr"] = df.loc[ramp_mask, "radiance_nW_cm2_sr"] * (1 + ramp)
    return df
