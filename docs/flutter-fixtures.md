# Flutter — Test Fixtures

Widget ve unit testler için örnek JSON yanıtları. Gerçek API yanıtlarıyla uyumludur.

> **Ham dosyalar:** `docs/fixtures/`  
> **Kullanım:** `rootBundle.loadString('assets/fixtures/...')` veya test `File`

---

## Dosya listesi

| Dosya | Açıklama |
|-------|----------|
| [session-draft-in-progress.json](./fixtures/session-draft-in-progress.json) | Draft session, tur 2, bir slot dolu |
| [action-response-draft.json](./fixtures/action-response-draft.json) | SELECT_PLAYER sonrası state |
| [catalog-draft-family.json](./fixtures/catalog-draft-family.json) | DRAFT family setup verisi |
| [error-state-version-conflict.json](./fixtures/error-state-version-conflict.json) | 409 conflict örneği |

---

## Flutter test örneği

```dart
// pubspec.yaml
// flutter:
//   assets:
//     - assets/fixtures/

test('parses draft session with currentRound', () async {
  final json = jsonDecode(
    await rootBundle.loadString('assets/fixtures/session-draft-in-progress.json'),
  ) as Map<String, dynamic>;
  final session = GameSession.fromJson(json);

  expect(session.currentRound?.roundNumber, 2);
  expect(session.currentRound?.entity.name, 'FC Barcelona');
  expect(session.participants.first.lineup?.first.occupied, isTrue);
});
```

Projeye kopyalama:

```bash
cp docs/fixtures/*.json ../futziq-flutter/assets/fixtures/
```

---

## Genişletme

Yeni fixture eklerken:

1. Swagger örneğinden veya gerçek API yanıtından kopyala
2. `src/client-contract/types.ts` ile alan adlarını doğrula
3. Bu tabloya bir satır ekle

Target Hunt fixture'ları ihtiyaç halinde `session-target-hunt-in-progress.json` olarak eklenebilir.
