# Futz IQ — Web (Nuxt) Integration Guide

Complete reference for integrating the Futz IQ backend into a Nuxt 3 web app from scratch.

## Quick links

| Resource | URL (local) |
|----------|-------------|
| API base | `http://localhost:3000` |
| Integration docs | `http://localhost:3000/docs` |
| Swagger UI | `http://localhost:3000/swagger` |
| OpenAPI JSON | `http://localhost:3000/swagger-json` |
| Health | `http://localhost:3000/health` |
| Frontend (typical) | `http://localhost:3000` or `http://localhost:5173` |

Related: [i18n contract](./i18n-contract.md) · [Flutter guide](./flutter-integration.md)

---

## 1. Prerequisites

- Node.js 20+
- Nuxt 3 project (`futziq-frontend` or new)
- Backend running locally

```bash
# Backend
cd futziq-backend
npm install
npx prisma migrate deploy
npm run db:seed-random-scope
npm run db:update-draft-config
npm run start:dev
```

Ensure `.env` includes your web origin:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
PORT=3000
```

---

## 2. Architecture overview

```
┌─────────────┐   /tr, /en routes (@nuxtjs/i18n)
│  Nuxt App   │──► Accept-Language header ──► Futz IQ API
└─────────────┘   X-Participant-Id (localStorage)
       │
       ├─ pages/games/          Catalog + setup
       ├─ pages/play/[session]  Game renderer (registry pattern)
       └─ composables/useGame*  API + state
```

**Key principle:** Game setup and renderers are driven by `capabilities` from catalog, not hardcoded family checks in routes.

---

## 3. Nuxt configuration

### 3.1 Install i18n

```bash
npm install @nuxtjs/i18n
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  },
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'tr', iso: 'tr-TR', name: 'Türkçe' },
      { code: 'en', iso: 'en-US', name: 'English' },
    ],
    defaultLocale: 'tr',
    strategy: 'prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
    },
  },
});
```

```env
# .env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```

### 3.2 CORS

Backend must list your Nuxt dev server origin in `CORS_ORIGINS`. No extra proxy required if origins match.

---

## 4. API client

### 4.1 Base fetch wrapper

```typescript
// app/utils/api.ts
export type ApiError = {
  code: string
  message: string
  details: Record<string, unknown>
  traceId: string
}

export class FutziqApiError extends Error {
  constructor(public payload: ApiError) {
    super(payload.message)
    this.name = 'FutziqApiError'
  }
}

export function useApiClient() {
  const config = useRuntimeConfig()
  const { locale } = useI18n()
  const participantId = useParticipantId()

  async function request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST'
      body?: unknown
      query?: Record<string, string | number | undefined>
      session?: boolean
    } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Accept-Language': locale.value,
      'Content-Type': 'application/json',
    }

    if (options.session) {
      headers['X-Participant-Id'] = participantId.value
    }

    try {
      return await $fetch<T>(`${config.public.apiBase}${path}`, {
        method: options.method ?? 'GET',
        body: options.body,
        query: options.query,
        headers,
      })
    } catch (e: unknown) {
      const err = e as { data?: ApiError }
      if (err.data?.code) throw new FutziqApiError(err.data)
      throw e
    }
  }

  return { request }
}
```

### 4.2 Participant ID composable

```typescript
// app/composables/useParticipantId.ts
const STORAGE_KEY = 'futziq_participant_id'

export function useParticipantId() {
  const id = useState<string>('participantId', () => '')

  onMounted(() => {
    if (!import.meta.client) return
    let stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      stored = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, stored)
    }
    id.value = stored
  })

  return id
}
```

---

## 5. TypeScript types

Mirror backend `src/client-contract/types.ts`:

