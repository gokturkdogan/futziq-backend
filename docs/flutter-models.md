# Flutter — Veri Modelleri

Canonical tipler backend'deki `src/client-contract/types.ts` ile uyumludur.

---

## GameCapabilities

```dart
class GameCapabilities {
  final String family;
  final bool requiresScope;
  final int selectionCount;
  final bool slotBased;
  final bool hasTarget;
  final List<String> supportedActions;
  final String playerMode;

  bool get isDraft => slotBased;
  bool get isTargetHunt => hasTarget;

  factory GameCapabilities.fromJson(Map<String, dynamic> json) => GameCapabilities(
    family: json['family'] as String,
    requiresScope: json['requiresScope'] as bool,
    selectionCount: json['selectionCount'] as int,
    slotBased: json['slotBased'] as bool,
    hasTarget: json['hasTarget'] as bool,
    supportedActions: List<String>.from(json['supportedActions'] as List),
    playerMode: json['playerMode'] as String,
  );
}
```

---

## GameSession

```dart
class GameSession {
  final String id;
  final String status;
  final int stateVersion;
  final int? targetValue;
  final String? scopeCode;       // DRAFT_CLUB | DRAFT_COUNTRY | CAREER...
  final String family;
  final String playerMode;
  final String? currentTurnParticipantId;
  final DraftRoundContext? currentRound;  // Draft only
  final List<Participant> participants;
  final List<Selection> selections;

  bool get isCompleted => status == 'COMPLETED';
}
```

---

## DraftRoundContext

```dart
class DraftRoundContext {
  final int roundNumber;
  final int totalRounds;
  final String scopeType;        // CLUB | COUNTRY
  final int picksInRound;
  final int picksRequired;       // 1 SINGLE, 2 MULTIPLAYER
  final DraftScopeEntity entity;

  factory DraftRoundContext.fromJson(Map<String, dynamic> json) => ...
}

class DraftScopeEntity {
  final String type;             // CLUB | COUNTRY
  final String id;
  final String name;
  final String? logoUrl;         // kulüp logosu veya ülke bayrağı
}
```

Detay → [flutter-draft-scope.md](./flutter-draft-scope.md)

---

## DraftLineupSlot

```dart
class DraftLineupSlot {
  final String slotCode;       // GK, DEF1, DEF2, MID1, MID2, ATT
  final String displayName;    // Accept-Language ile lokalize
  final String line;           // GK | DEF | MID | ATT
  final bool occupied;
  final String? playerId;
  final double? metricValue;
  final Map<String, dynamic>? playerSnapshot;
}
```

---

## Discriminated Result

```dart
sealed class GameResult {}

class TargetHuntResult extends GameResult {
  final String kind = 'TARGET_HUNT';
  final int targetValue;
  final int aggregateValue;
  final int absoluteDifference;
  final bool exactHit;
  final String performanceRating;
}

class DraftResult extends GameResult {
  final String kind = 'DRAFT';
  final String objective;
  final double aggregateValue;
  final double totalMetricValue;
  final double averageMetricValue;
  final List<DraftLineupSlot> lineup;
}

GameResult parseResult(Map<String, dynamic> json) {
  switch (json['kind']) {
    case 'DRAFT':
      return DraftResult.fromJson(json);
    case 'TARGET_HUNT':
    default:
      return TargetHuntResult.fromJson(json);
  }
}
```

---

## ActionResponse

```dart
class ActionResponse {
  final ActionState state;
  final String eventType;
  final bool completed;
  final bool idempotentReplay;
}

class ActionState {
  final int stateVersion;
  final int selectionCount;
  final int aggregateValue;
  final List<DraftLineupSlot>? lineup;
  final List<Selection> selections;
}
```

---

## PaginatedPlayers

```dart
class PaginatedPlayers {
  final List<EligiblePlayer> items;
  final int page;
  final int limit;
  final int total;
  final int totalPages;
}

class EligiblePlayer {
  final String id;
  final String displayName;
  final List<String> normalizedPositions;
  final bool alreadySelected;
}
```

---

## Swagger şemaları

Tam JSON şemaları için → [/swagger](/swagger) → Components → Schemas:

- `GameSessionResponseDto`
- `DraftRoundContextDto`
- `DraftScopeEntityDto`
- `ActionResponseDto`
- `TargetHuntResultResponseDto`
- `DraftResultResponseDto`
- `PaginatedEligiblePlayersDto`
