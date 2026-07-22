# Flutter — Draft Akışı

Formasyona 6 oyuncu yerleştirme modu. Her turda rastgele atanan kulüp veya ülkeden oyuncu seçilir.

> **Swagger:** [game-sessions](/swagger)  
> **Scope & tur:** [flutter-draft-scope.md](./flutter-draft-scope.md)  
> **API:** [api-player-search.md](./api-player-search.md), [api-actions.md](./api-actions.md)

---

## Adım adım akış

```
1. GET  /api/v1/game-families/DRAFT
2. TALLEST_XI veya SHORTEST_XI seç
3. Setup: DRAFT_CLUB veya DRAFT_COUNTRY scope seç
4. POST /api/v1/game-sessions { ..., scopeCode: "DRAFT_CLUB" }
5. currentRound.entity göster (tur 1 kulübü/ülkesi)
6. Boş slot tıkla → activeSlotCode
7. GET /players?q=...&slotCode=GK  (otomatik scope filtresi)
8. POST /actions { ..., slotCode }
9. currentRound güncelle; tur bittiğinde yeni entity
10. 6 tur / 6 slot tamamlanınca GET /result
```

---

## Session create

```json
POST /api/v1/game-sessions
{
  "familyCode": "DRAFT",
  "gameCode": "TALLEST_XI",
  "scopeCode": "DRAFT_CLUB",
  "playerMode": "SINGLE"
}
```

| scopeCode | Anlam |
|-----------|-------|
| `DRAFT_CLUB` | Her tur rastgele kulüp |
| `DRAFT_COUNTRY` | Her tur rastgele ülke (milliyet) |

`scopeCode` **zorunlu** — `requiresScope: true`.

Detaylı scope picker UI → [flutter-draft-scope.md](./flutter-draft-scope.md)

---

## currentRound yanıtı

```json
{
  "currentRound": {
    "roundNumber": 1,
    "totalRounds": 6,
    "scopeType": "CLUB",
    "picksInRound": 0,
    "picksRequired": 1,
    "entity": {
      "type": "CLUB",
      "id": "uuid",
      "name": "FC Barcelona",
      "logoUrl": "https://..."
    }
  },
  "participants": [{
    "lineup": [
      { "slotCode": "GK", "displayName": "Kaleci", "occupied": false },
      { "slotCode": "DEF1", "displayName": "Defans 1", "occupied": false }
    ]
  }]
}
```

---

## Formasyon (1-2-2-1)

```
        ATT
    MID1   MID2
   DEF1     DEF2
        GK
```

| slotCode | line |
|----------|------|
| GK | GK |
| DEF1, DEF2 | DEF |
| MID1, MID2 | MID |
| ATT | ATT |

---

## Tur ↔ slot ilişkisi

| Tur | Slot | Scope entity |
|-----|------|--------------|
| 1 | GK | Tur 1 kulübü/ülkesi |
| 2 | DEF1 | Tur 2 (yeni entity) |
| 3 | DEF2 | Tur 3 |
| 4 | MID1 | Tur 4 |
| 5 | MID2 | Tur 5 |
| 6 | ATT | Tur 6 |

**Single:** Her turda 1 seçim → 6 tur  
**Multiplayer:** Her turda 2 seçim (sırayla) → 6 tur

---

## Slot bazlı arama

```http
GET /api/v1/game-sessions/{id}/players?q=van&slotCode=DEF1
```

Oyuncular **sadece `currentRound.entity`** kulübü/ülkesinden döner. Client ek parametre göndermez.

---

## Slot bazlı seçim

```json
POST /api/v1/game-sessions/{id}/actions
{
  "actionId": "yeni-uuid",
  "expectedVersion": 2,
  "playerId": "player-uuid",
  "slotCode": "DEF1"
}
```

Action yanıtında `state.currentRound` güncellenir. Tur bittiğinde `entity` değişir.

---

## Sonuç ekranı

```json
{
  "kind": "DRAFT",
  "objective": "MAX",
  "totalMetricValue": 12.45,
  "lineup": ["...6 slot..."]
}
```

| gameCode | objective |
|----------|-----------|
| `TALLEST_XI` | `MAX` (en uzun toplam) |
| `SHORTEST_XI` | `MIN` (en kısa toplam) |

---

## UI ipuçları

1. Üstte `DraftRoundBanner` — entity logo + isim + tur sayacı
2. Tur değişiminde kısa animasyon / toast
3. `PLAYER_NOT_ELIGIBLE` → oyuncu bu turun scope'una uymuyor
4. Progress: `roundNumber / totalRounds` ve slot doluluk
