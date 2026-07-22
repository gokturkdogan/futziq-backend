# Futz IQ — Flutter Integration Guide

Complete reference for integrating the Futz IQ backend into a Flutter app from scratch.

## Quick links

| Resource | URL (local) |
|----------|-------------|
| API base | `http://localhost:3000` |
| Integration docs | `http://localhost:3000/docs` |
| Swagger UI | `http://localhost:3000/swagger` |
| OpenAPI JSON | `http://localhost:3000/swagger-json` |
| Health | `http://localhost:3000/health` |

Related: [i18n contract](./i18n-contract.md) · [Adding a game family](./adding-a-game-family.md)

---

## 1. Prerequisites

- Flutter 3.x+
- Backend running: `npm run start:dev` in `futziq-backend`
- Database migrated and catalog seeded (at minimum targeted scripts, not full `db:seed` if you have custom CDN URLs)

```bash
# Backend setup (once)
cd futziq-backend
npm install
npx prisma migrate deploy
npm run db:seed-random-scope    # RANDOM scope card
npm run db:update-draft-config  # 6-player draft formation
npm run start:dev
```

---

## 2. Architecture overview

```
┌──────────────┐     Accept-Language + X-Participant-Id
│ Flutter App  │────────────────────────────────────────► Futz IQ API
└──────────────┘
       │
       ├─ Catalog (capabilities-driven setup UI)
       ├─ Session (game state, optimistic concurrency)
       ├─ Player search (paginated, slot-aware for Draft)
       ├─ Actions (idempotent SELECT_PLAYER)
       └─ Results (discriminated by `kind`)
```

**Key principle:** Never hardcode `TARGET_HUNT` / `DRAFT` UI rules. Read `capabilities` from catalog and branch on `result.kind`.

---

## 3. Environment configuration

```dart
// lib/config/env.dart
abstract class Env {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
  static const defaultLocale = 'tr';
}
```

Run with custom base URL:

```bash
flutter run --dart-define=API_BASE_URL=https://api.futziq.com
```

**Android emulator:** use `http://10.0.2.2:3000` instead of `localhost`.

**iOS simulator:** `http://localhost:3000` works.

---

## 4. Required HTTP headers

Every request should include:

| Header | Required | Value |
|--------|----------|-------|
| `Accept-Language` | Recommended | `tr` or `en` (default `tr`) |
| `Content-Type` | On POST | `application/json` |
| `X-Participant-Id` | **Session routes** | Stable user/device ID |

### Participant ID (development)

Production will use JWT/OAuth. For now:

```dart
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

Future<String> getParticipantId() async {
  final prefs = await SharedPreferences.getInstance();
  var id = prefs.getString('participant_id');
  if (id == null) {
    id = const Uuid().v4();
    await prefs.setString('participant_id', id);
  }
  return id;
}
```

Send on **all** `/api/v1/game-sessions/*` requests. Without it, the backend generates a new ID per request and session ownership breaks.

---

## 5. HTTP client (Dio)

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.4.0
  uuid: ^4.0.0
  shared_preferences: ^2.2.0
```

```dart
// lib/api/futziq_client.dart
import 'package:dio/dio.dart';
import '../config/env.dart';