```typescript
// app/types/game.ts
export type GameCapabilities = {
  family: 'TARGET_HUNT' | 'DRAFT'
  requiresScope: boolean
  selectionCount: number
  slotBased: boolean
  hasTarget: boolean
  supportedActions: string[]
  playerMode: 'SINGLE' | 'MULTIPLAYER' | 'BOTH'
}

export type GameSummary = {
  id: string
  code: string
  title: string
  description: string | null
  imageUrl: string | null
  bannerImageUrl: string | null
  requiresScope: boolean
  scopes: GameScope[] | null
  capabilities: GameCapabilities
}

export type GameFamilyDetail = {
  code: string
  title: string
  catalogVersion: string
  games: GameSummary[]
}

export type DraftLineupSlot = {
  slotCode: string
  displayName: string
  line: 'GK' | 'DEF' | 'MID' | 'ATT'
  occupied: boolean
  playerId: string | null
  metricValue: number | null
  playerSnapshot: Record<string, unknown> | null
}

export type GameSession = {
  id: string
  status: string
  stateVersion: number
  targetValue: number | null
  scopeCode: string | null
  family: string
  playerMode: string
  currentTurnParticipantId: string | null
  definitionSnapshot: {
    family: string
    metric: string
    selectionCount: number
    revealPolicy: string
  }
  participants: Array<{
    id: string
    externalParticipantId: string
    selectionCount: number
    aggregateValue: number
    lineup: DraftLineupSlot[] | null
  }>
  selections: Array<{
    playerId: string
    selectionOrder: number
    slotCode: string | null
    metricValue: number | null
    revealed: boolean
    playerSnapshot: Record<string, unknown>
  }>
}

export type TargetHuntResult = {
  kind: 'TARGET_HUNT'
  targetValue: number
  aggregateValue: number
  absoluteDifference: number
  exactHit: boolean
  performanceRating: string
  selectionCount: number
  durationMs: number
}

export type DraftResult = {
  kind: 'DRAFT'
  objective: 'MAX' | 'MIN'
  aggregateValue: number
  totalMetricValue: number
  averageMetricValue: number
  lineup: DraftLineupSlot[]
  selectionCount: number
  durationMs: number
}

export type GameResult = TargetHuntResult | DraftResult
```

---

## 6. API composables

### 6.1 Catalog

```typescript
// app/composables/useGameCatalog.ts
export function useGameCatalog() {
  const { request } = useApiClient()
  const { locale } = useI18n()

  const families = () => request<GameFamilySummary[]>('/api/v1/game-families')

  const familyDetail = (code: string) =>
    request<GameFamilyDetail>(`/api/v1/game-families/${code}`)

  const cachedDetail = async (code: string) => {
    const cacheKey = `catalog:${code}:${locale.value}`
    const versionKey = `catalog-version:${code}:${locale.value}`
    const data = await familyDetail(code)
    const storedVersion = localStorage.getItem(versionKey)
    if (storedVersion !== data.catalogVersion) {
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(versionKey, data.catalogVersion)
    }
    return data
  }

  return { families, familyDetail, cachedDetail }
}
```

### 6.2 Sessions

```typescript
// app/composables/useGameSession.ts
export function useGameSession() {
  const { request } = useApiClient()

  const create = (body: {
    familyCode: string
    gameCode: string
    scopeCode?: string
    targetValue?: number
    playerMode?: 'SINGLE' | 'MULTIPLAYER'
  }) => request<GameSession>('/api/v1/game-sessions', { method: 'POST', body, session: true })

  const get = (sessionId: string) =>
    request<GameSession>(`/api/v1/game-sessions/${sessionId}`, { session: true })

  const searchPlayers = (sessionId: string, q: string, page = 1, slotCode?: string) =>
    request<PaginatedPlayers>(`/api/v1/game-sessions/${sessionId}/players`, {
      session: true,
      query: { q, page, limit: 20, slotCode },
    })

  const selectPlayer = (
    sessionId: string,
    payload: { actionId: string; expectedVersion: number; playerId: string; slotCode?: string },
  ) =>
    request<ActionResponse>(`/api/v1/game-sessions/${sessionId}/actions`, {
      method: 'POST',
      body: payload,
      session: true,
    })

  const result = (sessionId: string) =>
    request<GameResult>(`/api/v1/game-sessions/${sessionId}/result`, { session: true })

  return { create, get, searchPlayers, selectPlayer, result }
}
```

---

## 7. Error handling

```typescript
// app/utils/errors.ts
export function handleGameError(error: unknown, t: (key: string) => string) {
  if (error instanceof FutziqApiError) {
    const key = `errors.${error.payload.code}`
    const localized = t(key)
    if (error.payload.code === 'STATE_VERSION_CONFLICT') {
      return { message: localized, refresh: true }
    }
    return { message: localized, refresh: false }
  }
  return { message: t('errors.INTERNAL_ERROR'), refresh: false }
}
```

Load error strings from:

```
GET /api/v1/meta/i18n-bundle?locale=tr
```

Or duplicate keys in Nuxt i18n JSON matching `errors.{CODE}` convention from [i18n-contract.md](./i18n-contract.md).

---

## 8. Page flows

### 8.1 Lobby — `pages/index.vue`

```vue
<script setup lang="ts">
const { families } = useGameCatalog()
const { data } = await useAsyncData('families', () => families())
</script>

<template>
  <NuxtLink
    v-for="family in data"
    :key="family.code"
    :to="localePath(`/games/${family.code}`)"
  >
    {{ family.title }}
  </NuxtLink>
</template>
```

