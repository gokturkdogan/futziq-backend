# API — Oyuncu Arama

> **Swagger:** [game-sessions → GET /api/v1/game-sessions/{sessionId}/players](/swagger)

---

## GET /api/v1/game-sessions/:sessionId/players

Session içinde uygun oyuncuları arar. Sayfalı sonuç döner.

**Header:**

```http
X-Participant-Id: 550e8400-e29b-41d4-a716-446655440000
Accept-Language: tr
```

**Query parametreleri:**

| Param | Zorunlu | Varsayılan | Açıklama |
|-------|---------|------------|----------|
| `q` | Evet | — | Min 2 karakter arama metni |
| `page` | Hayır | 1 | Sayfa numarası |
| `limit` | Hayır | 20 | Sayfa boyutu (max 50) |
| `slotCode` | Draft'ta önerilir | — | `GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT` |

### Target Hunt örnek

```http
GET /api/v1/game-sessions/{sessionId}/players?q=ronaldo&page=1&limit=20
```

### Draft örnek

```http
GET /api/v1/game-sessions/{sessionId}/players?q=van&slotCode=DEF1&page=1&limit=20
```

**Örnek yanıt (200):**

```json
{
  "items": [
    {
      "id": "player-id",
      "displayName": "Cristiano Ronaldo",
      "normalizedPositions": ["ST", "CF"],
      "alreadySelected": false
    },
    {
      "id": "player-id-2",
      "displayName": "Lionel Messi",
      "normalizedPositions": ["RW", "CF"],
      "alreadySelected": true
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 42,
  "totalPages": 3
}
```

---

## Draft — tur bazlı scope filtresi

Draft modunda arama **otomatik** olarak `currentRound.entity` ile filtrelenir:

| scopeType | Filtre |
|-----------|--------|
| `CLUB` | Sadece o turun kulübündeki oyuncular |
| `COUNTRY` | Sadece o turun ülkesinden (milliyet) oyuncular |

Client **clubId/countryId göndermez** — backend session'daki `currentRound` state'inden okur.

Tur değişince arama sonuçlarını sıfırlayın.

---

## UI kuralları

1. `alreadySelected: true` olan satırları devre dışı bırakın (multiplayer'da global)
2. Arama metni min 2 karakter olmadan istek atmayın
3. Draft'ta aktif slot değişince `slotCode` parametresini güncelleyin
4. Metric değerleri arama sonucunda **dönmez** — seçim sonrası `revealPolicy`'e göre açılır

---

## Draft slot kodları

| slotCode | line | Pozisyon grupları |
|----------|------|-------------------|
| GK | GK | Kaleci |
| DEF1, DEF2 | DEF | Defans |
| MID1, MID2 | MID | Orta saha |
| ATT | ATT | Forvet |

**Flutter ekranı:** `PlayerSearchSheet` — slot seçildikten sonra açılır, `slotCode` query'de gönderilir.

---

## Sayfalama

```dart
Future<void> loadMore() async {
  if (page >= totalPages) return;
  final next = await sessionApi.searchPlayers(
    sessionId: id,
    q: query,
    page: page + 1,
    slotCode: activeSlot,
  );
  items.addAll(next.items);
}
```
