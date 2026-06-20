# Günbəzgöz — VIIRS Sənaye Enerji Analizi — Kosmosdan "Gizli İstehlak" Oxunması

Gecə-işıq (nighttime lights) peyk datası ilə sənaye obyektlərinin enerji
istehlakı profilini ictimai açıq peyk datasından çıxaran sistem.

## ⚠️ ƏN VACİB QEYD — DƏQİQLİK VƏ HÜQUQİ ÇƏRÇİVƏ

Bu sistemi işlətməzdən əvvəl bunları başa düşmək vacibdir, çünki nəticələrin
düzgün yozulması bundan asılıdır:

1. **VIIRS işıq emissiyası ≠ elektrik istehlakı.** Day/Night Band sensoru yalnız
   **gecə görünən işığı** ölçür (lampalar, alov, parıltı). Çox sənaye
   enerjisi (motor gücü, soyutma, kompressorlar, qızdırılan sobalar) **işıq
   buraxmır** və peykdən görünmür. Bu metod görünən işıqlanmanı proxy kimi
   istifadə edir — bu, real enerji istehlakının **qaba təxmini**dir, dəqiq
   ölçüsü deyil. Korrelyasiya akademik tədqiqatlarda (xüsusən makro-iqtisadi
   GDP proxy kimi) sübut olunub, amma tək zavod səviyyəsində xəta payı yüksəkdir.
2. **500m piksel ölçüsü** o deməkdir ki, sıx şəhər mühitində qonşu obyektlərin
   işığı qarışa bilər (bir piksel bir neçə tikiliyi əhatə edə bilər).
3. **Hava şəraiti, ay işığı, qar əksi** kimi amillər nəticələri təhrif edə bilər
   (modelimiz bulud filtrini tətbiq edir, amma 100% deyil).
4. **"Heç kimdən icazə almadan"** ifadəsi ilə bağlı: NASA/NOAA datası açıq və
   pulsuzdur (CC BY 4.0), ona görə texniki baxımdan "icazə" lazım deyil. Amma
   nəticələri **konkret şirkət və ya obyekt haqqında ittihamedici** şəkildə (məs.
   "bu zavod gizli istehsalı artırır") nəşr etmək fərqli məsələdir — bu hüquqi
   risk daşıya bilər, çünki radiance dəyişikliyinin kifayət qədər səbəbi ola
   bilər (təhlükəsizlik işıqlandırması, fəsil dəyişikliyi, tikinti və s.).
   Nəticələri "ehtimal göstəricisi", araşdırma başlanğıc nöqtəsi kimi təqdim
   edin, faktiki sübut kimi yox.

## Fayl Strukturu

```
data_loader.py          → Real NASA Black Marble (VNP46A2) datasının yüklənməsi
demo_data.py             → DEMO rejimi: tokensiz test üçün realistik sintetik data
feature_engineering.py   → Radiance vaxt sırasından "Enerji İmzası" çıxarılması
ml_models.py              → ML: KMeans klasterləmə + Isolation Forest anomaliya
run_pipeline.py            → Hər şeyi işə salan əsas skript
outputs/                    → Nəticələr (CSV + PNG) bura yazılır
```

## Quraşdırma

```bash
pip install numpy pandas scikit-learn scipy matplotlib requests h5py rasterio
```

## İşə Salma — DEMO Rejimi (dərhal, token lazım deyil)

```bash
python run_pipeline.py --mode demo
```

Bu, real VIIRS-in statistik xüsusiyyətlərini (radiance diapazonları,
bulud boşluqları, flaring sıçrayışları, sektor profilləri) təqlid edən
sintetik data ilə bütün ML borusunu (pipeline) test edir. **Bu real peyk
datası DEYİL** — yalnız sistemin necə işlədiyini göstərmək üçündür.

## Backend ilə demo pipeline inteqrasiyası

FastAPI backend indi demo boru kəmərini bir HTTP endpoint kimi dəstəkləyir:

```bash
uvicorn backend.server:app --reload
```

Sorğu göndərmək üçün:

```bash
curl -X POST "http://localhost:8000/api/demo-pipeline" \
  -H "Content-Type: application/json" \
  -d '{"n_clusters": 3, "seed": 42}'
```

Bu endpoint `features`, `clusters`, `anomalies` və `change_points` daxil olmaq
üzrə demo pipeline nəticələrini JSON formatında qaytarır.

## İşə Salma — REAL Data Rejimi

### Addım 1: NASA Earthdata hesabı (pulsuz, 2 dəqiqə)
1. https://urs.earthdata.nasa.gov ünvanında qeydiyyatdan keçin
2. Profilinizdə **"Generate Token"** düyməsini basın, tokeni kopyalayın
3. Terminalda: `export NASA_EARTHDATA_TOKEN='sizin_tokeniniz'`

### Addım 2: Maraqlanan ərazinin VIIRS tile ID-sini tapın
https://ladsweb.modaps.eosdis.nasa.gov/tools-and-services/tile-locator/
ünvanında xəritədə ərazinizi seçib `hXXvYY` formatlı tile adını alın
(`run_pipeline.py`-dakı `tile="h21v05"` sətrini dəyişin).

### Addım 3: Öz sənaye zonalarınızın koordinatlarını qeyd edin
`demo_data.py` faylındakı `generate_demo_sites()` funksiyasını öz
maraqlandığınız obyektlərin lat/lon koordinatları ilə əvəz edin:

```python
IndustrialSite("Mənim Zavodum", lat=40.123, lon=49.456, buffer_km=1.5, sector="metallurgiya")
```

### Addım 4: İşə salın
```bash
python run_pipeline.py --mode real
```

İlk işə salınma yavaş ola bilər (hər gün üçün ~5-50MB HDF5 fayl endirilir,
illik analiz üçün 365 fayl). Fayllar `raw_h5/` qovluğunda keşlənir.

**Qeyd:** Bu konteyner mühitində NASA domenlərinə (`ladsweb.modaps.eosdis.nasa.gov`)
şəbəkə girişi yoxdur — yalnız PyPI/GitHub kimi inkişaf domenlərinə icazə var.
`--mode real` əmrini öz kompüterinizdə və ya açıq internetli serverdə işlədin.

## Metodologiya Xülasəsi

| Addım | Texnika | Nə üçün |
|---|---|---|
| Data təmizləmə | Quality-flag filtri, bulud maskası | Yalnız etibarlı pikselləri saxlamaq |
| Feature engineering | Orta, CV, trend slope, həftəsonu/həftəiçi nisbəti, pik/median | Zonanın "imzasını" rəqəmsallaşdırmaq |
| Klasterləmə | StandardScaler + KMeans (silhouette ilə qiymətləndirilir) | Oxşar enerji profilli zonaları qruplaşdırmaq |
| Nöqtəvi anomaliya | Isolation Forest (radiance + lokal kənarlaşma) | Qəfil sıçrayış/düşmə günlərini tapmaq |
| Rejim dəyişikliyi | Pəncərəli z-test (CUSUM-bənzər) | Uzunmüddətli trend qırılmalarını (yeni xətt, dayanma) aşkarlamaq |

## Nümunə Çıxış (demo data ilə)

`outputs/report.txt`, `outputs/energy_clusters.png` və
`outputs/timeseries_anomalies.png` faylına baxın — demo işə salınmasından
yaranıb. Sintetik datada qəsdən "gizli istehsal artımı" inject edilmiş
bir zona (Gəncə Sənaye Parkı) var ki, modelin bunu necə aşkarladığını görəsiniz.
