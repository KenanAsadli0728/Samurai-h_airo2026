"""
run_pipeline.py
=================
Əsas icra skripti. İki rejimdə işləyir:

    python run_pipeline.py --mode demo     # sintetik data ilə (token lazım deyil)
    python run_pipeline.py --mode real     # real NASA VIIRS data ilə (NASA_EARTHDATA_TOKEN lazımdır)

Çıxış:
    - outputs/energy_signatures.csv   (hər zona üçün çıxarılmış xüsusiyyətlər)
    - outputs/clusters.csv            (klasterləmə nəticələri)
    - outputs/anomalies.csv           (gündəlik anomaliya bayraqları)
    - outputs/report.txt              (oxunaqlı xülasə hesabat)
    - outputs/*.png                   (vizuallaşdırmalar)
"""

import os
import argparse
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from feature_engineering import build_energy_signatures
from ml_models import cluster_energy_profiles, detect_point_anomalies, detect_change_points

OUT_DIR = "outputs"


def load_data(mode: str) -> pd.DataFrame:
    if mode == "demo":
        from demo_data import generate_demo_sites, generate_demo_timeseries, inject_hidden_ramp_up
        sites = generate_demo_sites()
        df = generate_demo_timeseries(sites, start_date="2024-01-01", n_days=365)
        # bilərəkdən bir zonaya "gizli istehsal artımı" əlavə edirik ki, model tapsın
        df = inject_hidden_ramp_up(df, "Gəncə Sənaye Parkı", start_day_idx=280, growth=0.55)
        return df

    elif mode == "real":
        # REAL DATA YOLU - NASA Earthdata token tələb edir
        import datetime as dt
        from data_loader import (
            get_earthdata_session, find_granules_for_tile, download_granule,
            extract_radiance_for_site, IndustrialSite
        )
        from demo_data import generate_demo_sites  # koordinatları nümunə kimi istifadə edirik

        session = get_earthdata_session()
        sites = generate_demo_sites()  # öz sənaye koordinatlarınızla əvəz edin

        # Azərbaycan VIIRS tile-ı: h21v05 (Qafqaz/Xəzər regionu)
        # Dəqiq tile ID üçün: https://ladsweb.modaps.eosdis.nasa.gov/tools-and-services/tile-locator/
        start = dt.date(2024, 1, 1)
        end = dt.date(2024, 12, 31)
        granules = find_granules_for_tile(session, tile="h21v05", start_date=start, end_date=end)

        rows = []
        for granule in granules:
            local_path = download_granule(session, granule, out_dir="raw_h5")
            granule_date = granule.get("name", "")[9:16]  # AYYYYDDD formatından çıxarılır
            for site in sites:
                radiance = extract_radiance_for_site(local_path, site)
                rows.append({
                    "site_name": site.name, "sector": site.sector,
                    "lat": site.lat, "lon": site.lon,
                    "date": granule_date, "radiance_nW_cm2_sr": radiance,
                })
        return pd.DataFrame(rows)
    else:
        raise ValueError("mode 'demo' və ya 'real' olmalıdır")


def plot_timeseries(df: pd.DataFrame, anomalies: pd.DataFrame, out_dir: str):
    sites = df["site_name"].unique()
    fig, axes = plt.subplots(len(sites), 1, figsize=(11, 2.3 * len(sites)), sharex=True)
    if len(sites) == 1:
        axes = [axes]
    for ax, site in zip(axes, sites):
        g = anomalies[anomalies["site_name"] == site].sort_values("date")
        ax.plot(g["date"], g["radiance_nW_cm2_sr"], lw=1, color="#2b6cb0", label="Radiance")
        anom = g[g["is_anomaly"]]
        ax.scatter(anom["date"], anom["radiance_nW_cm2_sr"], color="red", s=18, zorder=5, label="Anomaliya")
        ax.set_ylabel("nW/cm²/sr", fontsize=8)
        ax.set_title(site, fontsize=9, loc="left")
        ax.legend(fontsize=7, loc="upper left")
    plt.xlabel("Tarix")
    plt.tight_layout()
    path = os.path.join(out_dir, "timeseries_anomalies.png")
    plt.savefig(path, dpi=140)
    plt.close()
    return path


