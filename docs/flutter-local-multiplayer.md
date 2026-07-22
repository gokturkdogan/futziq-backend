# Flutter — Aynı Cihaz Multiplayer (X-Participant-Id)

İki oyuncunun **aynı telefonda sırayla** oynadığı mod. Backend tek bir host kimliği üzerinden iki sanal katılımcı oluşturur.

> **İlgili:** [flutter-multiplayer.md](./flutter-multiplayer.md) · [common-setup.md](./common-setup.md)  
> **Swagger:** [game-sessions](/swagger)

---

## Host ve alt katılımcılar

Session oluştururken header'da **host** ID gönderilir (ör. `550e8400-e29b-41d4-a716-446655440000`).

`playerMode: MULTIPLAYER` ise backend şu katılımcıları yaratır:

| `externalParticipantId` | Açıklama |
|-------------------------|----------|
| `{hostId}::p1` | Oyuncu 1 |
| `{hostId}::p2` | Oyuncu 2 |

Kaynak: `buildParticipantExternalIds()` — `src/game-runtime/domain/session-runtime.ts`

```json
POST /api/v1/game-sessions
X-Participant-Id: 550e8400-e29b-41d4-a716-446655440000

{
  "familyCode": "DRAFT",
  "gameCode": "TALLEST_XI",
  "scopeCode": "DRAFT_CLUB",
  "playerMode": "MULTIPLAYER"
}
```

Yanıt `participants` örneği:

```json
"participants": [
  { "id": "uuid-p1", "externalParticipantId": "550e8400-...::p1", "turnOrder": 0 },
  { "id": "uuid-p2", "externalParticipantId": "550e8400-...::p2", "turnOrder": 1 }
]
```

---

## Kritik kural: action ve arama header'ı

**Session oluşturma** → host ID (`550e8400-...`)

**Oyuncu arama ve SELECT_PLAYER action** → sıradaki oyuncunun **tam** `externalParticipantId` değeri:

```
X-Participant-Id: 550e8400-e29b-41d4-a716-446655440000::p1
```

Action endpoint'i katılımcıyı header ile **birebir** eşleştirir. Host ID gönderirseniz `Participant not found` alırsınız.

| İstek | Header değeri |
|-------|----------------|
| `POST /game-sessions` | Host UUID |
| `GET .../players` | Sıradaki oyuncunun `externalParticipantId` |
| `POST .../actions` | Sıradaki oyuncunun `externalParticipantId` |
| `GET .../session` | Host veya `::p1` / `::p2` (okuma için host yeterli) |
| `GET .../results` | Host veya alt ID |

---

## Dart — acting participant resolver

Web referansı: `futziq-frontend` → `local-multiplayer.ts`

```dart
String resolveActingExternalParticipantId(GameSession session, String hostParticipantId) {
  if (session.playerMode != 'MULTIPLAYER') {
    return hostParticipantId;
  }

  final current = session.participants.cast<Participant?>().firstWhere(
    (p) => p!.id == session.currentTurnParticipantId,
    orElse: () => null,
  );

  return current?.externalParticipantId ??
      session.participants.first.externalParticipantId;
}

// Dio interceptor örneği
void onRequest(RequestOptions options, GameSession? activeSession, String hostId) {
  options.headers['Accept-Language'] = locale;
  if (options.path.contains('/game-sessions') && activeSession != null) {
    if (options.method == 'POST' && options.path.endsWith('/game-sessions')) {
      options.headers['X-Participant-Id'] = hostId;
    } else if (_needsActingParticipant(options)) {
      options.headers['X-Participant-Id'] =
          resolveActingExternalParticipantId(activeSession, hostId);
    } else {
      options.headers['X-Participant-Id'] = hostId;
    }
  }
}

bool _needsActingParticipant(RequestOptions options) {
  return options.path.contains('/players') || options.path.contains('/actions');
}
```

---

## Sıra UI

```dart
bool isParticipantTurn(GameSession session, Participant participant) {
  return session.currentTurnParticipantId == participant.id;
}

String playerLabel(int turnOrder) => 'Oyuncu ${turnOrder + 1}';
```

- Aktif oyuncu panelini vurgula (`currentTurnParticipantId`)
- Pasif panelde slot tıklamasını devre dışı bırak
- `NOT_YOUR_TURN` → sıra başkasında uyarısı (i18n bundle)

---

## Draft multiplayer + tur

- `currentRound.picksRequired == 2`
- Her tur: Oyuncu 1 seçer → Oyuncu 2 seçer → yeni tur, yeni `entity`
- Tur banner: `picksInRound / picksRequired`

Detay → [flutter-draft-scope.md](./flutter-draft-scope.md)

---

## Target Hunt multiplayer

- Paylaşımlı `targetValue`
- Sırayla 5'er seçim (toplam 10 pick)
- Sonuç: `GET .../results` — iki `TARGET_HUNT` result karşılaştırması

---

## Hata senaryoları

| Kod | Sebep | Çözüm |
|-----|-------|-------|
| `NOT_YOUR_TURN` | Yanlış `X-Participant-Id` veya UI sıra hatası | `resolveActingExternalParticipantId` kullan |
| `INVALID_GAME_ACTION` | Participant bulunamadı | Header'da `::p1`/`::p2` suffix kontrol et |
| `PLAYER_ALREADY_SELECTED` | Aynı oyuncu iki kez | Global `alreadySelected` ile UI disable |

---

## Checklist

- [ ] Host ID SharedPreferences'ta sabit
- [ ] Create session → host header
- [ ] Search + action → sıradaki `externalParticipantId`
- [ ] UI'da aktif oyuncu göstergesi
- [ ] Draft tur banner + picks sayacı
- [ ] Sonuç: `GET /results` (multiplayer)
