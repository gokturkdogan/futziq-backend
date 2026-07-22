# API — Sonuçlar

> **Swagger:** [GET /api/v1/game-sessions/{sessionId}/result](/swagger) · [GET /api/v1/game-sessions/{sessionId}/results](/swagger)

---

## GET /api/v1/game-sessions/:sessionId/result

Mevcut katılımcının sonucunu döner. Session `COMPLETED` olmalıdır.

**Header:**

```http
X-Participant-Id: 550e8400-e29b-41d4-a716-446655440000
Accept-Language: tr
```

### Target Hunt yanıt (`kind: TARGET_HUNT`)

```json
{
  "kind": "TARGET_HUNT",
  "targetValue": 500,
  "aggregateValue": 487,
  "absoluteDifference": 13,
  "exactHit": false,
  "performanceRating": "EXCELLENT",
  "selections": [
    {
      "playerId": "uuid",
      "displayName": "Cristiano Ronaldo",
      "metricValue": 188,
      "slotCode": null
    }
  ]
}
```

### Draft yanıt (`kind: DRAFT`)

```json
{
  "kind": "DRAFT",
  "objective": "MAX",
  "aggregateValue": 12.45,
  "totalMetricValue": 12.45,
  "averageMetricValue": 2.075,
  "lineup": [
    {
      "slotCode": "GK",
      "displayName": "Kaleci",
      "line": "GK",
      "occupied": true,
      "playerId": "uuid",
      "metricValue": 1.98,
      "playerSnapshot": { "displayName": "..." }
    }
  ],
  "selections": []
}
```

---

## Discriminated union — UI branching

```dart
Widget buildResult(Map<String, dynamic> json) {
  switch (json['kind']) {
    case 'DRAFT':
      return DraftResultView(result: DraftResult.fromJson(json));
    case 'TARGET_HUNT':
    default:
      return TargetHuntResultView(result: TargetHuntResult.fromJson(json));
  }
}
```

**Asla** family koduna göre sonuç ekranı branch'lemeyin; her zaman `kind` kullanın.

---

## GET /api/v1/game-sessions/:sessionId/results

Multiplayer: tüm katılımcıların sonuçları (`turnOrder` sırasıyla).

**Kullanım:** Aynı cihazda iki oyuncu modu sonuç ekranı.

```json
[
  {
    "kind": "TARGET_HUNT",
    "participantId": "uuid-1",
    "turnOrder": 0,
    "targetValue": 500,
    "aggregateValue": 487,
    "performanceRating": "EXCELLENT"
  },
  {
    "kind": "TARGET_HUNT",
    "participantId": "uuid-2",
    "turnOrder": 1,
    "targetValue": 500,
    "aggregateValue": 512,
    "performanceRating": "GOOD"
  }
]
```

Detay → [flutter-multiplayer.md](./flutter-multiplayer.md)

---

## performanceRating değerleri

| Değer | Anlam (örnek) |
|-------|---------------|
| `PERFECT` | Tam isabet |
| `EXCELLENT` | Çok yakın |
| `GOOD` | İyi |
| `FAIR` | Orta |
| `POOR` | Uzak |

Çeviriler: `GET /api/v1/meta/enums` veya i18n bundle → `enums.performance.*`

---

## Hatalar

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `RESULT_NOT_AVAILABLE` | 404 | Session henüz tamamlanmadı |
| `GAME_SESSION_NOT_FOUND` | 404 | Geçersiz session ID |
