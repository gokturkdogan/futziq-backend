# Architecture Decisions

## Style: Modular Monolith

Single deployable NestJS application with bounded modules. No microservices at this stage.

## Layers per Module

```
presentation  → HTTP controllers, DTOs, Swagger decorators
application   → Use cases, orchestration, transaction boundaries
domain        → Entities, value objects, domain services, ports (interfaces)
infrastructure → Prisma repositories, Redis adapters, external integrations
```

Dependency rule: inner layers never import outer layers. Infrastructure implements domain/application ports.

## Game Engine Extensibility

### Registry Pattern

| Registry | Registration | Extension |
|----------|-------------|-----------|
| `MetricRegistry` | `CAREER_GOALS` | Add `MetricResolver` implementation |
| `ScopeRegistry` | `GLOBAL_FREE` | Add `ScopeResolver` implementation |
| `GameFamilyRegistry` | `TARGET_HUNT` | Add `GameFamilyHandler` implementation |
| `TargetGeneratorRegistry` | `DATA_DISTRIBUTION`, `RANDOM_RANGE`, `FIXED` | Add `TargetGenerator` implementation |
| `ScoreCalculatorRegistry` | `CLOSEST_SUM` | Add `ScoreCalculator` implementation |
| `PerformanceRatingService` | Configurable thresholds | Adjust via game definition config |

No switch/if-else chains in the engine core. Handlers are resolved by code from registries at runtime.

### Immutable Definition Snapshot

When a session is created:
1. Load active `GameDefinitionVersion`
2. Validate and normalize config into a typed snapshot
3. Persist snapshot JSON on `game_sessions.definition_snapshot`
4. FK to `game_definition_version_id` for audit

Sessions never re-read mutable definition config at runtime.

### Action / Event Sourcing Lite

- Commands arrive as `game_actions` with client `actionId` (idempotency key)
- Successful processing emits `game_events` with monotonic `sequence`
- State is derived from events + selections; `state_version` on session for optimistic concurrency
- HTTP 409 on version mismatch

### Concurrency

- PostgreSQL transactions with `SELECT ... FOR UPDATE` on session row
- Unique constraints: `(game_session_id, action_id)`, `(game_session_id, participant_id, player_id)`
- `state_version` incremented atomically per successful action

### Target Generation

`DataDistributionTargetGenerator`:
1. Query eligible player goal distribution for scope
2. Compute realistic N-player sum bounds from percentiles
3. Generate target using seeded PRNG within bounds
4. Deterministic: same `seed` + definition version → same target

### Auth (Development)

`X-Participant-Id` header via `DevelopmentIdentityProvider`. Production will swap to JWT/OAuth via `IdentityProvider` port.

### Redis

`RedisClient` port with `NoOpRedisClient` default. Ready for caching player search and session state without code changes in consumers.

## Module Boundaries

| Module | Responsibility |
|--------|----------------|
| `football-data` | Player read repositories, search |
| `game-catalog` | Game definitions and versions |
| `game-engine` | Pure domain: metrics, scopes, targeting, scoring, family handlers |
| `game-runtime` | Sessions, actions, events, selections, results |
| `health` | Liveness/readiness |
| `common` | Errors, pagination, security, validation |

## Multiplayer Readiness

- `game_participants` supports multiple rows per session with `turn_order`
- Single-player creates one participant automatically
- Handler validates turn order (single-player: always current participant's turn)
- Socket layer deferred; REST API sufficient for v1

## Testing Strategy

| Layer | Scope |
|-------|-------|
| Unit | Pure domain services (target gen, scoring, rating, validators) |
| Integration | Prisma repositories against test DB |
| E2E | Full HTTP Target Hunt flow |

Test DB uses separate `DATABASE_URL` or schema; never writes to production data during tests.
