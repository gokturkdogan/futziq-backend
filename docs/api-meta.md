# API — Meta Endpoint'leri

Meta endpoint'leri oyun session'ı gerektirmez. `X-Participant-Id` header'ı **gerekmez**.

> **Swagger:** [meta tag](/swagger)

---

## GET /api/v1/meta/locales

Desteklenen dilleri döner.

**İstek:**

```http
GET /api/v1/meta/locales
```

**Yanıt (200):**

```json
{
  "default": "tr",
  "supported": ["tr", "en"]
}
```

**Kullanım:** Uygulama ayarları ekranında dil seçici.

---

## GET /api/v1/meta/i18n-bundle

Hata mesajları, enum ve slot çevirileri.

**İstek:**

```http
GET /api/v1/meta/i18n-bundle?locale=tr
Accept-Language: tr
```

**Query parametreleri:**

| Param | Zorunlu | Açıklama |
|-------|---------|----------|
| `locale` | Hayır | `tr` veya `en` (header yoksa kullanılır) |

**Yanıt (200):**

```json
{
  "errors": { "errors.NOT_YOUR_TURN": "Sıra sende değil" },
  "enums": { "enums.performance.PERFECT": "Mükemmel" },
  "slots": { "slots.GK": "Kaleci" }
}
```

**Kullanım:** Uygulama açılışında bir kez çek, memory'de tut. Detay → [i18n.md](./i18n.md)

---

## GET /api/v1/meta/enums

Enum değer çevirileri (performans rating, objective vb.).

**İstek:**

```http
GET /api/v1/meta/enums?locale=tr
Accept-Language: tr
```

**Kullanım:** Sonuç ekranında `performanceRating` veya `objective` gösterimi.
