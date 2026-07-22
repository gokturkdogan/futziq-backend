# Flutter — API Client (Dio)

> **Swagger:** Tüm endpoint'leri [/swagger](/swagger) üzerinden deneyin.  
> **Multiplayer header:** [flutter-local-multiplayer.md](./flutter-local-multiplayer.md)

---

## FutziqClient

Session route'larında `X-Participant-Id` gerekir. Multiplayer'da create → **host ID**; search/action → **sıradaki oyuncunun** `externalParticipantId` (`host::p1` / `host::p2`).

```dart
// lib/api/futziq_client.dart
import 'package:dio/dio.dart';

class FutziqClient {
  FutziqClient({
    required this.hostParticipantId,
    required this.locale,
    String? baseUrl,
    Dio? dio,
    GameSession? Function()? activeSessionProvider,
    String Function(GameSession session)? actingParticipantResolver,
  })  : _dio = dio ?? Dio(BaseOptions(baseUrl: baseUrl ?? Env.apiBaseUrl)),
        _hostParticipantId = hostParticipantId,
        _activeSessionProvider = activeSessionProvider,
        _actingParticipantResolver = actingParticipantResolver {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        options.headers['Accept-Language'] = locale;
        if (options.path.contains('/game-sessions')) {
          options.headers['X-Participant-Id'] = _resolveParticipantHeader(options);
        }
        handler.next(options);
      },
      onError: (error, handler) {
        handler.reject(error);
      },
    ));
  }

  final Dio _dio;
  final String _hostParticipantId;
  final GameSession? Function()? _activeSessionProvider;
  final String Function(GameSession session)? _actingParticipantResolver;

  String _resolveParticipantHeader(RequestOptions options) {
    final isCreate = options.method == 'POST' && options.path.endsWith('/game-sessions');
    if (isCreate) return _hostParticipantId;

    final session = _activeSessionProvider?.call();
    if (session != null && _needsActingParticipant(options)) {
      final resolver = _actingParticipantResolver ?? resolveActingExternalParticipantId;
      return resolver(session, _hostParticipantId);
    }
    return _hostParticipantId;
  }

  bool _needsActingParticipant(RequestOptions options) {
    return options.path.contains('/players') || options.path.contains('/actions');
  }
}
```

Tam `resolveActingExternalParticipantId` → [flutter-local-multiplayer.md](./flutter-local-multiplayer.md)

---

## CatalogApi

```dart
class CatalogApi {
  CatalogApi(this._client);
  final FutziqClient _client;

  Future<List<GameFamilySummary>> listFamilies() async {
    final data = await _client.get<List<dynamic>>('/api/v1/game-families');
    return data.map((e) => GameFamilySummary.fromJson(e)).toList();
  }

  Future<GameFamilyDetail> getFamily(String code) async {
    final data = await _client.get<Map<String, dynamic>>('/api/v1/game-families/$code');
    return GameFamilyDetail.fromJson(data);
  }
}
```

---

## SessionApi

```dart
class SessionApi {
  SessionApi(this._client);
  final FutziqClient _client;

  Future<GameSession> createSession(CreateSessionRequest req) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/api/v1/game-sessions',
      data: req.toJson(),
    );
    return GameSession.fromJson(data);
  }

  Future<GameSession> getSession(String sessionId) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/v1/game-sessions/$sessionId',
    );
    return GameSession.fromJson(data);
  }

  Future<PaginatedPlayers> searchPlayers({
    required String sessionId,
    required String q,
    int page = 1,
    int limit = 20,
    String? slotCode,
  }) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/v1/game-sessions/$sessionId/players',
      query: {
        'q': q,
        'page': page,
        'limit': limit,
        if (slotCode != null) 'slotCode': slotCode,
      },
    );
    return PaginatedPlayers.fromJson(data);
  }

  Future<ActionResponse> submitAction({
    required String sessionId,
    required String actionId,
    required int expectedVersion,
    required String playerId,
    String? slotCode,
  }) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/api/v1/game-sessions/$sessionId/actions',
      data: {
        'actionId': actionId,
        'expectedVersion': expectedVersion,
        'playerId': playerId,
        if (slotCode != null) 'slotCode': slotCode,
      },
    );
    return ActionResponse.fromJson(data);
  }

  Future<GameResult> getResult(String sessionId) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/v1/game-sessions/$sessionId/result',
    );
    return parseResult(data);
  }
}
```

---

## MetaApi

```dart
class MetaApi {
  MetaApi(this._client);
  final FutziqClient _client;

  Future<I18nBundle> getI18nBundle() async {
    final data = await _client.get<Map<String, dynamic>>('/api/v1/meta/i18n-bundle');
    return I18nBundle.fromJson(data);
  }
}
```

---

## Hata yakalama

```dart
Future<T> safeCall<T>(Future<T> Function() fn) async {
  try {
    return await fn();
  } on DioException catch (e) {
    throw ApiException.fromDio(e);
  }
}
```

Detay → [common-errors.md](./common-errors.md)

---

## OpenAPI codegen (opsiyonel)

```bash
curl http://localhost:3000/swagger-json -o openapi.json
```

`json_serializable` veya `freezed` ile manuel modeller de yeterlidir → [flutter-models.md](./flutter-models.md)
