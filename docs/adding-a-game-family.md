# Adding a Game Family

This guide describes how to add a new pick-N game family using the plugin architecture.

## Checklist

| Step | File | Required |
|------|------|----------|
| 1 | `src/game-engine/families/<code>/<code>.plugin.ts` | Yes |
| 2 | `prisma/catalog-seed.ts` + `npm run db:patch-catalog` | Yes |
| 3 | New metric/scope/score resolver | Only if new primitive |
| 4 | `src/client-contract/types.ts` result variant | Yes |
| 5 | Runtime/controller changes | No (pick-N modes) |

## 1. Create a plugin

Implement `GameFamilyPlugin` in `src/game-engine/contracts/game-family.plugin.ts`:

```typescript
@Injectable()
export class MyFamilyPlugin implements GameFamilyPlugin {
  readonly family = GameFamily.MY_FAMILY;
  readonly supportedActions = [GameActionType.SELECT_PLAYER];
  readonly capabilities = deriveCapabilitiesFromConfig(...);

  initializeSession(...) { ... }
  shouldRevealMetric(...) { ... }
  validateSelection(ctx) { ... }  // reuse PlayerSelectionValidator
  buildCompletion(ctx) { ... }
}
```

Register the plugin in `GameEngineModule.onModuleInit()`.

## 2. Seed catalog metadata

Add family/game rows in `prisma/catalog-seed.ts` or a declarative matrix in `prisma/catalog-matrices.ts`.

Apply targeted patches (never full `db:seed` on environments with custom media URLs):

```bash
npm run db:patch-catalog -- --only=my-family
```

## 3. Client contract

- Add a discriminated result type in `src/client-contract/types.ts`
- Map it in `ClientViewMapper.toGameResultResponse`
- Flutter reads `capabilities` from `GET /api/v1/game-families/:code`

## Architecture

- **Engine** (`game-engine`): pure plugins, registries, validation
- **Runtime** (`game-runtime`): `SessionOrchestrator` handles transactions, idempotency, persistence
- **Catalog** (`game-catalog`): localized metadata + `capabilities` manifest

Handlers must not inject `GameSessionRepository`. Action flow:

```
Controller → GameRuntimeService → SessionOrchestrator → GameFamilyPlugin
```

## i18n

- Slot labels: `GET /api/v1/meta/i18n-bundle?locale=tr`
- Session lineup `displayName` resolves via `Accept-Language`
- Stable `slotCode` for client mapping