class FutziqClient {
  FutziqClient({
    required this.participantId,
    required this.locale,
    Dio? dio,
  }) : _dio = dio ?? Dio(BaseOptions(baseUrl: Env.apiBaseUrl)) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        options.headers['Accept-Language'] = locale;
        if (options.path.contains('/game-sessions')) {
          options.headers['X-Participant-Id'] = participantId;
        }
        handler.next(options);
      },
    ));
  }

  final Dio _dio;
  final String participantId;
  final String locale;

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) async {
    final res = await _dio.get(path, queryParameters: query);
    return res.data as T;
  }

  Future<T> post<T>(String path, {Object? data}) async {
    final res = await _dio.post(path, data: data);
    return res.data as T;
  }
}
```

---

## 6. Error handling

All errors share this JSON shape:

```json
{
  "code": "STATE_VERSION_CONFLICT",
  "message": "State version conflict. Refresh and retry.",
  "details": { "expected": 0, "actual": 1 },
  "traceId": "uuid"
}
```

```dart
class ApiException implements Exception {
  ApiException({required this.code, required this.message, this.details = const {}});
  final String code;
  final String message;
  final Map<String, dynamic> details;

  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic> && data['code'] != null) {
      return ApiException(
        code: data['code'] as String,
        message: data['message'] as String? ?? '',
        details: Map<String, dynamic>.from(data['details'] ?? {}),
      );
    }
    return ApiException(code: 'NETWORK_ERROR', message: e.message ?? 'Unknown error');
  }
}
```

### HTTP status → code mapping

| HTTP | Common codes | Flutter action |
|------|--------------|----------------|
| 400 | `PLAYER_NOT_ELIGIBLE`, `SELECTION_LIMIT_REACHED`, `NOT_YOUR_TURN` | Show localized error |
| 404 | `GAME_SESSION_NOT_FOUND`, `RESULT_NOT_AVAILABLE` | Navigate back / retry |
| 409 | `STATE_VERSION_CONFLICT` | Re-fetch session, update `stateVersion`, retry or show refresh |
| 409 | `PLAYER_ALREADY_SELECTED` | Disable player in list |

**Do not show `message` in production UI.** Load strings from i18n bundle:

```dart
final bundle = await client.get<Map<String, dynamic>>('/api/v1/meta/i18n-bundle');
final errors = bundle['errors'] as Map<String, dynamic>;
final text = errors['errors.NOT_YOUR_TURN'] ?? 'Unknown error';
```

---

## 7. Data models

Use `json_serializable` or `freezed`. Canonical types match `src/client-contract/types.ts`.

### Capabilities (from catalog)

```dart
class GameCapabilities {
  final String family;       // TARGET_HUNT | DRAFT
  final bool requiresScope;
  final int selectionCount;  // 5 or 6
  final bool slotBased;      // true = Draft
  final bool hasTarget;      // true = Target Hunt
  final List<String> supportedActions;
  final String playerMode;   // BOTH

  bool get isDraft => slotBased;
  bool get isTargetHunt => hasTarget;
}
```

### Session response

```dart
class GameSession {
  final String id;
  final String status;           // IN_PROGRESS | COMPLETED
  final int stateVersion;
  final int? targetValue;
  final String? scopeCode;
  final String family;
  final String playerMode;
  final String? currentTurnParticipantId;
  final GameDefinition definitionSnapshot;
  final List<Participant> participants;
  final List<Selection> selections;
}

class DraftLineupSlot {
  final String slotCode;       // GK, DEF1, DEF2, MID1, MID2, ATT
  final String displayName;    // localized via Accept-Language
  final String line;           // GK | DEF | MID | ATT
  final bool occupied;
  final String? playerId;
  final int? metricValue;
  final Map<String, dynamic>? playerSnapshot;
}
```

### Discriminated result

```dart
sealed class GameResult {}

class TargetHuntResult extends GameResult {
  final String kind = 'TARGET_HUNT';
  final int targetValue;
  final int aggregateValue;
  final int absoluteDifference;
  final bool exactHit;
  final String performanceRating; // PERFECT | EXCELLENT | ...
}

class DraftResult extends GameResult {
  final String kind = 'DRAFT';
  final String objective;         // MAX | MIN
  final int aggregateValue;
  final int totalMetricValue;
  final double averageMetricValue;
  final List<DraftLineupSlot> lineup;
}

