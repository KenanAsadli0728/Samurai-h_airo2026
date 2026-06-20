# Günbəzgöz Etik Bəyanatı

## Günbəzgöz — Etik Öhdəliklər

**Team:** samurai_h-2026  
**Competition:** AIIRO 2026 Hackathon  
**Date:** June 2026

---

## 1. Mənbə və Səlahiyyət

Günbəzgöz analitikaları yalnız açıq mənbəli NASA/NOAA VIIRS gecə işığı (
Nighttime Lights) datasından və layihə daxilində yaradılmış sintetik test nümunələrindən istifadə edir.

- Real dünyanın enerji istehlakı modelləri ilə bağlı təxminlər **əslində proxy** hesab olunur.
- Layihədə heç bir şəxsə aid fərdi məxfi məlumatlar, işçi saatları, faktiki hesablar və ya sənaye müəssisələrinin gizli daxili rəqəmləri istifadə edilmir.
- VIIRS datası yalnız fəzii işıq sərfə göstərir — bu, birbaşa elektrik sərfiyyatı və ya istehsal həcmi deyil.

## 2. Məxfilik və Risk İdarəçiliyi

Bu sistem aşağıdakı etik prinsiplərə əsaslanır:

- **Anonimləşdirmə**: Analizlər üzrə çıxarışlar obyekt səviyyəsində deyil, piksel və zona səviyyəsindədir.
- **Data minimallaşdırma**: Tədqiqat və prototip mərhələsində yalnız nəzarət edilən açıq data istifadə edilir.
- **Riskin düzgün təqdimatı**: Nəticələr “ehtimal göstəricisi” kimi təqdim edilməlidir, “fakt” və ya “təsdiq edilmiş qanunsuzluq” kimi deyil.
- **Aydın məna**: Potensial enerji xərcini və anomaliyaları izah edərkən meteoroloji və sezonal amillər nəzərə alınmalıdır.

## 3. Məqsəd və İstifadə Qaydaları

Günbəzgözün məqsədi sənaye və regional enerji sərfiyyatlarının gecə işığı datası vasitəsilə ilkin analizini təmin etməkdir.

- Sistem **gizli və ya qanunsuz enerji istifadəsinin** sübutunu deyil, **güman olunan anomal qatarları** müəyyənləşdirmək üçün nəzərdə tutulub.
- Nəticələr enerji səmərəliliyi, avadanlıq nasazlığı, yaxud göstərilməyən istehsal aktivliyi kimi hallar üçün ilkin araşdırma siqnalı olmalıdır.
- Bu alət yalnız qərar qəbul etmə prosesini dəstəkləyir; hüquqi və əməli yoxlamalar üçün əlavə mənbələr tələb olunur.

## 4. Şəffaflıq və Hesabatlılıq

Layihənin etik tələbləri aşağıdakıları əhatə edir:

- **Açıq mənbə**: Modelin və istifadənin məhdudiyyətləri şərh edilməli və aydın göstərilməlidir.
- **Sənədləşdirmə**: Hər bir analiz nəticəsi üçün istifadə edilmiş zaman aralığı, verilən data mənbəyi və ilkin hipotezlər qeyd olunmalıdır.
- **Məsuliyyət**: Analiz nəticələrinin qərara çevrilməsi halında peşəkar enerji auditorları, ətraf mühit müşahidəçiləri və təchizatçı ekspertləri ilə məsləhətləşmə tələb olunur.

## 5. Uyğunluq və Məsuliyyət

Günbəzgöz aşağıdakı əsas prinsipləri qəbul edir:

- **Yanlış intepretasiyadan çəkinmə**: VIIRS işıq səviyyəsinin dəyişməsi yalnız elektrik yükü deyil, həm də işıqlandırma dəyişiklikləri, tikinti, hava şəraiti və təmir işləri ilə bağlı ola bilər.
- **Qanuni məhdudiyyətlər**: Nəticələr dövlətlər və ya şirkətlər haqqında ittiham edici sənəd kimi təqdim edilməməlidir.
- **Sosial məsuliyyət**: Layihə enerji şəffaflığını və səmərəliliyini təşviq edən, lakin fərdi və təşkilati reputasiyaya zərər verə biləcək nəticələrdən qaçınan yanaşma ilə hazırlanmalıdır.

## 6. Bəyanat

Biz, samurai_h-2026 komandası olaraq, Günbəzgöz layihəsini etik və məsuliyyətli şəkildə hazırladığımızı təsdiqləyirik:

- [x] Heç bir real fərd və ya müəssisə haqqında həssas məlumat istifadə edilməyib.
- [x] Analizlər yalnız açıq VIIRS gecə işığı datası və layihə daxilində yaradılmış demo datası üzərində qurulub.
- [x] Nəticələr ehtimal və patern göstəricisi kimi təqdim edilir, təsdiqlənmiş istehlak və ya qanunsuzluq sübutu kimi yox.
- [x] Bu prototip enerji analitikası üçün nəzərdə tutulub və şəxsi təqib və ya fərdi məsuliyyətə əsaslanan nəticələr yaratmamalıdır.

---

*Bu deklarasiya Günbəzgöz layihəsinin etik çərçivəsini təmin etmək üçün hazırlanmışdır.*
