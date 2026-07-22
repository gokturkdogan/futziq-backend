# Frontend Integration Guide

Bu doküman, Futz IQ backend'inin frontend (web/mobil) uygulamasıyla entegrasyonu için gerekli tüm bilgileri içerir.

## Hızlı Başlangıç

| Kaynak | URL |
|--------|-----|
| Base URL (local) | `http://localhost:3000` |
| Swagger UI | `http://localhost:3000/api/docs` |
| OpenAPI JSON | `http://localhost:3000/api/docs-json` |
| Health check | `http://localhost:3000/health` |

Backend çalıştırma:

```bash
npm run start:dev
```

## Kimlik Doğrulama (v1 — Development)

Gerçek auth henüz yok. Geliştirme aşamasında her istekte şu header gönderilmeli:

```
X-Participant-Id: <sabit-kullanici-id>
```

- Header yoksa backend her istekte yeni bir UUID üretir (session sahipliği tutarsız olur).
- Frontend'de kullanıcı ID'sini `localStorage` veya auth provider'dan alıp **tüm** game session isteklerinde aynı değeri gönderin.
- Production'da bu header JWT/OAuth ile değiştirilecek.

## CORS

Backend `.env` içindeki `CORS_ORIGINS` ile yapılandırılır:

```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

Frontend origin'iniz bu listeye eklenmeli.

## Standart Hata Formatı

Tüm hatalar aynı yapıda döner:

```json
{
  "code": "PLAYER_NOT_ELIGIBLE",
  "message": "Selected player is not eligible for this game session.",
  "details": { "playerId": "..." },
  "traceId": "uuid"
}
```

### HTTP Status → Error Code

| HTTP | Code | Ne zaman |
|------|------|----------|
| 400 | `PLAYER_NOT_ELIGIBLE` | Oyuncu scope/metric için uygun değil |
| 400 | `SELECTION_LIMIT_REACHED` | 5 seçim doldu |
| 400 | `VALIDATION_ERROR` | Request body/query geçersiz |
| 400 | `GAME_SCOPE_REQUIRED` | Scope zorunlu ama gönderilmedi |
| 400 | `INVALID_GAME_SCOPE_COMBINATION` | Seçilen scope bu game için geçerli değil |
| 404 | `GAME_FAMILY_NOT_FOUND` | Family bulunamadı |
| 404 | `GAME_NOT_FOUND` | Game bulunamadı |
| 404 | `GAME_SESSION_NOT_FOUND` | Session yok veya participant eşleşmiyor |
| 404 | `RESULT_NOT_AVAILABLE` | Oyun henüz bitmedi |
| 409 | `STATE_VERSION_CONFLICT` | `expectedVersion` güncel değil — session'ı yeniden çek |
| 409 | `PLAYER_ALREADY_SELECTED` | Aynı oyuncu tekrar seçildi |
| 409 | `GAME_SESSION_NOT_ACTIVE` | Tamamlanmış/iptal session'a action |

### Frontend Hata Yönetimi Önerisi

```typescript
if (error.code === 'STATE_VERSION_CONFLICT') {
  // Session'ı GET ile yenile, güncel stateVersion ile tekrar dene
  const session = await fetchSession(sessionId);
  // Kullanıcıya "durum güncellendi" göster
}

