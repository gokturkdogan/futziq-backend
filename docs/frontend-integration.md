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

## Lokalizasyon (i18n)

Katalog metinleri (`title`, `description`) locale'e göre döner. URL'de locale yok; API header kullanır:

```
Accept-Language: tr
```

Desteklenen değerler: `tr`, `en` (varsayılan: `tr`).

| Endpoint | Lokalize |
|----------|----------|
| `GET /api/v1/game-families` | Evet |
| `GET /api/v1/game-families/:code` | Evet (games, scopes) |
| `GET /api/v1/meta/locales` | Desteklenen locale listesi |
| Session / action / result | Hayır — sayılar ve kodlar |

Detaylı sözleşme: [i18n-contract.md](./i18n-contract.md).

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
| 400 | `SELECTION_LIMIT_REACHED` | `definitionSnapshot.selectionCount` doldu (Target Hunt: 5, Draft: 6) |
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
        { "code": "CAREER", "title": "Kariyer", "imageUrl": "..." },
        { "code": "CLUB", "title": "Kulüp", "imageUrl": "..." },
        { "code": "NATIONAL_TEAM", "title": "Milli Takım", "imageUrl": "..." },
        { "code": "WORLD_CUP", "title": "Dünya Kupası", "imageUrl": "..." },
        { "code": "CHAMPIONS_LEAGUE", "title": "Şampiyonlar Ligi", "imageUrl": "..." },
        { "code": "RANDOM", "title": "Rastgele", "imageUrl": null }
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
      "title": "En Uzun 6",
      "imageUrl": "/images/games/tallest-xi.png",
      "bannerImageUrl": "/images/games/banners/tallest-xi.png",
      "requiresScope": false,
      "scopes": null
    },
    {
      "code": "SHORTEST_XI",
      "title": "En Kısa 6",
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
  "targetValue": 500,
  "playerMode": "SINGLE"
}
```

| Alan | Açıklama |
|------|----------|
| `familyCode` | Family kodu (`TARGET_HUNT`, `DRAFT`) |
| `gameCode` | Game kodu (`GOALS`, `ASSISTS`, `TALLEST_XI`, `SHORTEST_XI` ...) |
| `scopeCode` | Scope kodu. `requiresScope=true` ise zorunlu. `RANDOM` gönderildiğinde backend oyun başında geçerli kapsamlardan birini seçer; yanıtta `scopeCode` çözülmüş gerçek kod olur (`CAREER` vb.). İlk kurulum: `npm run db:seed-random-scope` |
| `targetValue` | Opsiyonel sabit hedef (yalnızca Target Hunt). Gönderilmezse backend random üretir |
| `playerMode` | `SINGLE` (varsayılan) veya `MULTIPLAYER` — aynı ekranda sırayla oynama |

**Response 201:**

```json
{
  "id": "session-uuid",
  "status": "IN_PROGRESS",
  "stateVersion": 0,
  "targetValue": 487,
  "seed": "uuid",
  "scopeCode": "CAREER",
  "playerMode": "SINGLE",
  "currentTurnParticipantId": "participant-uuid",
  "definitionSnapshot": {
    "family": "TARGET_HUNT",
    "metric": "CAREER_GOALS",
    "selectionCount": 5,
    "revealPolicy": "IMMEDIATE"
  },
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
      "selectionCount": 0,
      "lineup": null
    }
  ],
  "selections": []
}
```

> **Notlar:**
> - `scopeCode`: Target Hunt'ta çözülmüş kapsam. `RANDOM` seçildiyse `CAREER` gibi gerçek kod döner.
> - `targetValue`: Target Hunt'ta gösterilir. Draft'ta `0` veya `null` olabilir — sonuç için `aggregateValue` kullanın.
> - `participants[].lineup`: Yalnızca Draft'ta dolu array; Target Hunt'ta `null`.

---

#### `GET /api/v1/game-sessions/:sessionId`

Güncel session state.

---

#### `GET /api/v1/game-sessions/:sessionId/players?q=ronaldo&page=1&limit=20&slotCode=DEF1`

Uygun oyuncu arama.

| Param | Tip | Zorunlu | Açıklama |
|-------|-----|---------|----------|
| `q` | string | Evet | Min 2 karakter, case-insensitive |
| `page` | number | Hayır | Default 1 |
| `limit` | number | Hayır | Default 20, max 50 |
| `slotCode` | string | Hayır | Draft için slot filtreleme (`GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT`) |

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
  "slotCode": "DEF1"
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
    "lineup": [
      {
        "slotCode": "GK",
        "displayName": "Goalkeeper",
        "line": "GK",
        "occupied": false,
        "playerId": null,
        "metricValue": null,
        "playerSnapshot": null
      },
      {
        "slotCode": "DEF1",
        "displayName": "Defender",
        "line": "DEF",
        "occupied": true,
        "playerId": "...",
        "metricValue": 188,
        "playerSnapshot": { "displayName": "...", "heightCm": 188 }
      }
    ],
    "selections": [
      {
        "playerId": "...",
        "selectionOrder": 1,
        "slotCode": "DEF1",
        "metricValue": 188,
        "playerSnapshot": {
          "id": "...",
          "displayName": "...",
          "primaryPosition": "Defender",
          "heightCm": 188
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

Target Hunt'ta `lineup` `null` olabilir. Tamamlanma eşiği `definitionSnapshot.selectionCount` ile belirlenir (Target Hunt: 5, Draft: 6).

5. seçimden sonra (Target Hunt örneği):

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

**Target Hunt response 200:**

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

**Draft response 200** (ek alanlar):

```json
{
  "aggregateValue": 1092,
  "selectionCount": 6,
  "objective": "MAX",
  "totalMetricValue": 1092,
  "averageMetricValue": 182,
  "performanceRating": "AVERAGE",
  "lineupTemplate": {
    "code": "FORMATION_1_2_2_1",
    "name": "1-2-2-1",
    "slots": [{ "code": "GK", "displayName": "Goalkeeper", "line": "GK" }]
  },
  "lineup": [
    {
      "slotCode": "GK",
      "displayName": "Goalkeeper",
      "line": "GK",
      "occupied": true,
      "playerId": "...",
      "metricValue": 198,
      "playerSnapshot": { "displayName": "...", "heightCm": 198 }
    }
  ],
  "selections": [
    {
      "playerId": "...",
      "selectionOrder": 1,
      "slotCode": "GK",
      "metricValue": 198,
      "playerSnapshot": { "displayName": "..." }
    }
  ],
  "sessionStatus": "COMPLETED",
  "resultStatus": "FINAL"
}
```

> Draft'ta `targetValue` / `performanceRating` / `absoluteDifference` anlamlı değildir; UI'da `aggregateValue` (toplam boy) ve `objective` (`MAX` = en uzun, `MIN` = en kısa) kullanın.

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

Draft UI aynı session endpoint'lerini kullanır. Backend 6 slotlu `1-2-2-1` formasyonunu (`GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT`) ve pozisyon eşlemesini sağlar; client yalnızca API yanıtlarını render eder.

1. `GET /api/v1/game-families/DRAFT` ile oyunları al (`requiresScope: false`)
2. `POST /api/v1/game-sessions` → `{ "familyCode": "DRAFT", "gameCode": "TALLEST_XI" }`
3. Session yanıtında:
   - `definitionSnapshot.lineupTemplate.slots` — slot listesi (`line`: `GK|DEF|MID|ATT`)
   - `participants[].lineup` — her slot için `occupied`, `playerId`, `metricValue`, `playerSnapshot`
4. Slot seçilince `GET /players?q=...&slotCode=DEF1`
5. `POST /actions` → `{ actionId, expectedVersion, playerId, slotCode }`
6. Action state'te `lineup` güncellenmiş gelir
7. 6 slot dolunca `GET /result` → `lineup`, `objective`, `totalMetricValue`, `averageMetricValue`

**DB config güncelleme (tam seed değil):**

```bash
npm run db:update-draft-config
```

Sadece `games.config` JSON'unu günceller; görseller ve diğer katalog alanlarına dokunmaz.

### Draft slot referansı

| slotCode | line | Kabul edilen DB mevkileri (örnek) |
|----------|------|-----------------------------------|
| `GK` | GK | Goalkeeper |
| `DEF1`, `DEF2` | DEF | Defender, Centre-Back, Left-Back, Right-Back |
| `MID1`, `MID2` | MID | Midfield, Central Midfield, Defensive Midfield, Attacking Midfield |
| `ATT` | ATT | Attack, Centre-Forward, Left Winger, Right Winger |

UI formasyonu `participants[].lineup` veya `definitionSnapshot.lineupTemplate.slots` üzerinden çizilir; pozisyon eşlemesi client'ta yapılmaz.

---

## TypeScript Tipleri (Frontend için kopyalanabilir)

```typescript
type GameSessionStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
type PlayerMode = 'SINGLE' | 'MULTIPLAYER';
type PerformanceRating = 'PERFECT' | 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
type DraftLineCode = 'GK' | 'DEF' | 'MID' | 'ATT';
type DraftObjective = 'MAX' | 'MIN';

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

