"""
ml_models.py
=============
Sİ/ML hissəsi: sənaye zonalarını "enerji profilinə" görə klasterləşdirir
(böyüklük + iş rejimi + "acgözlük") və zaman sırasında anomal
dəyişiklikləri (gizli istehsal artımı, dayanma, qəfil sıçrayış) aşkar edir.

İstifadə olunan modellər:
    1. KMeans / Hierarchical Clustering -> zonaları "enerji siniflərinə" bölür
       (məs. "yüngül-müntəzəm", "ağır-24/7", "yüksək-dəyişkən/flaring")
    2. Isolation Forest -> hər zonanın vaxt sırasında nöqtəvi anomaliyaları tapır
    3. CUSUM / dəyişiklik nöqtəsi (change-point) aşkarlanması -> trend qırılmalarını
       (məs. yeni istehsal xəttinin işə düşməsini) tapır
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.ensemble import IsolationForest
from sklearn.metrics import silhouette_score


FEATURE_COLUMNS = [
    "mean_radiance",
    "cv",
    "weekday_weekend_ratio",
    "trend_slope",
    "peak_to_median_ratio",
    "autocorr_lag1",
]


def cluster_energy_profiles(
    features: pd.DataFrame,
    n_clusters: int = 3,
    method: str = "kmeans",
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Sənaye zonalarını enerji profilinə görə klasterləşdirir.
    Qaytarır: orijinal features + 'cluster' sütunu əlavə olunmuş DataFrame.
    """
    X = features[FEATURE_COLUMNS].copy()
    X = X.fillna(X.median())

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    if method == "kmeans":
        model = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
    elif method == "agglomerative":
        model = AgglomerativeClustering(n_clusters=n_clusters)
    else:
        raise ValueError("method 'kmeans' və ya 'agglomerative' olmalıdır")

    labels = model.fit_predict(X_scaled)
    out = features.copy()
    out["cluster"] = labels

    if len(set(labels)) > 1 and len(X_scaled) > n_clusters:
        score = silhouette_score(X_scaled, labels)
        out.attrs["silhouette_score"] = score

    out = _label_clusters_by_intensity(out)
    return out


def _label_clusters_by_intensity(df: pd.DataFrame) -> pd.DataFrame:
    """Klasterlərə orta radiance səviyyəsinə görə oxunaqlı ad verir."""
    cluster_means = df.groupby("cluster")["mean_radiance"].mean().sort_values()
    intensity_names = ["Aşağı intensivlik", "Orta intensivlik", "Yüksək intensivlik (24/7 ağır sənaye)"]
    # əgər klaster sayı 3-dən fərqlidirsə, generic adlar
    if len(cluster_means) != 3:
        intensity_names = [f"Enerji sinfi {i+1}" for i in range(len(cluster_means))]
    rank_to_name = {rank: name for rank, name in zip(cluster_means.index, intensity_names)}
    df["energy_class"] = df["cluster"].map(rank_to_name)
    return df


def detect_point_anomalies(
    df: pd.DataFrame,
    contamination: float = 0.03,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Isolation Forest ilə hər zonanın gündəlik radiance dəyərlərində
    nöqtəvi anomaliyaları (qəfil sıçrayış/düşmə) aşkarlayır.

    df: 'site_name', 'date', 'radiance_nW_cm2_sr' sütunlu uzun-format data
    Qaytarır: 'is_anomaly' (bool) və 'anomaly_score' sütunları əlavə olunmuş data
    """
    results = []
    for site, g in df.groupby("site_name"):
        g = g.sort_values("date").copy()
        sub = g.dropna(subset=["radiance_nW_cm2_sr"]).copy()
        if len(sub) < 20:
            g["is_anomaly"] = False
            g["anomaly_score"] = 0.0
            results.append(g)
            continue

        # Feature: dəyər + 7-günlük hərəkətli ortadan kənarlaşma (yerli kontekst üçün)
        roll_mean = sub["radiance_nW_cm2_sr"].rolling(7, min_periods=3, center=True).mean()
        deviation = (sub["radiance_nW_cm2_sr"] - roll_mean).fillna(0)
        X = np.column_stack([sub["radiance_nW_cm2_sr"].values, deviation.values])

        iso = IsolationForest(contamination=contamination, random_state=random_state)
        pred = iso.fit_predict(X)          # -1 = anomaliya, 1 = normal
        score = iso.decision_function(X)   # aşağı = daha anomal

        sub["is_anomaly"] = pred == -1
        sub["anomaly_score"] = -score      # yüksək = daha şübhəli, oxunaqlı olsun deyə işarəni çeviririk

        g = g.merge(
            sub[["date", "is_anomaly", "anomaly_score"]],
            on="date", how="left"
        )
        g["is_anomaly"] = g["is_anomaly"].fillna(False)
        g["anomaly_score"] = g["anomaly_score"].fillna(0.0)
        results.append(g)

    return pd.concat(results, ignore_index=True)


def detect_change_points(series: pd.Series, window: int = 30, z_thresh: float = 3.0) -> list:
    """
    Sadə CUSUM-bənzəri dəyişiklik-nöqtəsi aşkarlanması: zonanın "baza rejimi"
    qəfil dəyişdiyi günləri tapır (məs. yeni xəttin işə salınması, dayandırılma).

    Qaytarır: dəyişiklik nöqtəsi kimi qəbul edilən indekslərin siyahısı.
    """
    y = series.values
    n = len(y)
    change_points = []
    if n < 2 * window:
        return change_points

    for i in range(window, n - window):
        before = y[i - window:i]
        after = y[i:i + window]
        before = before[~np.isnan(before)]
        after = after[~np.isnan(after)]
        if len(before) < window // 2 or len(after) < window // 2:
            continue
        pooled_std = np.std(np.concatenate([before, after])) + 1e-6
        z = abs(np.mean(after) - np.mean(before)) / pooled_std
        if z > z_thresh:
            change_points.append(i)

    # ardıcıl indeksləri qruplaşdırıb hər qrupun ortasını saxlayırıq
    merged = []
    for cp in change_points:
        if merged and cp - merged[-1][-1] <= window:
            merged[-1].append(cp)
        else:
            merged.append([cp])
    return [int(np.mean(group)) for group in merged]