### 8.2 Setup — `pages/games/[familyCode]/index.vue`

```vue
<script setup lang="ts">
const route = useRoute()
const { cachedDetail } = useGameCatalog()
const { create } = useGameSession()

const familyCode = route.params.familyCode as string
const { data: family } = await useAsyncData(`family-${familyCode}`, () => cachedDetail(familyCode))

const selectedGame = ref<GameSummary | null>(null)
const selectedScope = ref<string | null>(null)

async function startGame() {
  if (!selectedGame.value) return
  const session = await create({
    familyCode,
    gameCode: selectedGame.value.code,
    scopeCode: selectedGame.value.requiresScope ? selectedScope.value ?? undefined : undefined,
  })
  await navigateTo(localePath(`/play/${session.id}`))
}
</script>
```

**Scope grid (Target Hunt):**

- Render `game.scopes` as cards
- If `scope.imageUrl === null` → RANDOM scope (shuffle SVG)
- On RANDOM click: `selectedScope = 'RANDOM'`
- Use `game.capabilities` for selection count hint in UI

**Draft setup:**

- Scope picker **required**: `DRAFT_CLUB` or `DRAFT_COUNTRY`
- Show `game.scopes` as cards with image + title + description
- Disable start until scope selected

See [flutter-draft-scope.md](./flutter-draft-scope.md) for full UI spec (applies to web too).
- Show `capabilities.selectionCount` (6) in subtitle

### 8.3 Play — `pages/play/[sessionId].vue`

```vue
<script setup lang="ts">
import { getRenderer } from '~/services/game-engine/renderer-registry'

const sessionId = route.params.sessionId as string
const { get } = useGameSession()
const { data: session, refresh } = await useAsyncData(`session-${sessionId}`, () => get(sessionId))

const Renderer = computed(() => getRenderer(session.value!.family))
</script>

<template>
  <component
    :is="Renderer"
    v-if="session"
    :session="session"
    @refresh="refresh"
  />
</template>
```

### 8.4 Renderer registry

```typescript
// app/services/game-engine/renderer-registry.ts
import TargetHuntRenderer from '~/components/game/TargetHuntRenderer.vue'
import DraftRenderer from '~/components/game/DraftRenderer.vue'

const registry: Record<string, Component> = {
  TARGET_HUNT: TargetHuntRenderer,
  DRAFT: DraftRenderer,
}

export function getRenderer(family: string) {
  const renderer = registry[family]
  if (!renderer) throw new Error(`No renderer for family: ${family}`)
  return renderer
}
```

Register new families here when backend adds plugins.

---

## 9. Target Hunt renderer

```vue
<!-- components/game/TargetHuntRenderer.vue -->
<script setup lang="ts">
const props = defineProps<{ session: GameSession }>()
const emit = defineEmits<{ refresh: [] }>()
const { searchPlayers, selectPlayer } = useGameSession()

const query = ref('')
const selectionCount = computed(() => props.session.definitionSnapshot.selectionCount)

async function pick(playerId: string) {
  try {
    const res = await selectPlayer(props.session.id, {
      actionId: crypto.randomUUID(),
      expectedVersion: props.session.stateVersion,
      playerId,
    })
    if (res.completed) {
      await navigateTo(localePath(`/play/${props.session.id}/result`))
    } else {
      emit('refresh')
    }
  } catch (e) {
    if (e instanceof FutziqApiError && e.payload.code === 'STATE_VERSION_CONFLICT') {
      emit('refresh')
    }
  }
}
</script>

<template>
  <div>
    <p>{{ $t('game.target') }}: {{ session.targetValue }}</p>
    <p>{{ session.participants[0].selectionCount }} / {{ selectionCount }}</p>
    <!-- player search + pick list -->
  </div>
</template>
```

---

## 10. Draft renderer

Show `session.currentRound` banner above formation:

```vue
<!-- components/game/DraftRoundBanner.vue -->
<template>
  <div v-if="round" class="round-banner">
    <img v-if="round.entity.logoUrl" :src="round.entity.logoUrl" :alt="round.entity.name" />
    <div>
      <strong>Tur {{ round.roundNumber }} / {{ round.totalRounds }}</strong>
      <p>{{ round.entity.name }}</p>
      <small>{{ round.picksInRound }} / {{ round.picksRequired }}</small>
    </div>
  </div>
</template>
```

