# Futz IQ Backend

Production-oriented modular monolith backend for **Futz IQ** — a football knowledge and strategy game platform.

## Features (v1)

- **Target Hunt** (`TARGET_HUNT`) game family with multiple metric-based closest-to-target modes
- **Draft** (`DRAFT`) game family with slot-based lineup building on configurable formations
- Extensible game engine (metric/scope/family/target/score registries)
- Session lifecycle with optimistic concurrency and idempotent actions
- Immutable definition snapshots and selection metric snapshots
- REST API with OpenAPI/Swagger
- PostgreSQL via Prisma ORM
- Redis-ready abstraction (no-op default)

## Architecture

See [docs/architecture.md](./docs/architecture.md) and [docs/database-discovery.md](./docs/database-discovery.md).

```
src/
├── common/           # Errors, pagination, security, logging
├── football-data/    # Player read adapters
├── game-catalog/     # Families, games, scopes catalog
├── game-engine/      # Pure engine: metrics, scopes, targeting, families
├── game-runtime/     # Sessions, actions, events, results
└── health/
```

## Prerequisites

- Node.js LTS (20+)
- PostgreSQL (Neon or local via Docker Compose)
- npm

## Setup

```bash
npm install
cp .env.example .env
# Set DATABASE_URL in .env (never commit .env)
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

### Local PostgreSQL (optional)

```bash
docker compose up -d postgres
# DATABASE_URL=postgresql://futziq:futziq@localhost:5432/futziq
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Optional Redis URL (not required in v1) |
| `PORT` | HTTP port (default 3000) |
| `NODE_ENV` | `development` / `production` / `test` |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `RATE_LIMIT_TTL` | Rate limit window (seconds) |
| `RATE_LIMIT_LIMIT` | Max requests per window |
| `SESSION_EXPIRY_HOURS` | Session TTL (default 24) |

## Scripts

```bash
npm run build
npm run start:dev
npm run test
npm run test:e2e
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
```

## API Documentation

| Resource | URL (local) |
|----------|-------------|
| Integration docs (browser) | http://localhost:3000/docs |
| Swagger UI | http://localhost:3000/swagger |
| OpenAPI JSON | http://localhost:3000/swagger-json |

### Vercel deployment

Uses [Vercel zero-config NestJS](https://vercel.com/docs/frameworks/backend/nestjs): entrypoint `src/main.ts`, build via `npm run vercel-build`. `/docs` and `/swagger` work after deploy.

**Vercel dashboard settings:**
- Framework Preset: **NestJS** (or auto-detect)
- Output Directory: **empty** (do not set `public`)
- Build Command: leave empty (uses `vercel.json`)

Required env vars: `DATABASE_URL`, `CORS_ORIGINS`

**Client integration:**

| Platform | Guide |
|----------|-------|
| Docs hub (browser) | http://localhost:3000/docs |
| Index | [docs/frontend-integration.md](./docs/frontend-integration.md) |
| Flutter | [docs/flutter-integration.md](./docs/flutter-integration.md) |
| Web (Nuxt) | [docs/web-integration.md](./docs/web-integration.md) |
| i18n | [docs/i18n-contract.md](./docs/i18n-contract.md) |

## Game Families API

```bash
# Kategoriler sayfası
curl http://localhost:3000/api/v1/game-families

# Family detayı (mod listesi)
curl http://localhost:3000/api/v1/game-families/TARGET_HUNT
```

Development auth: send `X-Participant-Id` header (auto-generated UUID if omitted).

## Catalog Model

```
GameFamily (TARGET_HUNT, DRAFT)
  └── Game (GOALS, ASSISTS, TALLEST_XI, ...)
        └── Scope (CAREER, CLUB, NATIONAL_TEAM, WORLD_CUP, CHAMPIONS_LEAGUE)
```

Scope, oyun başlatılırken frontend tarafından seçilir.

## Target Hunt API Flow

```bash
# 1. List families
curl http://localhost:3000/api/v1/game-families

# 2. Family detail (games + available scopes)
curl http://localhost:3000/api/v1/game-families/TARGET_HUNT

# 3. Create session (scope seçimi burada)
curl -X POST http://localhost:3000/api/v1/game-sessions \
  -H "Content-Type: application/json" \
  -H "X-Participant-Id: player-1" \
  -d '{"familyCode":"TARGET_HUNT","gameCode":"GOALS","scopeCode":"CAREER"}'

# 4. Search players
curl "http://localhost:3000/api/v1/game-sessions/{sessionId}/players?q=ronaldo" \
  -H "X-Participant-Id: player-1"

# 5. Select player (repeat 5 times)
curl -X POST http://localhost:3000/api/v1/game-sessions/{sessionId}/actions \
  -H "Content-Type: application/json" \
  -H "X-Participant-Id: player-1" \
  -d '{"actionId":"uuid","expectedVersion":0,"playerId":"..."}'

# 6. Get result
curl http://localhost:3000/api/v1/game-sessions/{sessionId}/result \
  -H "X-Participant-Id: player-1"
```

## Draft API Flow

```bash
# 1. Family detail (scope listesi)
curl http://localhost:3000/api/v1/game-families/DRAFT

# 2. Create Draft session (scope zorunlu)
curl -X POST http://localhost:3000/api/v1/game-sessions \
  -H "Content-Type: application/json" \
  -H "X-Participant-Id: player-1" \
  -d '{"familyCode":"DRAFT","gameCode":"TALLEST_XI","scopeCode":"DRAFT_CLUB"}'

# Yanıt: currentRound.entity (tur 1 kulübü/ülkesi)

# 3. Search (otomatik scope filtresi)
curl "http://localhost:3000/api/v1/game-sessions/{sessionId}/players?q=an&slotCode=GK" \
  -H "X-Participant-Id: player-1"

# 4. Select into slot (her tur)
curl -X POST http://localhost:3000/api/v1/game-sessions/{sessionId}/actions \
  -H "Content-Type: application/json" \
  -H "X-Participant-Id: player-1" \
  -d '{"actionId":"uuid","expectedVersion":0,"playerId":"...","slotCode":"GK"}'
```

Tam sözleşme: [/docs/flutter-draft-scope](/docs/flutter-draft-scope) · `npm run db:update-draft-config`

## Extending the Engine

### Add a Metric

1. Create `MetricResolver` in `src/game-engine/metrics/`
2. Register in `GameEngineModule.onModuleInit()`
3. Reference metric code in game definition config

### Add a Scope

1. Create `ScopeResolver` in `src/game-engine/scopes/`
2. Register in `GameEngineModule`
3. Add scope code to `ScopeCode` enum and definition config

### Add a Game Definition

1. Define config JSON (see `DEFAULT_TARGET_HUNT_CONFIG`)
2. Seed via `prisma/seed.ts` or admin script
3. Version automatically on updates

### Add a Game Family

1. Implement `GameFamilyHandler`
2. Register in `GameFamilyRegistry`
3. Add target generators / validators as needed

## Security Notes

- Helmet, CORS, rate limiting, request size limits
- Trace IDs on every request
- No production stack traces in API responses
- `DATABASE_URL` never logged or committed
- Scores/targets computed server-side only
- Development identity via header — replace with real auth in production

## Known Gaps

- Real authentication/authorization
- WebSocket multiplayer
- Redis caching implementation
- `pg_trgm` full-text search indexes (planned)
- Additional game families and scopes

## Multiplayer Roadmap

- `game_participants.turn_order` already modeled
- Shared target per session
- Turn-based action validation in family handler
- WebSocket gateway for real-time play (future)

## License

UNLICENSED — private project.
