# Web (Nuxt) — Composables

HTTP client ve API wrapper'lar.

> **Swagger:** [/swagger](/swagger)

---

## useParticipantId

```typescript
// composables/useParticipantId.ts
export function useParticipantId() {
  const key = 'futziq_participant_id';

  const getId = (): string => {
    if (import.meta.server) return '';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  };

  return { participantId: getId() };
}
```

---

## useFutziqApi

```typescript
// composables/useFutziqApi.ts
export function useFutziqApi() {
  const config = useRuntimeConfig();
  const { locale } = useI18n();
  const { participantId } = useParticipantId();

  const api = $fetch.create({
    baseURL: config.public.apiBaseUrl as string,
    onRequest({ options }) {
      const headers = new Headers(options.headers);
      headers.set('Accept-Language', locale.value);
      if (options.url?.includes('/game-sessions')) {
        headers.set('X-Participant-Id', participantId);
      }
      options.headers = headers;
    },
  });

  return { api };
}
```

---

## useCatalog

```typescript
export function useCatalog() {
  const { api } = useFutziqApi();

  const listFamilies = () =>
    api<GameFamilySummary[]>('/api/v1/game-families');

  const getFamily = (code: string) =>
    api<GameFamilyDetail>(`/api/v1/game-families/${code}`);

  return { listFamilies, getFamily };
}
```

---

## useSession

```typescript
export function useSession() {
  const { api } = useFutziqApi();

  const createSession = (body: CreateSessionRequest) =>
    api<GameSession>('/api/v1/game-sessions', { method: 'POST', body });

  const getSession = (sessionId: string) =>
    api<GameSession>(`/api/v1/game-sessions/${sessionId}`);

  const searchPlayers = (sessionId: string, q: string, slotCode?: string) =>
    api<PaginatedPlayers>(`/api/v1/game-sessions/${sessionId}/players`, {
      query: { q, page: 1, limit: 20, ...(slotCode && { slotCode }) },
    });

  const submitAction = (sessionId: string, body: SelectPlayerRequest) =>
    api<ActionResponse>(`/api/v1/game-sessions/${sessionId}/actions`, {
      method: 'POST',
      body,
    });

  const getResult = (sessionId: string) =>
    api<GameResult>(`/api/v1/game-sessions/${sessionId}/result`);

  const getResults = (sessionId: string) =>
    api<GameResult[]>(`/api/v1/game-sessions/${sessionId}/results`);

  return {
    createSession,
    getSession,
    searchPlayers,
    submitAction,
    getResult,
    getResults,
  };
}
```

---

## useI18nBundle

```typescript
export function useI18nBundle() {
  const { api } = useFutziqApi();
  const bundle = useState<I18nBundle | null>('i18n-bundle', () => null);

  const load = async () => {
    bundle.value = await api<I18nBundle>('/api/v1/meta/i18n-bundle');
  };

  const tError = (code: string) =>
    bundle.value?.errors[`errors.${code}`] ?? code;

  return { bundle, load, tError };
}
```

---

## Hata handling

```typescript
try {
  await submitAction(sessionId, payload);
} catch (e: unknown) {
  const err = e as { data?: { code?: string } };
  const code = err.data?.code ?? 'UNKNOWN';
  toast.error(tError(code));
  if (code === 'STATE_VERSION_CONFLICT') {
    session.value = await getSession(sessionId);
  }
}
```

Add to `types/api.ts`:

```typescript
export type DraftRoundContext = {
  roundNumber: number
  totalRounds: number
  scopeType: 'CLUB' | 'COUNTRY'
  picksInRound: number
  picksRequired: number
  entity: {
    type: 'CLUB' | 'COUNTRY'
    id: string
    name: string
    logoUrl: string | null
  }
}

export type GameSession = {
  // ...
  currentRound: DraftRoundContext | null
}
```

---

## Tam örnek

Bkz. [web-integration.md](./web-integration.md) — Nuxt plugin, Pinia store ve SSR notları.