GameResult parseResult(Map<String, dynamic> json) {
  switch (json['kind']) {
    case 'DRAFT':
      return DraftResult.fromJson(json);
    case 'TARGET_HUNT':
    default:
      return TargetHuntResult.fromJson(json);
  }
}
```

---

## 8. API reference

### 8.1 Meta

#### `GET /api/v1/meta/locales`

```json
{ "default": "tr", "supported": ["tr", "en"] }
```

#### `GET /api/v1/meta/i18n-bundle?locale=tr`

```json
{
  "errors": { "errors.NOT_YOUR_TURN": "Sıra sende değil" },
  "enums": { "enums.performance.PERFECT": "Mükemmel" },
  "slots": { "slots.GK": "Kaleci" }
}
```

Cache in memory; refresh on app locale change.

---

### 8.2 Catalog

#### `GET /api/v1/game-families`

Lobby categories only.

```json
[
  {
    "id": "uuid",
    "code": "TARGET_HUNT",
    "title": "Hedef Avı",
    "description": "...",
    "imageUrl": "/images/families/target-hunt.png",
    "logoUrl": null,
    "sortOrder": 1
  }
]
```

#### `GET /api/v1/game-families/:code`

Full setup data. **Cache key:** `{code}:{locale}:{catalogVersion}`.

```json
{
  "code": "TARGET_HUNT",
  "title": "Hedef Avı",
  "catalogVersion": "a1b2c3d4e5f6",
  "games": [
    {
      "code": "GOALS",
      "title": "Gol",
      "requiresScope": true,
      "capabilities": {
        "family": "TARGET_HUNT",
        "requiresScope": true,
        "selectionCount": 5,
        "slotBased": false,
        "hasTarget": true,
        "supportedActions": ["SELECT_PLAYER"],
        "playerMode": "BOTH"
      },
      "scopes": [
        { "code": "CAREER", "title": "Kariyer", "imageUrl": "..." },
        { "code": "RANDOM", "title": "Rastgele", "imageUrl": null }
      ]
    }
  ]
}
```

**RANDOM scope:** `imageUrl == null` → show shuffle icon. On session create send `scopeCode: "RANDOM"`. Response `scopeCode` will be resolved (e.g. `CAREER`).

**Draft games:** `TALLEST_XI`, `SHORTEST_XI` — `requiresScope: true`, scopes: `DRAFT_CLUB`, `DRAFT_COUNTRY`. Each round assigns random club/country via `currentRound.entity`. See [flutter-draft-scope.md](./flutter-draft-scope.md).

---

### 8.3 Sessions

#### `POST /api/v1/game-sessions`

```json
{
  "familyCode": "TARGET_HUNT",
  "gameCode": "GOALS",
  "scopeCode": "CAREER",
  "playerMode": "SINGLE",
  "targetValue": 500
}
```

| Field | Notes |
|-------|-------|
| `scopeCode` | Required when `capabilities.requiresScope` |
| `targetValue` | Optional; Target Hunt only. Omit for random target |
| `playerMode` | `SINGLE` (default) or `MULTIPLAYER` |

Response includes `stateVersion: 0`, `definitionSnapshot`, `participants[].lineup` (Draft only).

#### `GET /api/v1/game-sessions/:id`

Refresh state after `STATE_VERSION_CONFLICT` or app resume.

#### `GET /api/v1/game-sessions/:id/players?q=ronaldo&page=1&limit=20&slotCode=DEF1`

| Param | Required | Notes |
|-------|----------|-------|
| `q` | Yes | Min 2 chars |
| `page` | No | Default 1 |
| `limit` | No | Default 20, max 50 |
| `slotCode` | Draft only | `GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT` |

```json
{
  "items": [
    {
      "id": "player-id",
      "displayName": "Cristiano Ronaldo",
      "normalizedPositions": ["ST", "CF"],
      "alreadySelected": false
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 42,
  "totalPages": 3
}
```

Disable rows where `alreadySelected == true`.

#### `POST /api/v1/game-sessions/:id/actions`

```json
{
  "actionId": "550e8400-e29b-41d4-a716-446655440000",
  "expectedVersion": 0,
  "playerId": "player-id",
  "slotCode": "DEF1"
}
```

| Field | Notes |
|-------|-------|
| `actionId` | New UUID per tap (idempotency) |
| `expectedVersion` | Current `stateVersion` from session |
| `slotCode` | **Required** when `capabilities.slotBased` |

```json
{
  "state": {
    "stateVersion": 1,
    "selectionCount": 1,
    "aggregateValue": 188,
    "lineup": [ /* Draft slots */ ],
    "selections": [ /* ... */ ]
  },
  "eventType": "PLAYER_SELECTED",
  "completed": false,
  "idempotentReplay": false
}
```

When `completed: true`, navigate to result screen.

**Idempotency:** Same `actionId` → `idempotentReplay: true`, no double pick.

#### `GET /api/v1/game-sessions/:id/result`

Only when `status == COMPLETED`. Switch on `kind`.

#### `GET /api/v1/game-sessions/:id/results`

Multiplayer: all participants' results.

#### `GET /api/v1/game-sessions/:id/events`

Audit trail; optional for Flutter v1.

---

## 9. Target Hunt flow

```
1. GET /game-families
2. User picks family → GET /game-families/TARGET_HUNT
3. User picks game + scope → POST /game-sessions
4. Show targetValue + selectionCount from capabilities
5. Loop until selectionCount reached:
   a. GET /players?q=...
   b. POST /actions { actionId, expectedVersion, playerId }
   c. Update stateVersion from response
6. GET /result → kind == TARGET_HUNT
7. Show performanceRating, target vs aggregate
```

**UI hints:**
- `participants[].lineup` is `null` — use flat selection list
- `metricValue` hidden until pick if `revealPolicy == GAME_END` (check `selection.revealed`)
- Progress: `selectionCount / capabilities.selectionCount`

---

## 10. Draft flow (6 players, round-based scope)

```
1. GET /game-families/DRAFT
2. User picks TALLEST_XI or SHORTEST_XI
3. User picks scope: DRAFT_CLUB or DRAFT_COUNTRY
4. POST /game-sessions { familyCode: DRAFT, gameCode, scopeCode, playerMode }
5. Show currentRound.entity (club/country logo + name)
6. Render participants[0].lineup (6 slots)
7. User taps empty slot → activeSlotCode
8. GET /players?q=...&slotCode=GK (filtered by round entity)
9. POST /actions { ..., slotCode }
10. Update currentRound from response; on round change show new entity
11. Repeat until 6 rounds complete
12. GET /result → kind == DRAFT
```

Full scope picker UI: [flutter-draft-scope.md](./flutter-draft-scope.md)

**Formation slots:**

| slotCode | line | Position groups |
|----------|------|-----------------|
| GK | GK | Goalkeeper |
| DEF1, DEF2 | DEF | Defender |
| MID1, MID2 | MID | Midfield |
| ATT | ATT | Attack |

Use `displayName` from API (already localized). Fallback: `slots.{slotCode}` from i18n bundle.

---

## 11. Multiplayer (same device)

```json
POST /game-sessions
{ "familyCode": "TARGET_HUNT", "gameCode": "GOALS", "scopeCode": "CAREER", "playerMode": "MULTIPLAYER" }
```

- Two participants created with `turnOrder` 0 and 1
- `currentTurnParticipantId` indicates whose turn
- `NOT_YOUR_TURN` if wrong participant acts
- Players picked by either participant cannot be picked again (`alreadySelected` globally)
- Use `GET /results` for end screen

---

## 12. Caching strategy

```dart
class CatalogCache {
  final Map<String, dynamic> _cache = {};

  String key(String family, String locale, String version) =>
      '$family:$locale:$version';

  bool isStale(String family, String locale, String? storedVersion, String apiVersion) =>
      storedVersion != apiVersion;
}
```

1. Store `catalogVersion` from family detail response
2. On app start, fetch family detail; compare version
3. Invalidate cached games/scopes when version changes

---

## 13. Suggested project structure

```
lib/
  api/
    futziq_client.dart
    catalog_api.dart
    session_api.dart
  models/
    capabilities.dart
    session.dart
    result.dart
  features/
    lobby/
    setup/          # capabilities-driven
    game/
      target_hunt/
      draft/
    result/
  l10n/             # merge i18n-bundle or use ARB
```

---

## 14. OpenAPI codegen (optional)

```bash
curl http://localhost:3000/swagger-json -o openapi.json
dart run build_runner build  # with openapi_generator or similar
```

Swagger schemas match this document. Prefer `kind` discriminator for results.

---

## 15. Checklist

- [ ] Stable `X-Participant-Id` persisted
- [ ] `Accept-Language` on all requests
- [ ] Setup UI reads `capabilities`, not hardcoded family
- [ ] `actionId` = new UUID per selection attempt
- [ ] `expectedVersion` synced after every action
- [ ] Draft: `scopeCode` is `DRAFT_CLUB` or `DRAFT_COUNTRY`
- [ ] Draft: `currentRound` banner with entity logo/name
- [ ] Draft sends `slotCode` on search + action
- [ ] RANDOM scope sends `scopeCode: "RANDOM"`
- [ ] Result screen switches on `result.kind`
- [ ] Errors mapped via i18n bundle, not `message`
- [ ] `catalogVersion` cached per locale
