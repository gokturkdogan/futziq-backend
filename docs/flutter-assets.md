# Flutter — Medya ve URL Çözümleme

Katalog API'si `imageUrl`, `bannerImageUrl`, `logoUrl` alanlarını döner. Çoğu değer **göreli path** formatındadır.

---

## Path formatları

| Örnek | Tip |
|-------|-----|
| `/images/scopes/club.png` | Göreli (API host'una bağlanır) |
| `https://cdn.example.com/barca.png` | Mutlak (olduğu gibi kullan) |
| `null` | RANDOM scope veya placeholder gerekir |

Draft `currentRound.entity.logoUrl` da aynı kurala tabidir.

---

## Resolve kuralı

```dart
String resolveMediaUrl(String? url, {required String apiBaseUrl}) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  final base = apiBaseUrl.replaceAll(RegExp(r'/$'), '');
  final path = url.startsWith('/') ? url : '/$url';
  return '$base$path';
}
```

| Platform | `apiBaseUrl` örneği |
|----------|---------------------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Production | `https://api.futziq.com` |

**Not:** Statik görseller backend'in static serve ettiği path'te olmalıdır. CDN'e geçildiğinde katalog zaten absolute URL dönebilir — client her iki durumu da desteklemeli.

---

## Widget kullanımı

```dart
Widget catalogImage(String? imageUrl, {double size = 48}) {
  final resolved = resolveMediaUrl(imageUrl, apiBaseUrl: Env.apiBaseUrl);
  if (resolved.isEmpty) {
    return Icon(Icons.image_not_supported, size: size, color: FzColors.textSecondary);
  }
  return Image.network(
    resolved,
    width: size,
    height: size,
    fit: BoxFit.cover,
    errorBuilder: (_, __, ___) => Icon(Icons.broken_image, size: size),
  );
}
```

---

## Placeholder kuralları

| Alan | `null` ise |
|------|------------|
| Scope `imageUrl` | `scope.code == 'RANDOM'` → shuffle ikonu |
| `DRAFT_CLUB` / `DRAFT_COUNTRY` | stadium / flag ikonu |
| `currentRound.entity.logoUrl` | `entity.type` → stadium veya flag |
| Oyun `bannerImageUrl` | Sadece metin başlık, gradient arka plan |

---

## Cache

- Katalog görselleri: `cached_network_image` önerilir
- `catalogVersion` değişince memory cache invalidate → [api-catalog.md](./api-catalog.md)

---

## Checklist

- [ ] `resolveMediaUrl` tüm `Image.network` çağrılarından önce
- [ ] Absolute URL'leri bozma
- [ ] `null` için ikon placeholder
- [ ] Emulator base URL doğru (`10.0.2.2`)
