# Flutter — Draft Scope Seçimi ve Tur Sistemi

Draft modunda oyuncu seçimi **tur bazlı scope** ile çalışır. Kullanıcı oyun başlamadan önce scope tipini seçer; her turda backend rastgele bir kulüp veya ülke atar.

> **Swagger:** [game-families](/swagger) · [game-sessions](/swagger)  
> **İlgili:** [flutter-draft.md](./flutter-draft.md) · [api-catalog.md](./api-catalog.md)

---

## Scope seçenekleri

| scopeCode | UI başlık | Tur davranışı |
|-----------|-----------|---------------|
| `DRAFT_CLUB` | Kulüp | Her turda rastgele bir **kulüp** — sadece o kulüpten oyuncu |
| `DRAFT_COUNTRY` | Ülke | Her turda rastgele bir **ülke** — sadece o ülkeden oyuncu |

Katalogdan gelir:

```http
GET /api/v1/game-families/DRAFT
```

```json
{
  "games": [
    {
      "code": "TALLEST_XI",
      "requiresScope": true,
      "scopes": [
        {
          "code": "DRAFT_CLUB",
          "title": "Kulüp",
          "description": "Her turda rastgele bir kulüpten oyuncu seç.",
          "imageUrl": "/images/scopes/club.png"
        },
        {
          "code": "DRAFT_COUNTRY",
          "title": "Ülke",
          "description": "Her turda rastgele bir ülkeden oyuncu seç.",
          "imageUrl": "/images/scopes/country.png"
        }
      ]
    }
  ]
}
```

---

## Setup ekranı — Scope picker UI

`capabilities.requiresScope === true` ise scope seçici **zorunlu** gösterilir.

### Önerilen layout

```
┌─────────────────────────────────────┐
│  En Uzun 6'lı                       │
│                                     │
│  Kapsam seç                         │
│  ┌──────────┐  ┌──────────┐        │
│  │ 🏟 Kulüp │  │ 🌍 Ülke  │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  [ Tek oyuncu ▾ ]                   │
│                                     │
│  [ Oyunu Başlat ]                   │
└─────────────────────────────────────┘
```

### Flutter widget örneği

```dart
class DraftScopePicker extends StatelessWidget {
  const DraftScopePicker({
    required this.scopes,
    required this.selectedCode,
    required this.onChanged,
  });

  final List<GameScopeSummary> scopes;
  final String? selectedCode;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      children: scopes.map((scope) {
        final selected = scope.code == selectedCode;
        return ChoiceChip(
          label: Text(scope.title),
          avatar: scope.imageUrl != null
              ? Image.network(scope.imageUrl!, width: 24, height: 24)
              : Icon(scope.code == 'DRAFT_CLUB' ? Icons.stadium : Icons.flag),
          selected: selected,
          onSelected: (_) => onChanged(scope.code),
        );
      }).toList(),
    );
  }
}
```

### Validasyon

```dart
void onStartGame() {
  if (game.requiresScope && selectedScopeCode == null) {
    showError('Lütfen bir kapsam seçin');
    return;
  }
  createSession(
    familyCode: 'DRAFT',
    gameCode: game.code,
    scopeCode: selectedScopeCode!,
    playerMode: playerMode,
  );
}
```

---

## Session create

```json
POST /api/v1/game-sessions
{
  "familyCode": "DRAFT",
  "gameCode": "TALLEST_XI",
  "scopeCode": "DRAFT_CLUB",
  "playerMode": "MULTIPLAYER"
}
```

**Yanıt — `currentRound` alanı:**

```json
{
  "scopeCode": "DRAFT_CLUB",
  "currentRound": {
    "roundNumber": 1,
    "totalRounds": 6,
    "scopeType": "CLUB",
    "picksInRound": 0,
    "picksRequired": 2,
    "entity": {
      "type": "CLUB",
      "id": "club-uuid",
      "name": "FC Barcelona",
      "logoUrl": "https://cdn.example.com/barca.png"
    }
  }
}
```

| Alan | Açıklama |
|------|----------|
| `roundNumber` | Mevcut tur (1–6) |
| `totalRounds` | Toplam tur = `selectionCount` (6) |
| `scopeType` | `CLUB` veya `COUNTRY` |
| `picksInRound` | Bu turda yapılan seçim sayısı |
| `picksRequired` | Turu bitirmek için gerekli seçim: `1` (SINGLE), `2` (MULTIPLAYER) |
| `entity` | Bu turun kulübü/ülkesi — logo + isim göster |

