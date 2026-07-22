# Flutter — Genel Bakış

Bu bölüm Flutter ekibinin sıfırdan entegrasyon için ihtiyaç duyduğu tüm bilgileri içerir.

> **Tam rehber (tek dosya):** [flutter-integration.md](./flutter-integration.md)  
> **Swagger:** [/swagger](/swagger)

---

## Mimari

```
┌──────────────┐     Accept-Language + X-Participant-Id
│ Flutter App  │────────────────────────────────────────► Futz IQ API
└──────────────┘
       │
       ├─ Catalog (capabilities-driven setup UI)
       ├─ Session (game state, optimistic concurrency)
       ├─ Setup (scope picker: DRAFT_CLUB / DRAFT_COUNTRY)
       ├─ Draft rounds (currentRound.entity per tur)
       ├─ Actions (idempotent SELECT_PLAYER)
       └─ Results (discriminated by `kind`)
```

**Temel kural:** `TARGET_HUNT` / `DRAFT` UI kurallarını hardcode etmeyin. Katalogdan `capabilities` okuyun, sonuçta `kind` ile branch yapın.

---

## Bağımlılıklar

```yaml
dependencies:
  dio: ^5.4.0
  uuid: ^4.0.0
  shared_preferences: ^2.2.0
```

---

## Ortam yapılandırması

```dart
abstract class Env {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
  static const defaultLocale = 'tr';
}
```

```bash
flutter run --dart-define=API_BASE_URL=https://api.futziq.com
```

| Platform | Base URL |
|----------|----------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |

---

## Önerilen proje yapısı

```
lib/
  api/
    futziq_client.dart
    catalog_api.dart
    session_api.dart
  models/
    capabilities.dart
    session.dart
    result.dart
  features/
    lobby/
    setup/
      scope_picker/     # DRAFT_CLUB, DRAFT_COUNTRY
    game/
      draft/
        round_banner.dart
    result/
  l10n/
```

Detaylı ekran listesi → [flutter-screens.md](./flutter-screens.md)

---

## Entegrasyon checklist

- [ ] Sabit host `X-Participant-Id` (SharedPreferences)
- [ ] Multiplayer: action/search'te `::p1` / `::p2` header → [flutter-local-multiplayer.md](./flutter-local-multiplayer.md)
- [ ] `Accept-Language` tüm isteklerde
- [ ] Medya URL resolve → [flutter-assets.md](./flutter-assets.md)
- [ ] Setup UI `capabilities` okur
- [ ] Oyun ekranı `definitionSnapshot` (metric, revealPolicy) → [flutter-definition-snapshot.md](./flutter-definition-snapshot.md)
- [ ] Her seçimde yeni `actionId` (UUID)
- [ ] `expectedVersion` her action sonrası güncellenir
- [ ] Session resume → [flutter-session-resume.md](./flutter-session-resume.md)
- [ ] Draft: `scopeCode` = `DRAFT_CLUB` veya `DRAFT_COUNTRY`
- [ ] Draft: `currentRound` banner (entity logo + name)
- [ ] Draft: search + action'da `slotCode`
- [ ] Target Hunt RANDOM: `scopeCode: "RANDOM"`
- [ ] Sonuç ekranı `result.kind` ile branch
- [ ] Hatalar i18n bundle'dan (message değil)
- [ ] `catalogVersion` locale bazlı cache
- [ ] Widget test fixtures → [flutter-fixtures.md](./flutter-fixtures.md)
- [ ] (Opsiyonel) OpenAPI codegen → [flutter-openapi-codegen.md](./flutter-openapi-codegen.md)

---

## İlgili sayfalar

| Sayfa | Konu |
|-------|------|
| [flutter-screens.md](./flutter-screens.md) | Ekran haritası ve navigasyon |
| [flutter-api-client.md](./flutter-api-client.md) | Dio client kurulumu |
| [flutter-models.md](./flutter-models.md) | Dart modelleri |
| [flutter-local-multiplayer.md](./flutter-local-multiplayer.md) | **Aynı cihaz header kuralları** |
| [flutter-design-system.md](./flutter-design-system.md) | Renkler, tipografi (Figma öncesi) |
| [flutter-assets.md](./flutter-assets.md) | imageUrl / logoUrl çözümleme |
| [flutter-definition-snapshot.md](./flutter-definition-snapshot.md) | metric, revealPolicy, objective |
| [flutter-session-resume.md](./flutter-session-resume.md) | App resume, deep link |
| [flutter-fixtures.md](./flutter-fixtures.md) | Test JSON örnekleri |
| [flutter-target-hunt.md](./flutter-target-hunt.md) | Target Hunt uçtan uca |
| [flutter-draft-scope.md](./flutter-draft-scope.md) | Scope seçimi + tur UI |
| [flutter-draft.md](./flutter-draft.md) | Draft uçtan uca |
| [flutter-multiplayer.md](./flutter-multiplayer.md) | Multiplayer akış özeti |
