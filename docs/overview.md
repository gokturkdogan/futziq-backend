# Genel Bakış — Futz IQ API Entegrasyon Rehberi

> **Docs:** [/docs](/docs) · **Swagger:** [/swagger](/swagger)

---

## Hızlı başlangıç

### Target Hunt
```
GET game-families → GET game-families/TARGET_HUNT → scope seç → POST game-sessions
→ players ara → actions (×5) → result
```

### Draft (tur bazlı scope)
```
GET game-families/DRAFT → oyun seç → DRAFT_CLUB veya DRAFT_COUNTRY seç
→ POST game-sessions → currentRound.entity göster
→ her tur: players ara + action (×6 tur) → result
```

---

## Oyun aileleri

| code | Açıklama | Scope |
|------|----------|-------|
| `TARGET_HUNT` | Hedef değere yakın toplam | Kariyer, Kulüp, RANDOM… |
| `DRAFT` | 6 slot formasyon | **DRAFT_CLUB** veya **DRAFT_COUNTRY** (tur bazlı) |

Draft'ta scope **setup'ta seçilir**; her turda backend yeni kulüp/ülke atar (`currentRound.entity`).

---

## Draft tur sistemi (özet)

| scopeCode | Her tur |
|-----------|---------|
| `DRAFT_CLUB` | Rastgele kulüp → sadece o kulüpten oyuncu |
| `DRAFT_COUNTRY` | Rastgele ülke → sadece o ülkeden oyuncu |

Frontend: setup'ta scope picker, oyun ekranında `currentRound` banner.

Detay → [flutter-draft-scope.md](./flutter-draft-scope.md)

---

## Doküman haritası

| Sayfa | İçerik |
|-------|--------|
| [flutter-local-multiplayer.md](./flutter-local-multiplayer.md) | **Aynı cihaz `::p1`/`::p2` header** |
| [flutter-draft-scope.md](./flutter-draft-scope.md) | Scope seçimi + tur UI |
| [flutter-design-system.md](./flutter-design-system.md) | Tasarım token'ları (Figma öncesi) |
| [flutter-fixtures.md](./flutter-fixtures.md) | Test JSON örnekleri |
| [flutter-draft.md](./flutter-draft.md) | Draft uçtan uca akış |
| [flutter-screens.md](./flutter-screens.md) | Ekran haritası |
| [api-catalog.md](./api-catalog.md) | Katalog + scope listesi |
| [api-session.md](./api-session.md) | Session + `currentRound` |