```vue
<!-- components/game/DraftRenderer.vue -->
<script setup lang="ts">
const props = defineProps<{ session: GameSession }>()
const activeSlot = ref<string | null>(null)
const lineup = computed(() => props.session.participants[0]?.lineup ?? [])

async function pick(playerId: string) {
  if (!activeSlot.value) return
  await selectPlayer(props.session.id, {
    actionId: crypto.randomUUID(),
    expectedVersion: props.session.stateVersion,
    playerId,
    slotCode: activeSlot.value,
  })
  emit('refresh')
}
</script>

<template>
  <div class="formation">
    <button
      v-for="slot in lineup"
      :key="slot.slotCode"
      :class="{ occupied: slot.occupied, active: activeSlot === slot.slotCode }"
      @click="activeSlot = slot.occupied ? null : slot.slotCode"
    >
      <span>{{ slot.displayName }}</span>
      <span v-if="slot.occupied">{{ slot.playerSnapshot?.displayName }}</span>
    </button>
  </div>
  <!-- search with :slotCode="activeSlot" -->
</template>
```

Formation lines: group by `slot.line` (`GK`, `DEF`, `MID`, `ATT`) for CSS grid.

---

## 11. Result page

```vue
<script setup lang="ts">
const { result } = useGameSession()
const { data } = await useAsyncData(() => result(sessionId))

const isDraft = computed(() => data.value?.kind === 'DRAFT')
</script>

<template>
  <TargetHuntResultView v-if="data?.kind === 'TARGET_HUNT'" :result="data" />
  <DraftResultView v-else-if="data?.kind === 'DRAFT'" :result="data" />
</template>
```

---

## 12. RANDOM scope (web-specific UI)

In setup screen scope grid:

```vue
<img
  v-if="scope.imageUrl"
  :src="scope.imageUrl"
  :alt="scope.title"
/>
<div v-else class="random-scope-icon">
  <!-- inline SVG shuffle icon -->
</div>
```

On session create:

```typescript
await create({
  familyCode: 'TARGET_HUNT',
  gameCode: 'GOALS',
  scopeCode: 'RANDOM',  // backend resolves to CAREER, CLUB, etc.
})
```

Display resolved scope on play screen: `session.scopeCode` (not `RANDOM`).

---

## 13. API endpoint summary

| Method | Path | Auth headers | Purpose |
|--------|------|--------------|---------|
| GET | `/health` | — | Health check |
| GET | `/api/v1/meta/locales` | — | Supported locales |
| GET | `/api/v1/meta/i18n-bundle` | Accept-Language | Error/enum/slot strings |
| GET | `/api/v1/game-families` | Accept-Language | Category list |
| GET | `/api/v1/game-families/:code` | Accept-Language | Games + capabilities |
| POST | `/api/v1/game-sessions` | Both | Start game |
| GET | `/api/v1/game-sessions/:id` | Both | Session state |
| GET | `/api/v1/game-sessions/:id/players` | Both | Player search |
| POST | `/api/v1/game-sessions/:id/actions` | Both | Select player |
| GET | `/api/v1/game-sessions/:id/result` | Both | Single result |
| GET | `/api/v1/game-sessions/:id/results` | Both | Multiplayer results |
| GET | `/api/v1/game-sessions/:id/events` | Both | Event log |

---

## 14. OpenAPI / codegen

```bash
curl http://localhost:3000/swagger-json -o openapi.json
npx openapi-typescript openapi.json -o app/types/api.generated.ts
```

Swagger documents all request/response DTOs. Result endpoints use `oneOf` on `kind`.

---

## 15. SEO & i18n routes

With `strategy: 'prefix'`:

- `/tr/games/TARGET_HUNT` — Turkish catalog
- `/en/games/TARGET_HUNT` — English catalog

`useI18n().locale` drives `Accept-Language` automatically via API client.

---

## 16. Checklist

- [ ] `NUXT_PUBLIC_API_BASE` set
- [ ] Origin in backend `CORS_ORIGINS`
- [ ] `@nuxtjs/i18n` + `Accept-Language` on API calls
- [ ] `X-Participant-Id` in localStorage, sent on session routes
- [ ] Setup uses `capabilities` manifest
- [ ] RANDOM scope: `imageUrl === null`, send `scopeCode: RANDOM`
- [ ] Renderer registry per family
- [ ] Draft: `scopeCode` is `DRAFT_CLUB` or `DRAFT_COUNTRY`
- [ ] Draft: `currentRound` banner (entity logo + name)
- [ ] Draft: `slotCode` on search + action
- [ ] Result page switches on `kind`
- [ ] `STATE_VERSION_CONFLICT` → refresh session
- [ ] `catalogVersion` cache invalidation
