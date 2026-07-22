# Futz IQ — Client Integration Index

Platform-specific integration guides for the Futz IQ backend API.

## Documentation

| Resource | URL (local) |
|----------|-------------|
| **Docs hub (browser)** | http://localhost:3000/docs |
| Swagger UI | http://localhost:3000/swagger |
| OpenAPI JSON | http://localhost:3000/swagger-json |
| Health | http://localhost:3000/health |

### Platform guides

| Platform | Guide | Description |
|----------|-------|-------------|
| **Docs hub** | [/docs](/docs) | Sidebar navigation, per-page API flows with Swagger links |
| **Flutter (hub)** | [flutter-overview.md](./flutter-overview.md) | Checklist + tüm Flutter sayfalarına index |
| **Flutter (full)** | [flutter-integration.md](./flutter-integration.md) | Tek dosyalık tam rehber (EN) |
| **Flutter multiplayer** | [flutter-local-multiplayer.md](./flutter-local-multiplayer.md) | `::p1` / `::p2` header kuralları |
| **Flutter design** | [flutter-design-system.md](./flutter-design-system.md) | Renk/typography (Figma öncesi) |
| **Web (Nuxt)** | [web-integration.md](./web-integration.md) | Nuxt 3: composables, i18n routes, renderer registry |
| **i18n** | [i18n-contract.md](./i18n-contract.md) | Locale headers, translation keys, bundle endpoint |
| **Engine DX** | [adding-a-game-family.md](./adding-a-game-family.md) | Backend plugin checklist for new game modes |

Start backend:

```bash
npm run start:dev
```

## Universal concepts

### Base URL

```
http://localhost:3000        # local backend
```

### X-Participant-Id

| Header | Session routes | Catalog/Meta |
|--------|----------------|--------------|
| `Accept-Language` | Recommended (`tr` / `en`) | Recommended |
| `X-Participant-Id` | **Required** — host UUID; multiplayer action/search için `::p1`/`::p2` → [flutter-local-multiplayer.md](./flutter-local-multiplayer.md) | Not used |
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

### Draft formation (6 slots) + round scope

- Slots: `GK`, `DEF1`, `DEF2`, `MID1`, `MID2`, `ATT` — send `slotCode` on search and action
- **Scope required:** `DRAFT_CLUB` or `DRAFT_COUNTRY` on session create
- Each round assigns a random club/country — read `currentRound.entity` (id, name, logoUrl)
- Multiplayer: 2 picks per round; acting header `host::p1` / `host::p2` — [flutter-local-multiplayer.md](./flutter-local-multiplayer.md)
- See [flutter-draft-scope.md](./flutter-draft-scope.md)

## Game codes (current catalog)

| Family | Game codes | Scope |
|--------|------------|-------|
| TARGET_HUNT | `GOALS`, `ASSISTS`, … | `CAREER`, `CLUB`, `RANDOM`, … |
| DRAFT | `TALLEST_XI`, `SHORTEST_XI` | **`DRAFT_CLUB`**, **`DRAFT_COUNTRY`** (required) |

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
npm run db:update-draft-config    # Draft scope rules + 6-player formation
npm run db:patch-catalog -- --only=draft,target-hunt
```

## Legacy note

This file replaces the monolithic [frontend-integration.md](./frontend-integration.md) as the entry point. The legacy file remains for reference but **flutter-integration.md** and **web-integration.md** are the canonical platform guides.