def plot_clusters(clustered: pd.DataFrame, out_dir: str):
    fig, ax = plt.subplots(figsize=(7, 6))
    colors = plt.cm.Set2.colors
    for i, (cluster_id, g) in enumerate(clustered.groupby("cluster")):
        ax.scatter(
            g["mean_radiance"], g["weekday_weekend_ratio"],
            s=120, color=colors[i % len(colors)],
            label=g["energy_class"].iloc[0], edgecolor="k"
        )
        for name, row in g.iterrows():
            ax.annotate(name, (row["mean_radiance"], row["weekday_weekend_ratio"]),
                        fontsize=7, xytext=(4, 4), textcoords="offset points")
    ax.set_xlabel("Orta radiance (nW/cm²/sr)  →  Sənaye Zonasının Böyüklüyü")
    ax.set_ylabel("Həftəsonu/Həftəiçi nisbəti  →  24/7 İş İntensivliyi (\"Acgözlük\")")
    ax.set_title("Sənaye Zonalarının Kosmosdan Enerji Profili")
    ax.legend(fontsize=8)
    plt.tight_layout()
    path = os.path.join(out_dir, "energy_clusters.png")
    plt.savefig(path, dpi=140)
    plt.close()
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["demo", "real"], default="demo")
    parser.add_argument("--n-clusters", type=int, default=3)
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"[1/5] Data yüklənir (mode={args.mode})...")
    df = load_data(args.mode)
    df["date"] = pd.to_datetime(df["date"])

    print("[2/5] Enerji imzaları (features) çıxarılır...")
    features = build_energy_signatures(df)
    features.to_csv(os.path.join(OUT_DIR, "energy_signatures.csv"))

    print("[3/5] Klasterləmə (KMeans) işlədilir...")
    clustered = cluster_energy_profiles(features, n_clusters=args.n_clusters)
    clustered.to_csv(os.path.join(OUT_DIR, "clusters.csv"))

    print("[4/5] Anomaliya aşkarlanması (Isolation Forest) işlədilir...")
    anomalies = detect_point_anomalies(df)
    anomalies.to_csv(os.path.join(OUT_DIR, "anomalies.csv"), index=False)

    print("[5/5] Vizuallaşdırma və hesabat hazırlanır...")
    ts_path = plot_timeseries(df, anomalies, OUT_DIR)
    cluster_path = plot_clusters(clustered, OUT_DIR)

    # Dəyişiklik nöqtələri (change points) hər zona üçün ayrıca
    report_lines = ["VIIRS SƏNAYE ENERJİ ANALİZİ — XÜLASƏ HESABAT", "=" * 50, ""]
    for site, g in df.groupby("site_name"):
        g = g.sort_values("date")
        cps = detect_change_points(g.set_index("date")["radiance_nW_cm2_sr"])
        cluster_row = clustered.loc[site]
        report_lines.append(f"• {site} [{cluster_row['sector']}]")
        report_lines.append(f"    Enerji sinfi: {cluster_row['energy_class']}")
        report_lines.append(f"    Orta radiance: {cluster_row['mean_radiance']:.2f} nW/cm²/sr")
        report_lines.append(f"    Trend: {'artan' if cluster_row['trend_slope']>0 else 'azalan'} "
                             f"({cluster_row['trend_slope']:+.4f}/gün)")
        n_anom = anomalies[(anomalies["site_name"] == site) & (anomalies["is_anomaly"])].shape[0]
        report_lines.append(f"    Aşkarlanmış anomal gün sayı: {n_anom}")
        if cps:
            dates_list = g.reset_index(drop=True).loc[cps, "date"].dt.date.astype(str).tolist()
            report_lines.append(f"    Mümkün rejim dəyişikliyi tarixləri: {', '.join(dates_list)}")
        report_lines.append("")

    report_text = "\n".join(report_lines)
    with open(os.path.join(OUT_DIR, "report.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    print("\n" + report_text)
    print(f"\nNəticələr '{OUT_DIR}/' qovluğuna yazıldı:")
    print(f"  - energy_signatures.csv, clusters.csv, anomalies.csv, report.txt")
    print(f"  - {ts_path}")
    print(f"  - {cluster_path}")


if __name__ == "__main__":
    main()