---

## Oyun ekranı — Tur banner UI

Her turda üstte aktif scope entity gösterilmeli:

```
┌─────────────────────────────────────┐
│ Tur 2 / 6          [FC Barcelona 🏟]│
│ Bu turdan bir oyuncu seç            │
├─────────────────────────────────────┤
│         ATT                         │
│     MID1   MID2                     │
│    DEF1     DEF2                    │
│         GK                          │
└─────────────────────────────────────┘
```

```dart
class DraftRoundBanner extends StatelessWidget {
  const DraftRoundBanner({required this.round});

  final DraftRoundContext round;

  @override
  Widget build(BuildContext context) {
    final entity = round.entity;
    return Card(
      child: ListTile(
        leading: entity.logoUrl != null
            ? Image.network(entity.logoUrl!, width: 40, height: 40)
            : Icon(entity.type == 'CLUB' ? Icons.stadium : Icons.flag),
        title: Text('Tur ${round.roundNumber} / ${round.totalRounds}'),
        subtitle: Text(entity.name),
        trailing: Text('${round.picksInRound}/${round.picksRequired}'),
      ),
    );
  }
}
```

---

## Tur geçişi

Backend otomatik yönetir:

1. Oyuncu seçilir → `POST /actions`
2. Action yanıtında güncel `currentRound` döner
3. `picksInRound == picksRequired` olduğunda backend sonraki tura geçer
4. Yeni `entity` (yeni kulüp/ülke) atanır
5. `ROUND_STARTED` event loglanır (opsiyonel dinleme)

**Frontend yapılacaklar:**
- Her action sonrası `state.currentRound` güncelle
- `entity` değiştiyse tur banner animasyonu göster
- Arama listesini sıfırla (yeni scope filtresi backend'de uygulanır)

```dart
if (action.state.currentRound?.entity.id != previousEntityId) {
  showRoundTransition(action.state.currentRound!);
}
```

---

## Arama filtresi

Client tarafında **ek filtre göndermeyin**. Backend `currentRound.entity` ile filtreler:

```http
GET /api/v1/game-sessions/{id}/players?q=mes&slotCode=GK
```

Dönen oyuncular sadece o turun kulübü/ülkesinden gelir.

---

## Dart modeli

```dart
class DraftRoundContext {
  final int roundNumber;
  final int totalRounds;
  final String scopeType; // CLUB | COUNTRY
  final int picksInRound;
  final int picksRequired;
  final DraftScopeEntity entity;

  factory DraftRoundContext.fromJson(Map<String, dynamic> json) => DraftRoundContext(
    roundNumber: json['roundNumber'] as int,
    totalRounds: json['totalRounds'] as int,
    scopeType: json['scopeType'] as String,
    picksInRound: json['picksInRound'] as int,
    picksRequired: json['picksRequired'] as int,
    entity: DraftScopeEntity.fromJson(json['entity'] as Map<String, dynamic>),
  );
}

class DraftScopeEntity {
  final String type;
  final String id;
  final String name;
  final String? logoUrl;
}
```

`GameSession` ve `ActionState` modellerine `DraftRoundContext? currentRound` ekleyin.

---

## Target Hunt vs Draft scope farkı

| | Target Hunt | Draft |
|---|-------------|-------|
| Scope anlamı | İstatistik kaynağı (Kariyer, Kulüp vb.) | Tur bazlı oyuncu havuzu |
| Scope sabit mi | Evet (session boyunca) | Hayır (her tur değişir) |
| RANDOM scope | Var (`RANDOM` → resolve) | Yok |
| Draft scope kodları | — | `DRAFT_CLUB`, `DRAFT_COUNTRY` |

---

## Checklist

- [ ] Setup'ta `requiresScope` kontrolü — scope seçmeden başlatma
- [ ] `scopeCode: DRAFT_CLUB` veya `DRAFT_COUNTRY` gönder
- [ ] Oyun ekranında `currentRound.entity` banner
- [ ] Action sonrası `currentRound` state güncelle
- [ ] Tur değişiminde banner/animasyon
- [ ] Arama API'sine club/country filtresi **ekleme** (backend halleder)
