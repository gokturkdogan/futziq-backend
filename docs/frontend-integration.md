# Futz IQ — Client Integration Index

Platform-specific integration guides for the Futz IQ backend API.

## Documentation

| Platform | Guide | Description |
|----------|-------|-------------|
| **Flutter** | [flutter-integration.md](./flutter-integration.md) | Mobile app: Dio client, models, Target Hunt & Draft flows, caching |
| **Web (Nuxt)** | [web-integration.md](./web-integration.md) | Nuxt 3: composables, i18n routes, renderer registry, RANDOM scope UI |
| **i18n** | [i18n-contract.md](./i18n-contract.md) | Locale headers, translation keys, bundle endpoint |
| **Engine DX** | [adding-a-game-family.md](./adding-a-game-family.md) | Backend plugin checklist for new game modes |

## API reference (Swagger)

| Resource | URL (local) |
|----------|-------------|
| Swagger UI | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs-json |
| Health | http://localhost:3000/health |

Start backend:

```bash
npm run start:dev
```

## Universal concepts

### Base URL

```
http://localhost:3000        # local backend
```

### Required headers

| Header | Session routes | Catalog/Meta |
|--------|----------------|--------------|
| `Accept-Language` | Recommended (`tr` / `en`) | Recommended |
| `X-Participant-Id` | **Required** (stable user ID) | Not used |
| `Content-Type: application/json` | On POST | On POST |

### Error format

```json
{
  "code": "PLAYER_NOT_ELIGIBLE",
  "message": "English debug message",
  "details": {},
  "traceId": "uuid"
}
```

Map `code` to localized strings — never show `message` in production UI.

### Capabilities manifest

Every game in `GET /api/v1/game-families/:code` includes:

```json
{
  "capabilities": {
    "family": "TARGET_HUNT",
    "requiresScope": true,
    "selectionCount": 5,
    "slotBased": false,
    "hasTarget": true,
    "supportedActions": ["SELECT_PLAYER"],
    "playerMode": "BOTH"
  }
}
```

Build setup UI from this — do not hardcode family behavior.

### Discriminated results

```typescript
// result.kind === 'TARGET_HUNT' | 'DRAFT'
```

### RANDOM scope

- Catalog scope with `imageUrl: null` is RANDOM
- Send `scopeCode: "RANDOM"` on session create
- Response `scopeCode` is the resolved code (`CAREER`, etc.)

### Draft formation (6 slots)

`GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT` — send `slotCode` on search and action.

## Game codes (current catalog)

| Family | Game codes | Scope |
|--------|------------|-------|
| TARGET_HUNT | `GOALS`, `ASSISTS`, `APPEARANCES`, `MINUTES`, `YELLOW_CARDS`, `RED_CARDS` | Required (`CAREER`, `CLUB`, …, `RANDOM`) |
| DRAFT | `TALLEST_XI`, `SHORTEST_XI` | Not required |

## Endpoint overview

```
GET  /health
GET  /api/v1/meta/locales
GET  /api/v1/meta/i18n-bundle
GET  /api/v1/meta/enums
GET  /api/v1/game-families
GET  /api/v1/game-families/:code
POST /api/v1/game-sessions
GET  /api/v1/game-sessions/:id
GET  /api/v1/game-sessions/:id/players
POST /api/v1/game-sessions/:id/actions
GET  /api/v1/game-sessions/:id/events
GET  /api/v1/game-sessions/:id/result
GET  /api/v1/game-sessions/:id/results
```

Full request/response schemas: **Swagger UI** or platform guides above.

## Database scripts (targeted)

Do **not** run full `db:seed` on environments with custom CDN media URLs.

```bash
npm run db:seed-random-scope      # RANDOM scope only
npm run db:update-draft-config    # 6-player draft formation
npm run db:patch-catalog -- --only=draft,target-hunt
```

## Legacy note

This file replaces the monolithic [frontend-integration.md](./frontend-integration.md) as the entry point. The legacy file remains for reference but **flutter-integration.md** and **web-integration.md** are the canonical platform guides.
