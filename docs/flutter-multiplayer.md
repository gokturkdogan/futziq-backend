# Flutter — Multiplayer (Aynı Cihaz)

İki oyuncunun sırayla aynı session'da oynadığı mod.

> **Kritik:** Header kuralları → [flutter-local-multiplayer.md](./flutter-local-multiplayer.md) (`::p1` / `::p2`)  
> **Swagger:** [POST /api/v1/game-sessions](/swagger)

---

## Draft multiplayer + tur scope

```json
POST /api/v1/game-sessions
{
  "familyCode": "DRAFT",
  "gameCode": "TALLEST_XI",
  "scopeCode": "DRAFT_CLUB",
  "playerMode": "MULTIPLAYER"
}
```

**Tur akışı (multiplayer):**
- Her turda aynı kulüp/ülke (`currentRound.entity`)
- Tur başına **2 seçim** (`picksRequired: 2`) — oyuncular sırayla
- Her ikisi de seçince → yeni tur, yeni entity
- 6 tur × 2 seçim = 12 toplam pick (her oyuncu 6 slot)

**UI:**
- Tur banner: entity logo + `picksInRound / picksRequired`
- Sıra göstergesi: `currentTurnParticipantId`
- Tur değişiminde entity banner güncelle

Detay → [flutter-draft-scope.md](./flutter-draft-scope.md)

---

## Target Hunt multiplayer

```json
{
  "familyCode": "TARGET_HUNT",
  "gameCode": "GOALS",
  "scopeCode": "CAREER",
  "playerMode": "MULTIPLAYER"
}
```

- Paylaşımlı `targetValue`
- Sırayla 5'er seçim
- `GET /results` ile karşılaştırma

---

## Sıra yönetimi

Multiplayer'da action/search isteklerinde **sıradaki oyuncunun** `externalParticipantId` header'ı gönderilmelidir (`host::p1` veya `host::p2`). Detay → [flutter-local-multiplayer.md](./flutter-local-multiplayer.md)

```dart
bool isParticipantTurn(GameSession session, String participantId) {
  return session.currentTurnParticipantId == participantId;
}
```

---

## Oyuncu seçimi kuralları

- Global `alreadySelected` — multiplayer'da aynı oyuncu iki kez seçilemez
- `NOT_YOUR_TURN` — yanlış sıra

---

## Sonuç

```http
GET /api/v1/game-sessions/{id}/results
```

Draft: her oyuncunun lineup + `totalMetricValue` karşılaştırması.
