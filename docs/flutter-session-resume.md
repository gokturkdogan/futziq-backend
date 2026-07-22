# Flutter — Session Devam ve Deep Link

Uygulama arka plana alındığında veya process öldürüldüğünde aktif oyunu kurtarma.

---

## v1 stratejisi (önerilen)

1. Oyun başladığında `sessionId` + `gameCode` + `familyCode` → local storage
2. App resume → storage'da aktif session var mı?
3. `GET /api/v1/game-sessions/:id` ile durum kontrol
4. `status`:
   - `IN_PROGRESS` → ilgili game ekranına git
   - `COMPLETED` → result ekranı
   - `EXPIRED` / `CANCELLED` → storage temizle, lobby

```dart
class ActiveSessionRef {
  final String sessionId;
  final String familyCode;
  final String gameCode;
  final String? scopeCode;
}

Future<void> persistActiveSession(ActiveSessionRef ref) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('active_session', jsonEncode(ref.toJson()));
}

Future<GameSession?> tryResumeSession(SessionApi api) async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString('active_session');
  if (raw == null) return null;

  final ref = ActiveSessionRef.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  try {
    final session = await api.getSession(ref.sessionId);
    if (session.status == 'EXPIRED' || session.status == 'CANCELLED') {
      await clearActiveSession();
      return null;
    }
    return session;
  } catch (_) {
    await clearActiveSession();
    return null;
  }
}
```

---

## Deep link (opsiyonel v1.1)

```
futziq://game/{sessionId}?family=DRAFT&game=TALLEST_XI
```

| Parametre | Kullanım |
|-----------|----------|
| `sessionId` | API session yükle |
| `family` | Hangi renderer |
| `game` | Başlık / banner |

`go_router` / `app_links` ile Splash'te route resolve.

---

## State restore detayları

| Alan | Restore kaynağı |
|------|-----------------|
| `stateVersion` | Session GET |
| `currentRound` | Session GET |
| `lineup` / `selections` | Session GET |
| `activeSlotCode` | Client-only (ilk boş slot) |
| Arama query | Client-only (sıfırla) |

Action conflict sonrası zaten `GET session` gerekir → [common-errors.md](./common-errors.md)

---

## Multiplayer resume

Resume sonrası `currentTurnParticipantId` backend'den gelir. Acting header kuralı değişmez → [flutter-local-multiplayer.md](./flutter-local-multiplayer.md)

---

## Temizleme

Session tamamlandığında veya kullanıcı lobiye döndüğünde:

```dart
await prefs.remove('active_session');
```

---

## Events API gerekli mi?

**v1 için hayır.** Tur geçişi ve seçimler `POST /actions` yanıtındaki `state.currentRound` ile yeterli.

`GET /events` audit/replay içindir → [api-events.md](./api-events.md)

---

## Checklist

- [ ] `active_session` persistence
- [ ] Splash / resume flow
- [ ] Terminal status'ta storage temizle
- [ ] Deep link (opsiyonel)
- [ ] Events polling yok (v1)
