# API — Katalog (Game Families)

Lobby ve oyun kurulum ekranları bu endpoint'leri kullanır.

> **Swagger:** [game-families tag](/swagger)

---

## GET /api/v1/game-families

Aktif oyun ailelerini (kategorileri) listeler. Oyun ve scope detayı **içermez**.

**Flutter ekranı:** `LobbyScreen` — kart listesi.

---

## GET /api/v1/game-families/:code

Family detayı: oyunlar, scope'lar ve her oyun için `capabilities` manifest.

### Target Hunt örneği

```json
{
  "code": "TARGET_HUNT",
  "games": [{
    "code": "GOALS",
    "requiresScope": true,
    "capabilities": {
      "requiresScope": true,
      "selectionCount": 5,
      "slotBased": false,
      "hasTarget": true
    },
    "scopes": [
      { "code": "CAREER", "title": "Kariyer", "imageUrl": "..." },
      { "code": "RANDOM", "title": "Rastgele", "imageUrl": null }
    ]
  }]
}
```

### Draft örneği

```json
{
  "code": "DRAFT",
  "games": [{
    "code": "TALLEST_XI",
    "requiresScope": true,
    "capabilities": {
      "requiresScope": true,
      "selectionCount": 6,
      "slotBased": true,
      "hasTarget": false
    },
    "scopes": [
      {
        "code": "DRAFT_CLUB",
        "title": "Kulüp",
        "description": "Her turda rastgele bir kulüpten oyuncu seç.",
        "imageUrl": "/images/scopes/club.png"
      },
      {
        "code": "DRAFT_COUNTRY",
        "title": "Ülke",
        "description": "Her turda rastgele bir ülkeden oyuncu seç.",
        "imageUrl": "/images/scopes/country.png"
      }
    ]
  }]
}
```

---

## Scope tipleri — UI rehberi

### Target Hunt scope'ları

| code | Açıklama |
|------|----------|
| `CAREER`, `CLUB`, `NATIONAL_TEAM`, … | İstatistik kaynağı (sabit) |
| `RANDOM` | `imageUrl: null` — shuffle ikonu; create'de `scopeCode: "RANDOM"` |

### Draft scope'ları

| code | Açıklama | Frontend |
|------|----------|----------|
| `DRAFT_CLUB` | Tur bazlı rastgele kulüp | Scope picker kartı + oyun ekranında kulüp logosu |
| `DRAFT_COUNTRY` | Tur bazlı rastgele ülke | Scope picker kartı + oyun ekranında bayrak |

Draft scope seçimi **setup ekranında** yapılır. Tur entity'si session yanıtındaki `currentRound.entity` ile gelir — katalogdan değil.

Detay → [flutter-draft-scope.md](./flutter-draft-scope.md)

---

## capabilities manifest

| Alan | Target Hunt | Draft |
|------|-------------|-------|
| `requiresScope` | `true` | `true` |
| `selectionCount` | 5 | 6 |
| `slotBased` | `false` | `true` |
| `hasTarget` | `true` | `false` |

**Kural:** `capabilities.requiresScope` ile scope picker göster/gizle.

---

## Cache stratejisi

```dart
String cacheKey(String family, String locale, String version) =>
    '$family:$locale:$version';
```

**Flutter ekranı:** `SetupScreen` — game + **scope** seçimi.
