# API — Session Oluşturma ve Durum

> **Swagger:** [POST /api/v1/game-sessions](/swagger) · [GET /api/v1/game-sessions/{sessionId}](/swagger)

---

## POST /api/v1/game-sessions

### Target Hunt

```json
{
  "familyCode": "TARGET_HUNT",
  "gameCode": "GOALS",
  "scopeCode": "CAREER",
  "playerMode": "SINGLE",
  "targetValue": 500
}
```

### Draft (tur bazlı scope)

```json
{
  "familyCode": "DRAFT",
  "gameCode": "TALLEST_XI",
  "scopeCode": "DRAFT_CLUB",
  "playerMode": "MULTIPLAYER"
}
```

| scopeCode | Tur davranışı |
|-----------|---------------|
| `DRAFT_CLUB` | Her tur rastgele kulüp |
| `DRAFT_COUNTRY` | Her tur rastgele ülke |

### Body alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `familyCode` | Evet | `TARGET_HUNT` veya `DRAFT` |
| `gameCode` | Evet | Katalogdan |
| `scopeCode` | `requiresScope: true` ise | Target Hunt: `CAREER`, `RANDOM`… Draft: `DRAFT_CLUB`, `DRAFT_COUNTRY` |
| `targetValue` | Hayır | Target Hunt only |
| `playerMode` | Hayır | `SINGLE` veya `MULTIPLAYER` |

---

## Draft yanıt — currentRound

```json
{
  "id": "session-uuid",
  "status": "IN_PROGRESS",
  "stateVersion": 0,
  "scopeCode": "DRAFT_CLUB",
  "family": "DRAFT",
  "playerMode": "MULTIPLAYER",
  "currentRound": {
    "roundNumber": 1,
    "totalRounds": 6,
    "scopeType": "CLUB",
    "picksInRound": 0,
    "picksRequired": 2,
    "entity": {
      "type": "CLUB",
      "id": "club-uuid",
      "name": "FC Barcelona",
      "logoUrl": "https://cdn.example.com/barca.png"
    }
  },
  "participants": [{
    "lineup": [
      { "slotCode": "GK", "displayName": "Kaleci", "occupied": false }
    ]
  }]
}
```

| Alan | Açıklama |
|------|----------|
| `currentRound.entity` | Bu turun kulübü/ülkesi — logo, id, name |
| `picksRequired` | `1` (SINGLE) veya `2` (MULTIPLAYER) |
| `scopeCode` | Setup'ta seçilen `DRAFT_CLUB` / `DRAFT_COUNTRY` |

---

## GET /api/v1/game-sessions/:sessionId

Session yenileme, conflict sonrası sync, app resume.

**Önemli alanlar:**

| Alan | Açıklama |
|------|----------|
| `stateVersion` | Action'da `expectedVersion` |
| `currentRound` | Aktif tur + entity (Draft) |
| `participants[].lineup` | Slot durumu |

Action yanıtında da `state.currentRound` güncellenir.

---

## Hata kodları

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `GAME_SCOPE_REQUIRED` | 400 | Draft'ta `scopeCode` eksik |
| `INVALID_GAME_SCOPE_COMBINATION` | 400 | Geçersiz scope veya uygun kulüp/ülke bulunamadı |
