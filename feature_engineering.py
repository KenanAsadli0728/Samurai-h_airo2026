"""
feature_engineering.py
========================
Xam radiance vaxt sırasından hər sənaye zonası üçün "Enerji İmzası"
(Energy Signature) çıxarır. Bu, ML modellərinin girişi olacaq vektor cəbridir.

Çıxarılan xüsusiyyətlər (features):
    mean_radiance         - orta radiance səviyyəsi (zonanın "böyüklüyü")
    std_radiance          - dəyişkənlik (sabit iş rejimi vs. nizamsız iş)
    weekday_weekend_ratio - "acgözlük" göstəricisi: 24/7 işləyən ağır sənaye
                              həftə sonu da işıqlı qalır (nisbət ~1.0),
                              adi ofis/yüngül sənaye həftə sonu sönür (nisbət < 1.0)
    trend_slope            - zaman üzrə xətti artım/azalma sürəti (genişlənmə siqnalı)
    cv (coeff. of variation) - std/mean, normallaşdırılmış nizamsızlıq
    peak_to_median_ratio    - kəskin pik hadisələrinin (məs. flaring) gücü
    autocorr_lag1           - ardıcıl günlər arası korrelyasiya (sabitlik)
    missing_data_ratio       - bulud örtüyü səbəbiylə neçə faiz data yoxdur
"""

import numpy as np
import pandas as pd
from scipy import stats


def _trend_slope(series: pd.Series) -> float:
    y = series.values
    x = np.arange(len(y))
    valid = ~np.isnan(y)
    if valid.sum() < 10:
        return 0.0
    slope, _, _, _, _ = stats.linregress(x[valid], y[valid])
    return float(slope)


def _autocorr_lag1(series: pd.Series) -> float:
    y = series.dropna().values
    if len(y) < 10:
        return 0.0
    return float(np.corrcoef(y[:-1], y[1:])[0, 1])


def build_energy_signatures(df: pd.DataFrame) -> pd.DataFrame:
    """
    df: 'site_name', 'date', 'radiance_nW_cm2_sr' sütunlarını ehtiva edən uzun-format DataFrame.
    Qaytarır: hər sənaye zonası üçün bir sətir olan feature matrisi.
    """
    records = []
    for site, g in df.groupby("site_name"):
        g = g.sort_values("date").copy()
        g["weekday"] = g["date"].dt.dayofweek
        r = g["radiance_nW_cm2_sr"]

        mean_r = r.mean()
        std_r = r.std()
        cv = std_r / mean_r if mean_r > 0 else 0.0

        weekday_mean = g.loc[g["weekday"] < 5, "radiance_nW_cm2_sr"].mean()
        weekend_mean = g.loc[g["weekday"] >= 5, "radiance_nW_cm2_sr"].mean()
        ww_ratio = weekend_mean / weekday_mean if weekday_mean and not np.isnan(weekday_mean) else np.nan

        peak = r.quantile(0.98)
        median = r.median()
        peak_to_median = peak / median if median > 0 else np.nan

        record = {
            "site_name": site,
            "sector": g["sector"].iloc[0] if "sector" in g.columns else "unknown",
            "lat": g["lat"].iloc[0] if "lat" in g.columns else np.nan,
            "lon": g["lon"].iloc[0] if "lon" in g.columns else np.nan,
            "mean_radiance": mean_r,
            "std_radiance": std_r,
            "cv": cv,
            "weekday_weekend_ratio": ww_ratio,
            "trend_slope": _trend_slope(r),
            "peak_to_median_ratio": peak_to_median,
            "autocorr_lag1": _autocorr_lag1(r),
            "missing_data_ratio": r.isna().mean(),
            "n_observations": r.notna().sum(),
        }
        records.append(record)

    feats = pd.DataFrame(records).set_index("site_name")
    return feats
