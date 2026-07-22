# Web (Nuxt) — Sayfa Haritası

Flutter [flutter-screens.md](./flutter-screens.md) ile aynı akış; Nuxt route karşılıkları.

---

## Route yapısı

| Route | Ekran | API |
|-------|-------|-----|
| `/` | Lobby | `GET /api/v1/game-families` |
| `/families/[code]` | Family detail | `GET /api/v1/game-families/:code` |
| `/setup/[code]` | Oyun kurulumu | Katalog verisi (client cache) |
| `/game/[sessionId]` | Oyun ekranı | `GET/POST .../players`, `POST .../actions` |
| `/result/[sessionId]` | Sonuç | `GET .../result` veya `.../results` |

---

## Lobby (`pages/index.vue`)

```vue
<script setup lang="ts">
const { listFamilies } = useCatalog();
const { data: families } = await useAsyncData('families', () => listFamilies());
</script>

<template>
  <div class="grid">
    <NuxtLink
      v-for="family in families"
      :key="family.code"
      :to="`/families/${family.code}`"
      class="card"
    >
      <h2>{{ family.title }}</h2>
      <p>{{ family.description }}</p>
    </NuxtLink>
  </div>
</template>
```

**Swagger:** [game-families → list](/swagger)

---

## Family detail (`pages/families/[code].vue`)

- `GET /api/v1/game-families/:code`
- Oyun kartları → `/setup/:code?game=GOALS`

---

## Setup (`pages/setup/[code].vue`)

Query: `?game=GOALS`

**Dinamik form (`capabilities`):**
- `requiresScope` + Target Hunt → scope radio (`CAREER`, `RANDOM` shuffle)
- `requiresScope` + Draft → **DraftScopePicker** (`DRAFT_CLUB`, `DRAFT_COUNTRY`) — [flutter-draft-scope.md](./flutter-draft-scope.md)
- `hasTarget` → target number input
- `playerMode` → SINGLE / MULTIPLAYER toggle

**Draft scope picker:**

```vue
<template>
  <div v-if="game.requiresScope && familyCode === 'DRAFT'" class="scope-grid">
    <button
      v-for="scope in game.scopes"
      :key="scope.code"
      :class="{ active: selectedScope === scope.code }"
      @click="selectedScope = scope.code"
    >
      <img v-if="scope.imageUrl" :src="scope.imageUrl" :alt="scope.title" />
      <span>{{ scope.title }}</span>
      <small>{{ scope.description }}</small>
    </button>
  </div>
</template>
```

**Submit:**

```typescript
const session = await createSession({
  familyCode: code,
  gameCode: selectedGame,
  scopeCode: selectedScope,  // DRAFT_CLUB | DRAFT_COUNTRY
  playerMode,
});
```

**Swagger:** [POST /api/v1/game-sessions](/swagger)

---

## Game (`pages/game/[sessionId].vue`)

```vue
<template>
  <DraftRoundBanner v-if="session.currentRound" :round="session.currentRound" />
  <TargetHuntBoard v-if="!capabilities.slotBased" :session="session" />
  <DraftFormation v-else :session="session" />
</template>
```

`currentRound.entity` — tur kulübü/ülkesi logo + isim banner.

---

## Result (`pages/result/[sessionId].vue`)

```vue
<script setup lang="ts">
const result = await getResult(sessionId);
</script>

<template>
  <TargetHuntResult v-if="result.kind === 'TARGET_HUNT'" :result="result" />
  <DraftResult v-else-if="result.kind === 'DRAFT'" :result="result" />
</template>
```

**Swagger:** [GET .../result](/swagger)

---

## PlayerSearch component

```vue
<script setup lang="ts">
const q = ref('');
const debouncedQ = useDebounceFn(async () => {
  if (q.value.length < 2) return;
  players.value = await searchPlayers(sessionId, q.value, slotCode);
}, 300);
</script>
```

Draft'ta `slotCode` prop zorunlu.