interface GameScopeSummary {
  code: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

interface GameSummary {
  code: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  requiresScope: boolean;
  scopes: GameScopeSummary[] | null;
}

interface LineupSlotDefinition {
  code: string;
  displayName: string;
  line?: DraftLineCode;
  acceptedPositionGroups: string[];
}

interface LineupTemplate {
  code: string;
  name: string;
  slots: LineupSlotDefinition[];
}

interface DraftLineupSlot {
  slotCode: string;
  displayName: string;
  line: DraftLineCode;
  occupied: boolean;
  playerId: string | null;
  metricValue: number | null;
  playerSnapshot: Record<string, unknown> | null;
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

interface GameDefinitionSnapshot {
  family: 'TARGET_HUNT' | 'DRAFT';
  metric: string;
  selectionCount: number;
  revealPolicy: string;
  objective?: DraftObjective;
  lineupTemplate?: LineupTemplate;
}

interface GameParticipant {
  id: string;
  externalParticipantId: string;
  turnOrder: number;
  status: string;
  aggregateValue: number;
  selectionCount: number;
  lineup: DraftLineupSlot[] | null;
}

interface GameSelection {
  playerId: string;
  selectionOrder: number;
  slotCode?: string | null;
  metricValue: number | null;
  playerSnapshot: Record<string, unknown>;
  revealed: boolean;
}

interface GameSession {
  id: string;
  status: GameSessionStatus;
  stateVersion: number;
  targetValue: number | null;
  seed: string;
  scopeCode: string | null;
  playerMode: PlayerMode;
  currentTurnParticipantId: string | null;
  definitionSnapshot: GameDefinitionSnapshot;
  participants: GameParticipant[];
  selections: GameSelection[];
}

interface SelectPlayerRequest {
  actionId: string;
  expectedVersion: number;
  playerId: string;
  slotCode?: string; // Draft'ta zorunlu
}

interface ActionState {
  sessionId: string;
  status: GameSessionStatus;
  stateVersion: number;
  targetValue: number | null;
  selectionCount: number;
  aggregateValue: number;
  playerMode?: PlayerMode;
  currentTurnParticipantId?: string | null;
  lineup?: DraftLineupSlot[] | null;
  selections: GameSelection[];
}

interface ActionResponse {
  state: ActionState;
  eventType: 'PLAYER_SELECTED' | 'GAME_COMPLETED';
  completed: boolean;
  idempotentReplay: boolean;
}

interface GameResult {
  id: string;
  sessionId: string;
  participantId: string;
  targetValue: number;
  aggregateValue: number;
  absoluteDifference: number;
  exactHit: boolean;
  performanceRating: PerformanceRating | string;
  selectionCount: number;
  selections: Array<{
    playerId: string;
    selectionOrder: number;
    slotCode?: string | null;
    metricValue: number;
    playerSnapshot: Record<string, unknown>;
  }>;
  durationMs: number;
  sessionStatus: string;
  resultStatus: string;
  // Draft-only (Target Hunt'ta null/undefined olabilir)
  objective?: DraftObjective | null;
  lineupTemplate?: LineupTemplate | null;
  lineup?: DraftLineupSlot[] | null;
  totalMetricValue?: number | null;
  averageMetricValue?: number | null;
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
| WebSocket multiplayer | ❌ REST + `playerMode: MULTIPLAYER` yeterli |
| Oyuncu fotoğrafı URL | ❌ Snapshot'ta yok |
| OpenAPI response DTO'ları | ⚠️ Swagger'da kısmi — bu doküman + `api/docs-json` referans |

## İlgili Dokümanlar

- [README](../README.md) — Kurulum ve hızlı API örnekleri
- [i18n-contract.md](./i18n-contract.md) — Locale, katalog çevirileri, Flutter sözleşmesi
- [architecture.md](./architecture.md) — Backend mimarisi
- [database-discovery.md](./database-discovery.md) — Veri modeli (pozisyon, boy metrikleri)
