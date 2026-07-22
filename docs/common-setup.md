# Ortak Kurulum — Header'lar, Kimlik ve CORS

> **Swagger:** [game-sessions tag](/swagger) — tüm session endpoint'lerini buradan deneyebilirsiniz.

---

## Base URL

| Ortam | URL |
|-------|-----|
| Local | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |

---

## Zorunlu HTTP header'lar

| Header | Katalog / Meta | Session route'ları |
|--------|----------------|-------------------|
| `Accept-Language` | Önerilir (`tr` / `en`, varsayılan `tr`) | Önerilir |
| `Content-Type: application/json` | POST isteklerinde | POST isteklerinde |
| `X-Participant-Id` | Hayır | **Evet** (sabit UUID) |

### Accept-Language

Katalog başlıkları, slot `displayName` ve i18n bundle locale'ini etkiler.

```http
Accept-Language: tr
```

### X-Participant-Id

Tüm `/api/v1/game-sessions/*` isteklerinde **aynı** ID gönderilmelidir. Header yoksa backend her istekte yeni UUID üretir ve session sahipliği bozulur.

**Flutter örneği:**

```dart
Future<String> getParticipantId() async {
  final prefs = await SharedPreferences.getInstance();
  var id = prefs.getString('participant_id');
  if (id == null) {
    id = const Uuid().v4();
    await prefs.setString('participant_id', id);
  }
  return id;
}
```

**cURL örneği:**

```bash
curl -H "X-Participant-Id: 550e8400-e29b-41d4-a716-446655440000" \
  http://localhost:3000/api/v1/game-sessions/{sessionId}
```

---

## Backend kurulumu (geliştirme)

```bash
cd futziq-backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed-random-scope
npm run db:update-draft-config
npm run start:dev
```

Health check:

```bash
curl http://localhost:3000/health
```

---

## CORS

Backend `CORS_ORIGINS` env değişkeninden origin listesi alır. Varsayılan: `http://localhost:3000`.

Flutter web veya Nuxt için kendi origin'inizi `.env` dosyasına ekleyin:

```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Swagger'da test etme

1. [Swagger UI](/swagger) açın
2. Sağ üstte **Authorize** → `X-Participant-Id` girin
3. İlgili endpoint'i **Try it out** ile çalıştırın

OpenAPI JSON: [/swagger-json](/swagger-json)
