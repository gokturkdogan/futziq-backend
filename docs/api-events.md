# API — Olaylar (Events)

> **Swagger:** [game-sessions → GET /api/v1/game-sessions/{sessionId}/events](/swagger)  
> **Flutter v1:** Events endpoint'ini **kullanmayın** — tur ve seçim state'i `POST /actions` ve `GET /session` yanıtlarından gelir. Detay → [flutter-session-resume.md](./flutter-session-resume.md)

---

## GET /api/v1/game-sessions/:sessionId/events

Session'daki tüm oyun olaylarını kronolojik sırada döner. Audit ve replay amaçlıdır.

**Header:**

```http
X-Participant-Id: 550e8400-e29b-41d4-a716-446655440000
Accept-Language: tr
```

**Örnek yanıt (200):**

```json
[
  {
    "id": "event-uuid",
    "sequence": 1,
    "eventType": "SESSION_CREATED",
    "payload": { "familyCode": "TARGET_HUNT", "gameCode": "GOALS" },
    "createdAt": "2026-07-22T12:00:00.000Z"
  },
  {
    "id": "event-uuid-2",
    "sequence": 2,
    "eventType": "PLAYER_SELECTED",
    "payload": {
      "playerId": "player-uuid",
      "slotCode": null,
      "metricValue": 188
    },
    "createdAt": "2026-07-22T12:01:00.000Z"
  }
]
```

---

## eventType değerleri

| eventType | Açıklama |
|-----------|----------|
| `SESSION_CREATED` | Session başlatıldı |
| `PLAYER_SELECTED` | Oyuncu seçildi (`roundNumber` payload'da) |
| `ROUND_STARTED` | Yeni tur başladı (yeni `entity`) |
| `SESSION_COMPLETED` | Tüm seçimler tamamlandı |

---

## Flutter v1 için öneri

`currentRound` action ve session yanıtından yeterli. Events opsiyonel.

### ROUND_STARTED örneği (Draft)

```json
{
  "eventType": "ROUND_STARTED",
  "payload": {
    "roundNumber": 2,
    "scopeType": "CLUB",
    "entity": {
      "type": "CLUB",
      "id": "club-uuid",
      "name": "Real Madrid",
      "logoUrl": "https://..."
    }
  }
}
```
