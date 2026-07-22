# API — Aksiyonlar (SELECT_PLAYER)

> **Swagger:** [game-sessions → POST /api/v1/game-sessions/{sessionId}/actions](/swagger)

---

## POST /api/v1/game-sessions/:sessionId/actions

Oyuncu seçim aksiyonu gönderir. v1'de tek desteklenen aksiyon: `SELECT_PLAYER`.

**Header:**

```http
Content-Type: application/json
X-Participant-Id: 550e8400-e29b-41d4-a716-446655440000
Accept-Language: tr
```

### Target Hunt örnek istek

```json
{
  "actionId": "550e8400-e29b-41d4-a716-446655440001",
  "expectedVersion": 0,
  "playerId": "player-uuid"
}
```

### Draft örnek istek

```json
{
  "actionId": "550e8400-e29b-41d4-a716-446655440002",
  "expectedVersion": 1,
  "playerId": "player-uuid",
  "slotCode": "DEF1"
}
```

### Body alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `actionId` | Evet | Client UUID — her dokunuşta yeni (idempotency) |
| `expectedVersion` | Evet | Session'daki güncel `stateVersion` |
| `playerId` | Evet | Seçilen oyuncu ID |
| `slotCode` | Draft'ta evet | `GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT` |

### Örnek yanıt (200)

```json
{
  "state": {
    "stateVersion": 1,
    "selectionCount": 1,
    "aggregateValue": 188,
    "lineup": null,
    "selections": [
      {
        "playerId": "player-uuid",
        "slotCode": null,
        "metricValue": 188,
        "revealed": false
      }
    ]
  },
  "eventType": "PLAYER_SELECTED",
  "completed": false,
  "idempotentReplay": false
}
```

**Draft yanıt farkı:** `state.lineup` güncellenir + `state.currentRound` güncellenir.

```json
{
  "state": {
    "stateVersion": 2,
    "currentRound": {
      "roundNumber": 2,
      "totalRounds": 6,
      "scopeType": "CLUB",
      "picksInRound": 0,
      "picksRequired": 2,
      "entity": {
        "type": "CLUB",
        "id": "new-club-uuid",
        "name": "Real Madrid",
        "logoUrl": "https://..."
      }
    },
    "lineup": ["..."]
  },
  "eventType": "PLAYER_SELECTED",
  "completed": false
}
```

Tur bittiğinde (`picksInRound` sıfırlanır, `roundNumber` artar, `entity` değişir).

---

## Idempotency

Aynı `actionId` ile tekrar istek atılırsa:
- `idempotentReplay: true`
- State değişmez, çift seçim olmaz

**Kullanım:** Ağ hatası sonrası aynı `actionId` ile retry güvenlidir.

---

## Tamamlanma

Son seçimde `completed: true` döner → sonuç ekranına yönlendirin.

```json
{
  "state": { "stateVersion": 5, "selectionCount": 5, "...": "..." },
  "eventType": "PLAYER_SELECTED",
  "completed": true,
  "idempotentReplay": false
}
```

Ardından: `GET /api/v1/game-sessions/:id/result`

---

## Hata kodları

| Kod | HTTP | UI |
|-----|------|-----|
| `STATE_VERSION_CONFLICT` | 409 | Session yenile, version güncelle |
| `PLAYER_ALREADY_SELECTED` | 409 | Oyuncuyu disable et |
| `NOT_YOUR_TURN` | 400 | Sıra göstergesini güncelle |
| `PLAYER_NOT_ELIGIBLE` | 400 | Slot uyumsuzluğu mesajı |
| `SELECTION_LIMIT_REACHED` | 400 | Oyun zaten tamamlanmış olabilir |
| `GAME_SESSION_NOT_ACTIVE` | 409 | Sonuç ekranına git |

---

## Flutter action akışı

```dart
Future<void> selectPlayer(String playerId, {String? slotCode}) async {
  final actionId = const Uuid().v4();
  try {
    final res = await sessionApi.submitAction(
      sessionId: session.id,
      actionId: actionId,
      expectedVersion: session.stateVersion,
      playerId: playerId,
      slotCode: slotCode,
    );
    session = session.copyWith(stateVersion: res.state.stateVersion);
    if (res.completed) {
      navigator.push(ResultScreen(sessionId: session.id));
    }
  } on ApiException catch (e) {
    if (e.code == 'STATE_VERSION_CONFLICT') {
      await refreshSession();
      // Kullanıcıya tekrar deneme seçeneği sun
    }
  }
}
```
