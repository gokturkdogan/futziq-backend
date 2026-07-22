# Flutter — definitionSnapshot Kullanımı

Her session yanıtında `definitionSnapshot` döner. Bu, oyunun **kurallarının donmuş kopyasıdır** — katalog sonradan değişse bile session boyunca sabit kalır.

`capabilities` setup UI için yeterlidir; oyun ekranında ek kurallar için `definitionSnapshot` okunur.

Kaynak tip: `GameDefinitionConfig` — `src/game-engine/contracts/game-types.ts`

---

## Hangi alan ne işe yarar?

| Alan | UI etkisi |
|------|-----------|
| `family` | `TARGET_HUNT` / `DRAFT` branch |
| `metric` | Metrik formatı, sonuç etiketi |
| `selectionCount` | Progress (`3/5`, `4/6`) |
| `revealPolicy` | Seçimde metric göster/gizle |
| `objective` | Draft: MAX = en uzun, MIN = en kısa |
| `lineupTemplate` | Draft slot listesi (kod + displayName) |
| `comparison` | Target Hunt skor mantığı (client'ta çoğunlukla result'tan okunur) |
| `performanceRating` | Target Hunt sonuç rozet eşikleri |
| `roundScopeType` | Draft: `CLUB` veya `COUNTRY` (debug) |

**Tur entity için** `currentRound` kullanın — `definitionSnapshot` değil.

---

## revealPolicy → UI

| Değer | Davranış |
|-------|----------|
| `IMMEDIATE` | Seçim sonrası `metricValue` göster |
| `GAME_END` | Seçim listesinde metric gizle; `selection.revealed == true` olunca göster |
| `ROUND_END` | Tur bitene kadar gizle (ileri modlar) |
| `HIDDEN` | Metric hiç gösterme |

```dart
double? visibleMetricValue(GameSelection selection, String revealPolicy) {
  if (revealPolicy == 'IMMEDIATE' || selection.revealed) {
    return selection.metricValue;
  }
  return null;
}
```

Arama (`GET /players`) **hiçbir zaman** metric döndürmez.

---

## metric → formatlama

`definitionSnapshot.metric` koduna göre etiket ve birim:

| Metric örneği | Format | Birim |
|---------------|--------|-------|
| `CAREER_GOALS` | integer | gol |
| `CAREER_MINUTES` | minutes | dk |
| `HEIGHT_CM` | integer | cm |
| `PEAK_MARKET_VALUE` | currency | EUR |

```dart
String formatMetric(num value, String metricCode, String locale) {
  if (metricCode == 'HEIGHT_CM') {
    return '${NumberFormat.decimalPattern(locale).format(value)} cm';
  }
  if (metricCode == 'PEAK_MARKET_VALUE') {
    return NumberFormat.simpleCurrency(locale: locale, name: 'EUR').format(value);
  }
  return NumberFormat.decimalPattern(locale).format(value);
}
```

Web referans: `futziq-frontend` → `metric-presentation.ts`

i18n: Metrik **başlıkları** için katalog çevirileri veya client-side map; sayı formatı `intl` paketi.

---

## objective (Draft)

| Değer | UI metni (örnek) |
|-------|------------------|
| `MAX` | En uzun kadroyu oluştur |
| `MIN` | En kısa kadroyu oluştur |

Sonuç ekranında `result.objective` ile aynı değer gelir — setup'ta da `definitionSnapshot.objective` gösterilebilir.

---

## lineupTemplate

Draft slotları session create sonrası `participants[].lineup` içinde gelir (`displayName` Accept-Language ile lokalize).

`lineupTemplate.slots` yalnızca tanım için; runtime state `lineup[].occupied` ve `playerSnapshot` alanlarındadır.

Slot kodları: `GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT`

---

## capabilities vs definitionSnapshot

| | capabilities | definitionSnapshot |
|---|-------------|-------------------|
| Ne zaman | Setup ekranı | Oyun + sonuç ekranı |
| Kaynak | Katalog API | Session API |
| Amaç | Hangi UI bileşenleri? | Oyun kuralları, metric, reveal |

```dart
// Setup
if (game.capabilities.requiresScope) showScopePicker();
if (game.capabilities.slotBased) navigateToDraft();

// Oyun
final metric = session.definitionSnapshot['metric'] as String;
final revealPolicy = session.definitionSnapshot['revealPolicy'] as String;
final selectionCount = session.definitionSnapshot['selectionCount'] as int;
```

---

## Checklist

- [ ] Progress bar: `definitionSnapshot.selectionCount`
- [ ] Metric format: `metric` kodu
- [ ] `revealPolicy` ile seçim listesi
- [ ] Draft objective etiketi
- [ ] Tur entity: `currentRound` (snapshot değil)
