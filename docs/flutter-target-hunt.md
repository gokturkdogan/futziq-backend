# Flutter — Target Hunt Akışı

Hedef değere en yakın toplamı bulan oyun modu. 5 oyuncu seçilir.

> **Swagger:** [game-sessions](/swagger) · **API detay:** [api-session.md](./api-session.md), [api-actions.md](./api-actions.md)

---

## Adım adım akış

```
1. GET /api/v1/game-families
2. Kullanıcı TARGET_HUNT seçer → GET /api/v1/game-families/TARGET_HUNT
3. Oyun + scope seçer → POST /api/v1/game-sessions
4. targetValue + selectionCount göster (capabilities'ten)
5. selectionCount dolana kadar:
   a. GET /players?q=...
   b. POST /actions { actionId, expectedVersion, playerId }
   c. stateVersion güncelle
6. completed: true → GET /result
7. kind == TARGET_HUNT → performans ekranı
```

---

## Session create

```json
POST /api/v1/game-sessions
{
  "familyCode": "TARGET_HUNT",
  "gameCode": "GOALS",
  "scopeCode": "CAREER",
  "playerMode": "SINGLE",
  "targetValue": 500
}
```

| Alan | Not |
|------|-----|
| `scopeCode` | `capabilities.requiresScope` true ise zorunlu |
| `targetValue` | Boş bırakılırsa backend rastgele hedef üretir |
| `scopeCode: "RANDOM"` | `imageUrl: null` scope için |

**Yanıt:** `stateVersion: 0`, `targetValue`, `participants[0].lineup: null`

---

## Oyuncu arama

```http
GET /api/v1/game-sessions/{id}/players?q=ronaldo&page=1&limit=20
```

`slotCode` **göndermeyin** — Target Hunt slot-based değil.

---

## Oyuncu seçimi

```json
POST /api/v1/game-sessions/{id}/actions
{
  "actionId": "yeni-uuid",
  "expectedVersion": 0,
  "playerId": "player-uuid"
}
```

Her başarılı seçimde `state.stateVersion` artar. 5. seçimde `completed: true`.

---

## Sonuç ekranı

```http
GET /api/v1/game-sessions/{id}/result
```

```json
{
  "kind": "TARGET_HUNT",
  "targetValue": 500,
  "aggregateValue": 487,
  "absoluteDifference": 13,
  "exactHit": false,
  "performanceRating": "EXCELLENT"
}
```

**UI gösterimi:**
- Hedef vs toplam karşılaştırması
- `performanceRating` → i18n bundle'dan çeviri
- Seçilen 5 oyuncu listesi (`selections`)

---

## UI ipuçları

| Konu | Davranış |
|------|----------|
| Lineup | `participants[].lineup` null — düz seçim listesi kullan |
| Metric gizleme | `revealPolicy == GAME_END` ise seçimde metric gösterme |
| Progress | `selectionCount / capabilities.selectionCount` |
| RANDOM scope | UI'da shuffle ikonu; response'ta gerçek scope görünür |

---

## Örnek oyun kodları

| gameCode | Metrik | Açıklama |
|----------|--------|----------|
| `GOALS` | Gol | Kariyer golleri toplamı |
| `ASSISTS` | Asist | Kariyer asistleri |
| *(katalogdan)* | | `GET /game-families/TARGET_HUNT` ile güncel listeyi alın |