if (error.code === 'PLAYER_ALREADY_SELECTED') {
  // UI'da oyuncuyu disabled göster
}
```

---

## API Endpoints

### 1. Game Families

Kategoriler sayfası için önce bu endpoint'i kullanın.

#### `GET /api/v1/game-families`

Aktif oyun kategorilerini listeler. Modlar bu endpoint'te dönmez.

**Response 200:**

```json
[
  {
    "id": "uuid",
    "code": "TARGET_HUNT",
    "title": "Hedef Avı",
    "description": "Hedef değere en yakın toplamı oluşturmak için oyuncu seç.",
    "imageUrl": "/images/families/target-hunt.png",
    "sortOrder": 1
  },
  {
    "id": "uuid",
    "code": "DRAFT",
    "title": "Kadro Kur",
    "description": "Formasyona uygun slotlara oyuncu yerleştirerek kadronu oluştur.",
    "imageUrl": "/images/families/draft.png",
    "sortOrder": 2
  }
]
```

#### `GET /api/v1/game-families/:code`

Family detayı. Her family altında `games` listesi döner. Scope gerektiren oyunlarda her game'in `scopes` listesi vardır.

**TARGET_HUNT response 200:**

```json
{
  "code": "TARGET_HUNT",
  "title": "Hedef Avı",
  "imageUrl": "/images/families/target-hunt.png",
  "games": [
    {
      "code": "GOALS",
      "title": "Gol",
      "imageUrl": "/images/games/goals.png",
      "bannerImageUrl": "/images/games/banners/goals.png",
      "requiresScope": true,
      "scopes": [
        { "code": "CAREER", "title": "Kariyer" },
        { "code": "CLUB", "title": "Kulüp" },
        { "code": "NATIONAL_TEAM", "title": "Milli Takım" },
        { "code": "WORLD_CUP", "title": "Dünya Kupası" },
        { "code": "CHAMPIONS_LEAGUE", "title": "Şampiyonlar Ligi" }
      ]
    },
    {
      "code": "ASSISTS",
      "title": "Asist",
      "requiresScope": true,
      "scopes": [{ "code": "CAREER", "title": "Kariyer" }]
    }
  ]
}
```

**DRAFT response 200:**

```json
{
  "code": "DRAFT",
  "games": [
    {
      "code": "TALLEST_XI",
      "title": "En Uzun XI",
      "imageUrl": "/images/games/tallest-xi.png",
      "bannerImageUrl": "/images/games/banners/tallest-xi.png",
      "requiresScope": false,
      "scopes": null
    }
  ]
}
```

404 → `GAME_FAMILY_NOT_FOUND`.

---

### 2. Game Sessions

Tüm session endpoint'leri `X-Participant-Id` header gerektirir.

#### `POST /api/v1/game-sessions`

Yeni oyun başlatır.

**Request:**

```json
{
  "familyCode": "TARGET_HUNT",
  "gameCode": "GOALS",
  "scopeCode": "CAREER",
  "targetValue": 500
}
```

| Alan | Açıklama |
|------|----------|
| `familyCode` | Family kodu (`TARGET_HUNT`, `DRAFT`) |
| `gameCode` | Game kodu (`GOALS`, `ASSISTS`, `TALLEST_XI` ...) |
| `scopeCode` | Scope kodu. `requiresScope=true` ise zorunlu. `RANDOM` gönderildiğinde backend oyun başında geçerli kapsamlardan birini seçer. İlk kurulum: `npm run db:seed-random-scope` (yalnızca RANDOM scope ekler, diğer katalog verisine dokunmaz) |
| `targetValue` | Opsiyonel sabit hedef. Gönderilmezse backend random üretir (Target Hunt) |

**Response 201:**

```json
{
  "id": "session-uuid",
  "status": "IN_PROGRESS",
  "stateVersion": 0,
  "targetValue": 487,
  "seed": "uuid",
  "definitionSnapshot": { /* config objesi */ },
  "startedAt": "2026-07-21T06:00:00.000Z",
  "completedAt": null,
  "expiresAt": "2026-07-22T06:00:00.000Z",
  "participants": [
    {
      "id": "participant-uuid",
      "externalParticipantId": "your-participant-id",
      "turnOrder": 0,
      "status": "ACTIVE",
      "aggregateValue": 0,
      "selectionCount": 0
    }
  ],
  "selections": []
}
```

> **Not:** `targetValue` frontend'e gösterilebilir — kullanıcı 5 oyuncunun toplam kariyer golünü bu hedefe yaklaştırmaya çalışır.

---

#### `GET /api/v1/game-sessions/:sessionId`

Güncel session state.

---

#### `GET /api/v1/game-sessions/:sessionId/players?q=ronaldo&page=1&limit=20&slotCode=LB`

Uygun oyuncu arama.

| Param | Tip | Zorunlu | Açıklama |
|-------|-----|---------|----------|
| `q` | string | Evet | Min 2 karakter, case-insensitive |
| `page` | number | Hayır | Default 1 |
| `limit` | number | Hayır | Default 20, max 50 |
| `slotCode` | string | Hayır | Draft için slot filtreleme (`GK`, `LB`, `LCB` ...) |

**Response 200:**

```json
{
  "items": [
    {
      "id": "player-id",
      "displayName": "Cristiano Ronaldo",
      "firstName": "Cristiano",
      "lastName": "Ronaldo",
      "primaryPosition": "Centre-Forward",
      "subPosition": "Centre-Forward",
      "normalizedPositions": ["ST", "CF"],
      "isActive": false,
      "alreadySelected": false
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 42,
  "totalPages": 3
}
```

- `alreadySelected: true` → UI'da disabled göster
- Kariyer golü arama sonucunda **gösterilmez** (seçimden sonra reveal edilir)
- Draft modunda `slotCode` verilirse sonuçlar hem scope/metric hem de slot pozisyon uygunluğuna göre süzülür

---

#### `POST /api/v1/game-sessions/:sessionId/actions`

Oyuncu seçimi (SELECT_PLAYER).

**Request:**

```json
{
  "actionId": "550e8400-e29b-41d4-a716-446655440000",
  "expectedVersion": 0,
  "playerId": "player-id",
  "slotCode": "LB"
}
```

| Alan | Açıklama |
|------|----------|
| `actionId` | Client tarafında üretilen UUID — idempotency için |
| `expectedVersion` | Son bilinen `stateVersion` — conflict'te 409 |
| `playerId` | Seçilen oyuncu ID'si |
| `slotCode` | Draft modunda zorunlu; oyuncunun yerleştirileceği lineup slot'u |

**Response 201:**

```json
{
  "state": {
    "sessionId": "uuid",
    "status": "IN_PROGRESS",
    "stateVersion": 1,
    "targetValue": 487,
    "selectionCount": 1,
    "aggregateValue": 128,
    "selections": [
      {
        "playerId": "...",
        "selectionOrder": 1,
        "slotCode": "LB",
        "metricValue": 128,
        "playerSnapshot": {
          "id": "...",
          "displayName": "Cristiano Ronaldo",
          "primaryPosition": "Centre-Forward"
        },
        "revealed": true
      }
    ]
  },
  "eventType": "PLAYER_SELECTED",
  "completed": false,
  "idempotentReplay": false
}
```

5. seçimden sonra:

```json
{
  "state": { "status": "COMPLETED", "selectionCount": 5, ... },
  "eventType": "GAME_COMPLETED",
  "completed": true,
  "idempotentReplay": false
}
```

**Idempotency:** Aynı `actionId` tekrar gönderilirse işlem tekrarlanmaz, `idempotentReplay: true` döner.

---

#### `GET /api/v1/game-sessions/:sessionId/events`

Event geçmişi (audit/replay için).

**Response 200:**

```json
[
  {
    "id": "uuid",
    "sequence": 1,
    "eventType": "SESSION_STARTED",
    "participantId": null,
    "payload": { "targetGenerated": true },
    "createdAt": "2026-07-21T06:00:00.000Z"
  },
  {
    "sequence": 2,
    "eventType": "PLAYER_SELECTED",
    "participantId": "uuid",
    "payload": {
      "playerId": "...",
      "selectionOrder": 1,
      "metricValue": 128,
      "aggregateValue": 128
    },
    "createdAt": "..."
  }
]
```

---

#### `GET /api/v1/game-sessions/:sessionId/result`

Oyun sonucu (yalnızca `COMPLETED` session).

**Response 200:**

```json
{
  "id": "result-uuid",
  "sessionId": "session-uuid",
  "participantId": "participant-uuid",
  "targetValue": 487,
  "aggregateValue": 512,
  "absoluteDifference": 25,
  "exactHit": false,
  "performanceRating": "EXCELLENT",
  "selectionCount": 5,
  "selections": [
    {
      "playerId": "...",
      "selectionOrder": 1,
      "metricValue": 128,
      "playerSnapshot": { "displayName": "..." }
    }
  ],
  "durationMs": 45000,
  "sessionStatus": "COMPLETED",
  "resultStatus": "FINAL"
}
```

**Performance Rating değerleri:** `PERFECT` | `EXCELLENT` | `GOOD` | `AVERAGE` | `POOR`

---

## Hedef Avı — Frontend Akışı

```
┌─────────────────┐
│  Lobby / Menu   │
└────────┬────────┘
         │ GET /game-families
         ▼
┌─────────────────┐
│  Kategoriler    │
└────────┬────────┘
         │ family seç → definitions listesi
         ▼
┌─────────────────┐
│  Oyun Seçimi    │
└────────┬────────┘
         │ POST /game-sessions
         ▼
┌─────────────────┐
│  Oyun Ekranı    │  targetValue göster
│  (5 seçim)      │◄── GET /players?q=...
└────────┬────────┘    POST /actions (×5)
         │ completed=true
         ▼
┌─────────────────┐
│  Sonuç Ekranı   │  GET /result
└─────────────────┘
```

### State Yönetimi Önerisi

```typescript
interface GameUIState {
  sessionId: string;
  stateVersion: number;
  targetValue: number;
  selections: Selection[];
  aggregateValue: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

// Her başarılı action sonrası:
state.stateVersion = response.state.stateVersion;
state.selections = response.state.selections;
state.aggregateValue = response.state.aggregateValue;

// Sonraki action için:
action.expectedVersion = state.stateVersion;
action.actionId = crypto.randomUUID();
```

### Seçim UI Kuralları

1. `selectionCount` / `definitionSnapshot.selectionCount` (5) dolunca seçim butonunu kapat
2. `alreadySelected: true` oyuncuları listede disabled göster
3. `revealPolicy: IMMEDIATE` → seçim sonrası `metricValue` anında göster
4. `aggregateValue` running total olarak göster
5. `targetValue` ile `aggregateValue` farkını canlı hesapla: `Math.abs(target - aggregate)`

## Draft — Frontend Akışı

Draft UI aynı session endpoint'lerini kullanır, fakat seçimler slot bazlıdır.

1. `GET /api/v1/game-families` ile family listele
2. `GET /api/v1/game-families/:code` ile game listesini al
3. Kullanıcı game seçer, `requiresScope=true` ise scope seçer
4. `POST /api/v1/game-sessions` ile `familyCode + gameCode + scopeCode` gönder
2. `POST /api/v1/game-sessions` ile session aç
3. `definitionSnapshot.lineupTemplate.slots` üzerinden boş slotları göster
4. Kullanıcı slot seçince `GET /players?q=...&slotCode=LB` çağır
5. `POST /actions` içinde `slotCode` gönder
6. 11 slot dolunca `GET /result`

Draft result payload içinde şunlar bulunur:

- `objective`: `MAX` veya `MIN`
- `lineupTemplate`
- `lineup`
- `totalMetricValue`
- `averageMetricValue`

---

## TypeScript Tipleri (Frontend için kopyalanabilir)

```typescript
type GameSessionStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
type PerformanceRating = 'PERFECT' | 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
type RevealPolicy = 'IMMEDIATE' | 'ROUND_END' | 'GAME_END' | 'RANGE_ONLY' | 'HIDDEN';

interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
  traceId: string;
}

interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface EligiblePlayer {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  primaryPosition: string | null;
  subPosition: string | null;
  normalizedPositions: string[];
  isActive: boolean | null;
  alreadySelected: boolean;
}

interface GameSelection {
  playerId: string;
  selectionOrder: number;
  slotCode?: string | null;
  metricValue: number | null;
  playerSnapshot: {
    id: string;
    displayName: string;
    primaryPosition?: string;
  };
  revealed: boolean;
}

interface SelectPlayerRequest {
  actionId: string;
  expectedVersion: number;
  playerId: string;
}

interface ActionResponse {
  state: {
    sessionId: string;
    status: GameSessionStatus;
    stateVersion: number;
    targetValue: number;
    selectionCount: number;
    aggregateValue: number;
    selections: GameSelection[];
  };
  eventType: 'PLAYER_SELECTED' | 'GAME_COMPLETED';
  completed: boolean;
  idempotentReplay: boolean;
}
```

---

## OpenAPI / Client Generation

Swagger'dan TypeScript client üretmek için:

```bash
# openapi-typescript
npx openapi-typescript http://localhost:3000/api/docs-json -o ./src/api/schema.d.ts

# veya orval
npx orval --input http://localhost:3000/api/docs-json --output ./src/api
```

---

## Rate Limiting

Default: 100 istek / 60 saniye. Aşılırsa HTTP 429 döner. Frontend'de retry with backoff uygulayın.

## Trace ID

Her response'da `X-Trace-Id` header döner. Hata raporlarken bu ID'yi loglayın.

---

## Eksikler (v1)

| Özellik | Durum |
|---------|-------|
| JWT / OAuth auth | ❌ `X-Participant-Id` kullanın |
| WebSocket multiplayer | ❌ REST yeterli |
| Oyuncu fotoğrafı URL | ❌ Snapshot'ta yok |
| OpenAPI response DTO'ları | ⚠️ Swagger'da kısmi — bu doküman referans |

## İlgili Dokümanlar

- [README](../README.md) — Kurulum
- [architecture.md](./architecture.md) — Backend mimarisi
- [database-discovery.md](./database-discovery.md) — Veri modeli (backend)
