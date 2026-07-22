# Flutter — OpenAPI Codegen

Manuel Dart modelleri yerine Swagger şemasından tip üretmek drift riskini azaltır.

> **OpenAPI JSON:** [/swagger-json](/swagger-json)  
> **Canonical TS tipler:** `src/client-contract/types.ts`

---

## 1. OpenAPI indir

```bash
curl http://localhost:3000/swagger-json -o openapi/futziq-api.json
```

CI'da backend ayağa kalkmadan önce commit'lenmiş `openapi/futziq-api.json` kullanılabilir.

---

## 2. Paketler

```yaml
# pubspec.yaml
dev_dependencies:
  build_runner: ^2.4.0
  json_serializable: ^6.8.0
  openapi_generator: ^6.0.0   # veya openapi_generator_cli
```

Alternatif: [openapi-generator](https://openapi-generator.tech/) CLI:

```bash
openapi-generator generate \
  -i openapi/futziq-api.json \
  -g dart-dio \
  -o lib/generated/api \
  --additional-properties=pubName=futziq_api
```

---

## 3. Önemli şemalar

| Swagger schema | Kullanım |
|----------------|----------|
| `GameSessionResponseDto` | Session state |
| `DraftRoundContextDto` | Tur banner |
| `ActionResponseDto` | Seçim sonrası |
| `TargetHuntResultResponseDto` | Target Hunt sonuç |
| `DraftResultResponseDto` | Draft sonuç |
| `GameFamilyDetailResponseDto` | Setup |
| `PaginatedEligiblePlayersDto` | Arama |
| `ErrorResponseDto` | Hata parsing |

---

## 4. Union (discriminated result)

Codegen `kind` alanını otomatik union yapmayabilir. Manuel wrapper önerilir:

```dart
GameResult parseGameResult(Map<String, dynamic> json) {
  switch (json['kind']) {
    case 'DRAFT':
      return DraftResult.fromJson(json);
    case 'TARGET_HUNT':
    default:
      return TargetHuntResult.fromJson(json);
  }
}
```

Detay → [flutter-models.md](./flutter-models.md)

---

## 5. Client-contract ile doğrulama

Backend değişikliğinde:

1. `src/client-contract/types.ts` güncellendi mi kontrol et
2. `swagger-json` yeniden indir
3. Codegen çalıştır
4. Breaking change varsa Flutter PR'da not düş

---

## 6. Dio entegrasyonu

Üretilen client'a custom interceptor ekle:

- `Accept-Language`
- `X-Participant-Id` (host vs acting — [flutter-local-multiplayer.md](./flutter-local-multiplayer.md))
- Hata → `ApiException` ([common-errors.md](./common-errors.md))

---

## Checklist

- [ ] `openapi/futziq-api.json` repo'da veya CI artifact
- [ ] Codegen script `melos` / `Makefile` ile
- [ ] `kind` union manuel parser
- [ ] PR'da swagger-json diff review
