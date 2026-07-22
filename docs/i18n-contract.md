# Futz IQ — i18n Contract

This document defines how localization works across **backend API**, **Nuxt web**, and the future **Flutter app**.

## Supported locales

| Code | BCP 47   | Default |
|------|----------|---------|
| `tr` | `tr-TR`  | Yes     |
| `en` | `en-US`  | No      |

Metadata endpoint:

```
GET /api/v1/meta/locales
→ { "default": "tr", "supported": ["tr", "en"] }
```

## API locale resolution

Locale is **never** part of the REST path (`/api/v1/en/...` is invalid).

Priority:

1. `?locale=en` query (optional, debug/cache)
2. `Accept-Language` header
3. Default `tr`

Invalid values fall back to `tr`.

### Example

```http
GET /api/v1/game-families/TARGET_HUNT
Accept-Language: en
```

```json
{
  "code": "TARGET_HUNT",
  "title": "Target Hunt",
  "description": "Pick players to build a total closest to the target.",
  "games": [{ "code": "GOALS", "title": "Goals", ... }]
}
```

`code` fields are stable across locales and used for routing/sessions. `title`/`description` are display-only.

## Catalog translations (database)

Tables:

- `game_family_translations`
- `game_translations`
- `game_scope_translations`

Fallback: requested locale → `tr` → legacy column on parent table.

Run after deploy:

```bash
npm run db:migrate
npm run db:seed
```

## Error codes (client-side translation)

API returns:

```json
{ "code": "NOT_YOUR_TURN", "message": "...", "details": {} }
```

Clients must map `code` to localized UI strings. Do **not** show `message` in production UI.

Shared key convention:

```
errors.NOT_YOUR_TURN
errors.GAME_SESSION_NOT_FOUND
...
```

Source of truth: `src/common/errors/domain.exception.ts` (`ErrorCode` enum).

## Enum labels (client-side)

| API value | Client key |
|-----------|------------|
| `PERFECT` | `enums.performance.PERFECT` |
| `SINGLE`  | `enums.playerMode.SINGLE` |

## Web (Nuxt)

- URL strategy: `prefix` → `/tr/...`, `/en/...`
- Source of truth for page language: **URL**
- Cookie `futziq_locale`: preference for `/` redirect only
- API: send `Accept-Language` on every catalog request
- SEO: `useLocaleHead()`, hreflang, sitemap (indexable pages only)
- Play/session URLs: `noindex, nofollow`

## Flutter app (future repo)

### Locale storage

| Mechanism | Usage |
|-----------|--------|
| `SharedPreferences` key `app_locale` | Persist user choice |
| `Platform.localeName` | First launch default (`tr`/`en`, else `tr`) |
| Cookie | Not used |

No locale in app routes. Internal navigation uses **family/game/scope codes**.

### API client (Dio)

```dart
class LocaleInterceptor extends Interceptor {
  final LocaleProvider localeProvider;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Accept-Language'] = localeProvider.currentLanguageCode;
    handler.next(options);
  }
}
```

### ARB key convention (align with web `locales/*.json`)

```
common.retry
home.heroTitle
game.start
errors.NOT_YOUR_TURN
enums.performance.PERFECT
```

### Routing

Primary routes use codes, not SEO slugs:

```
/game/TARGET_HUNT/setup?gameCode=GOALS&scopeCode=CAREER
/game/session/:sessionId/play
```

Slug map (web parity) for universal links only:

| Slug | Code |
|------|------|
| `target-hunt` | `TARGET_HUNT` |
| `draft` | `DRAFT` |

### Deep links

Web URL: `https://futziq.com/en/games/target-hunt?game=GOALS`

Parser:

1. Extract locale from path prefix (`en`)
2. Map slug → `TARGET_HUNT`
3. **Deep link locale wins** over stored preference (same as web)

### Cache keys

Include locale to avoid stale strings:

```
catalog_families_tr
catalog_family_TARGET_HUNT_en
```

Invalidate catalog cache when user changes language.

### Flutter packages

- `flutter_localizations` + `intl`
- `dio` + locale interceptor
- `shared_preferences`

## What is not translated

- Player names, club names, national team names
- Session IDs, numeric metrics
- `familyCode`, `gameCode`, `scopeCode` (identifiers)

## Future: user profile locale

When auth exists, `users.preferred_locale` may override defaults. `Accept-Language` remains the transport header.
