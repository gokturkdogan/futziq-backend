# Web (Nuxt) — Genel Bakış

Nuxt 3 / Vue 3 ile Futz IQ backend entegrasyonu.

> **Tam rehber:** [web-integration.md](./web-integration.md)  
> **Swagger:** [/swagger](/swagger)  
> **Doküman hub:** [/docs](/docs)

---

## Mimari

```
┌──────────────┐     Accept-Language + X-Participant-Id
│  Nuxt App    │────────────────────────────────────────► Futz IQ API
└──────────────┘
       │
       ├─ composables/useFutziqApi.ts
       ├─ pages/lobby, setup, game, result
       └─ stores/session.ts (Pinia)
```

Flutter ile aynı API sözleşmesi geçerlidir. Farklar platforma özgü HTTP client ve state yönetimindedir.

---

## Ortam değişkenleri

```bash
# .env
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
    },
  },
});
```

---

## Önerilen proje yapısı

```
app/
  composables/
    useFutziqApi.ts
    useParticipantId.ts
    useCatalog.ts
  pages/
    index.vue          # Lobby
    families/[code].vue
    setup/[code].vue
    game/[sessionId].vue
    result/[sessionId].vue
  components/
    game/
      TargetHuntBoard.vue
      DraftRoundBanner.vue
      DraftFormation.vue
      PlayerSearch.vue
  types/
    api.ts
```

Detay → [web-screens.md](./web-screens.md), [web-composables.md](./web-composables.md)

---

## Flutter dokümanlarıyla eşleşme

| Flutter sayfa | Nuxt karşılığı |
|---------------|----------------|
| [flutter-screens.md](./flutter-screens.md) | [web-screens.md](./web-screens.md) |
| [flutter-api-client.md](./flutter-api-client.md) | [web-composables.md](./web-composables.md) |
| [flutter-target-hunt.md](./flutter-target-hunt.md) | Aynı API akışı |
| [flutter-draft-scope.md](./flutter-draft-scope.md) | Scope picker + tur banner |
| [flutter-draft.md](./flutter-draft.md) | Aynı API akışı |

---

## Entegrasyon checklist

- [ ] `useParticipantId` — localStorage'da sabit UUID
- [ ] `$fetch` interceptor: `Accept-Language`, `X-Participant-Id`
- [ ] Setup: scope picker (`DRAFT_CLUB` / `DRAFT_COUNTRY`)
- [ ] Draft game: `currentRound` banner
- [ ] Result: `kind` discriminated union
- [ ] Hatalar: i18n bundle
