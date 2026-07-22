# Flutter — Tasarım Sistemi (Geçici Referans)

> **Figma dosyası:** [Futz IQ — Mobile](https://www.figma.com/design/PR0pwbBqnvs6hHtDmthzxb/Futz-IQ)  
> **Lobby ekranı:** [node 2-303](https://www.figma.com/design/PR0pwbBqnvs6hHtDmthzxb/Futz-IQ?node-id=2-303) — canlı önizleme → [flutter-screens.md](./flutter-screens.md#2-lobbyscreen)

Web referans: `futziq-frontend` → `tailwind.config.ts`, `app/assets/css/main.css`

---

## Renk paleti

| Token | Hex | Kullanım |
|-------|-----|----------|
| `background` | `#080A0B` | Ana arka plan |
| `surface` | `#111416` | Kart, sidebar |
| `surfaceElevated` | `#171B1D` | Input, ikincil yüzey |
| `primary` | `#D8AE42` | CTA, vurgu, aktif border |
| `primaryHover` | `#E4BE55` | Hover |
| `football` | `#147A43` | Draft saha yeşili |
| `success` | `#22A95A` | Pozitif geri bildirim |
| `danger` | `#E05252` | Hata |
| `textPrimary` | `#F4F4F2` | Başlık, gövde |
| `textSecondary` | `#9DA3A6` | Alt metin |
| `borderSubtle` | `rgba(255,255,255,0.07)` | Kart çerçevesi |

```dart
abstract final class FzColors {
  static const background = Color(0xFF080A0B);
  static const surface = Color(0xFF111416);
  static const primary = Color(0xFFD8AE42);
  static const football = Color(0xFF147A43);
  static const textPrimary = Color(0xFFF4F4F2);
  static const textSecondary = Color(0xFF9DA3A6);
}
```

---

## Tipografi

| Rol | Font | Ağırlık | Boyut (mobil) |
|-----|------|---------|----------------|
| Display / oyun başlığı | Manrope | 700–800 | 20–24 sp |
| Section title | Manrope | 600 | 16–18 sp |
| Body | Manrope | 400–500 | 14 sp |
| Caption / badge | Manrope | 600 | 10–12 sp, uppercase tracking |

```yaml
# pubspec.yaml
fonts:
  - family: Manrope
    fonts:
      - asset: assets/fonts/Manrope-Regular.ttf
      - asset: assets/fonts/Manrope-SemiBold.ttf
        weight: 600
      - asset: assets/fonts/Manrope-Bold.ttf
        weight: 700
```

Google Fonts paketi ile de yüklenebilir: `google_fonts: ^6.2.0`

---

## Spacing ve şekil

| Token | Değer |
|-------|-------|
| `radiusFz` | 10 px (`0.625rem`) |
| `transitionFz` | 200 ms |
| `maxGameWidth` | 640 px (mobil tam genişlik, tablet'te ortala) |
| Kart padding | 12–16 px |
| Grid gap (scope picker) | 8–12 px |

Gold glow (seçili kart): `BoxShadow(color: primary.withOpacity(0.25), spreadRadius: 0, blurRadius: 0)` + `border: primary 50% opacity`

---

## Bileşen eşlemesi (web → Flutter)

| Web bileşeni | Flutter widget önerisi |
|--------------|------------------------|
| `FzGameModeCard` | `GameModeCard` — arka plan görsel + gradient overlay |
| `FzButton` | `FilledButton` primary gold |
| `DraftFormationBoard` | Custom `Stack` / `Column` — yeşil saha (`#1a6b38` çizgili) |
| `DraftRoundBanner` | `ListTile` + logo `ClipRRect` |
| `FzPlayerSearchInput` | `TextField` + debounce 300ms |
| `FzBadge` | `Chip` veya küçük `Container` |
| Scope picker (setup) | `GridView` kare kartlar, seçili = gold border |

---

## Draft saha

Web CSS referansı:

- Arka plan: `#1a6b38` + yatay çizgili gradient (`36px` stripe)
- Aspect ratio: ~5:7 (mobil), slot boyutu container'a göre `clamp`
- Slot: yuvarlak veya rounded kare, boş = kesik çizgi border

Figma geldiğinde slot pozisyonları Figma frame'lerinden alınacak; şimdilik web `DraftFormationBoard` layout'unu kopyalayın.

---

## İkonlar

| Durum | Öneri |
|-------|-------|
| RANDOM scope | `Icons.shuffle` |
| DRAFT_CLUB | `Icons.stadium` |
| DRAFT_COUNTRY | `Icons.flag` |
| Aktif sıra (multiplayer) | Pulse nokta, primary renk |

---

## Dark mode

Uygulama **yalnızca dark** tema ile başlar. Light tema Figma sonrası değerlendirilebilir.

---

## Figma entegrasyonu

Ekran önizlemeleri `/docs` içinde gömülü iframe ile gösterilir.

| Kaynak | Açıklama |
|--------|----------|
| [figma-screens.json](./figma-screens.json) | Ekran → Figma URL eşlemesi |
| `{{figma:lobby}}` | Markdown placeholder (ör. `flutter-screens.md`) |

Yeni ekran eklemek:

1. Figma'da frame seç → **Copy link**
2. `docs/figma-screens.json` içine ekle:
   ```json
   "setup": {
     "title": "SetupScreen",
     "figmaUrl": "https://www.figma.com/design/.../Futz-IQ?node-id=...",
     "embedUrl": "https://embed.figma.com/design/.../Futz-IQ?node-id=...&embed-host=share",
     "embedWidth": 800,
     "embedHeight": 450
   }
   ```
3. İlgili markdown'a `{{figma:setup}}` ekle
4. Backend yeniden başlat (veya `start:dev` watch)

---

## İlgili sayfalar

- [flutter-screens.md](./flutter-screens.md) — ekran haritası
- [flutter-assets.md](./flutter-assets.md) — katalog görselleri
- [flutter-draft-scope.md](./flutter-draft-scope.md) — tur banner UI
