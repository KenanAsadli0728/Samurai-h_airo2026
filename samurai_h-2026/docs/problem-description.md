# Günbəzgöz — Problemin Təsviri

## Background

Sənaye enerji sərfi və emissiya analitikası çox vaxt qeyri-şəffaf və gecikmiş məlumatlara əsaslanır. Real zamanlı sənaye enerji istifadəsini ölçmək üçün faydalı alətlərdən çox azdır, xüsusilə geniş coğrafi ərazilərdə və işıqlandırma informasiyasına görə.

VIIRS gecə işığı datası (Nighttime Lights) sənaye obyektlərinin enerji istifadəsi və fəaliyyətinin uzaqdan izlənməsi üçün güclü bir proxy təqdim edir. Bu data vasitəsilə biz gecə radiasiya dəyişikliklərini, qeyri-adi işıqlandırma artımlarını və uzunmüddətli dəyişiklikleri izləyə bilərik.

## Problem

### 1. Görünməz Enerji İstifadəsi

Çox sənaye obyektləri üçün enerji istehlakı yalnız daxili ölçmə cihazları və şirkət hesabatları ilə nəzarət edilir. Bu, regional səviyyədə enerji səmərəliliyini və potensial qanunsuz istifadəni qiymətləndirməyi çətinləşdirir.

### 2. Aşağı Görünürlüklü Anomaliyalar

Gecə vaxtı işıq səviyyəsindəki kəskin dəyişikliklər mühüm siqnallar ola bilər:
- istehsal gücündə ani artım,
- gecə növbəsində əlavə yanan avadanlıq,
- qeyri-qanuni və ya çıxışa bildirilən enerji istifadəsi.

Bu dəyişikliklər hesabatlarda və qonşu obyektlərin təsnifatlarında gizlənə bilər.

### 3. Mürəkkəb Regional Şərhlər

Şəhər və sənaye zonalarında işıq mənbələri çox vaxt qarışır. Bir piksel daxilində bir neçə obyektin işığı birləşə bilər və bu, ənənəvi analizləri yanlış istiqamətə yönəldə bilər.

### 4. Məhdud Mənbə və İzolyasiya Olmayan Təhlil

Çox analiz metodları ya yalnız yerüstü metrikalara, ya da illik hesabatlara əsaslanır. Bu isə real vaxtda enerji israfını və ya qeyri-adi fəaliyyətləri aşkarlamağa imkan vermir.

## Günbəzgöz Həlli

Günbəzgöz aşağıdakı əsas sahələrdə dəyər yaradır:

- **VIIRS əsaslı enerji profilinin yaranması**: peyk radianceından sənaye işıqlandırması və enerji imzası çıxarılır.
- **Klasterləmə və seqmentləşdirmə**: oxşar işıq profilləri eyni ansamblara toplanır, fərqli sənaye və istifadə tipləri ayırd edilir.
- **Anomaliya deteksiyası**: gecə işığında kəskin sıçrayışlar və normadan kənar davranışlar enerji səmərəliliyi və şübhəli fəaliyyət üçün siqnallar verir.
- **Dəyişiklik nöqtəsinin aşkarlanması**: vaxt ərzində enerji istifadəsində davamlı dəyişikliklər izlənir.
- **Interaktiv vizuallaşdırma**: frontend xəritə və panel ilə qərar qəbul etmə üçün vizual baxış təmin edilir.

## Məqsəd İstifadəçi Profilləri

| Rol | İstifadə Məqsədi |
|------|------------------|
| Enerji Təchizatçısı | Zona və obyekt üzrə enerji yükü trendini izləmək |
| Dövlət Nəzarətçisi | Potensial israf və səmərəsizlik zonalarını prioritetləşdirmək |
| Ekoloji Auditori | Emissiya və enerji istifadə anomaliyalarını aşkarlamaq |
| Şirkət Analitiki | İstehsal və işıqlandırma dəyişikliklərini vaxtında görmək |

## Nəticə

Günbəzgöz sənaye enerjisinin uzaqdan müşahidəsi üçün regional və məkan-temporal səviyyədə ilkin siqnal dəsti təqdim edir. Bu sistem enerji səmərəliliyini yaxşılaşdırmaq, potensial qanunsuz istifadəni və yaxud gözlənilməz istehlakı aşkarlamaq üçün qərar qəbul edənlərə geniş baxış verir.

---

*Bu sənəd samurai_h-2026 komandası tərəfindən hazırlanmışdır və AIIRO 2026 hackathon təqdimatı üçün nəzərdə tutulub.*
