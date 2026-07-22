# Hata Kodları ve UI Davranışı

Tüm API hataları aynı JSON şeklini kullanır:

```json
{
  "code": "STATE_VERSION_CONFLICT",
  "message": "State version conflict. Refresh and retry.",
  "details": { "expected": 0, "actual": 1 },
  "traceId": "uuid"
}
```

> **Not:** Production UI'da `message` göstermeyin. Metinleri i18n bundle'dan alın → [i18n.md](./i18n.md)

---

## HTTP status → kod eşlemesi

| HTTP | Yaygın kodlar | UI davranışı |
|------|---------------|--------------|
| 400 | `PLAYER_NOT_ELIGIBLE`, `SELECTION_LIMIT_REACHED`, `NOT_YOUR_TURN`, `INVALID_GAME_ACTION` | Lokalize hata mesajı göster |
| 404 | `GAME_SESSION_NOT_FOUND`, `RESULT_NOT_AVAILABLE`, `GAME_FAMILY_NOT_FOUND` | Geri dön / yeniden dene |
| 409 | `STATE_VERSION_CONFLICT` | Session yenile, `stateVersion` güncelle, tekrar dene |
| 409 | `PLAYER_ALREADY_SELECTED` | Oyuncuyu listede devre dışı bırak |
| 409 | `GAME_SESSION_NOT_ACTIVE` | Sonuç ekranına yönlendir |

---

## Kritik hatalar (detay)

### STATE_VERSION_CONFLICT

İki cihaz veya hızlı ardışık istekte `expectedVersion` güncel değilse oluşur.

**Çözüm:**
1. `GET /api/v1/game-sessions/:id` ile session yenile
2. Dönen `stateVersion` değerini kullan
3. Aynı `actionId` ile tekrar gönder (idempotent)

### NOT_YOUR_TURN

Multiplayer modda sıra başka katılımcıda.

**Çözüm:** `currentTurnParticipantId` ile UI'da aktif oyuncuyu göster; yanlış kullanıcı seçim yapamaz.

### PLAYER_NOT_ELIGIBLE

Draft'ta slot pozisyonuna uygun olmayan oyuncu seçildi.

**Çözüm:** Arama sırasında `slotCode` parametresi kullanın → [api-player-search.md](./api-player-search.md)

### RESULT_NOT_AVAILABLE

Session henüz `COMPLETED` değil.

**Çözüm:** Son seçimden sonra `completed: true` dönene kadar bekleyin.

---

## Flutter hata sınıfı

```dart
class ApiException implements Exception {
  ApiException({required this.code, required this.message, this.details = const {}});
  final String code;
  final String message;
  final Map<String, dynamic> details;

  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic> && data['code'] != null) {
      return ApiException(
        code: data['code'] as String,
        message: data['message'] as String? ?? '',
        details: Map<String, dynamic>.from(data['details'] ?? {}),
      );
    }
    return ApiException(code: 'NETWORK_ERROR', message: e.message ?? 'Unknown error');
  }
}
```

**Swagger:** Hata şeması → [ErrorResponseDto](/swagger) (components/schemas)
