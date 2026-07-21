# Database Discovery

> Generated during Futz IQ backend bootstrap. No connection credentials are stored in this document.

## Overview

The production PostgreSQL database contains existing football reference data managed outside the game engine. Game engine tables are added in a separate namespace via Prisma migrations and do not modify existing football tables.

## Existing Tables

| Table | Purpose |
|-------|---------|
| `players` | Core player records (~51,666 rows) |
| `clubs` | Club reference data |
| `competitions` | League/competition reference data |
| `countries` | Country reference data |
| `national_teams` | National team reference data |
| `player_clubs` | Player-club association history |
| `_prisma_migrations` | Existing Prisma migration history |

## Player Schema Mapping

### Identity & Display
| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | Primary identifier |
| `transfermarkt_id` | int (unique) | External ID |
| `first_name` | text | Nullable |
| `last_name` | text | Nullable |
| `display_name` | text | Nullable, preferred for search display |
| `external_player_id` | text | Nullable |

### Status & Position
| Column | Type | Notes |
|--------|------|-------|
| `is_active` | boolean | Mostly `null` (38,130) or `false` (13,536); no `true` values observed |
| `primary_position` | text | Nullable |
| `sub_position` | text | Nullable |

### Career Metrics (CAREER_GOALS source)
| Column | Type | Notes |
|--------|------|-------|
| `total_goals` | int | **Primary source for CAREER_GOALS metric** |
| `total_assists` | int | Future metric |
| `total_appearances` | int | Future metric |
| `total_minutes` | int | Future metric |
| `club_goals` | int | Club-only goals |
| `international_goals` | int | National team goals |
| `world_cup_goals` | int | World Cup goals |
| `total_yellow_cards` | int | Future metric |
| `total_red_cards` | int | Future metric |
| `height_cm` | int | Future metric |
| `current_market_value_eur` | bigint | Future metric |
| `max_historical_market_value_eur` | bigint | Future PEAK_MARKET_VALUE |
| `champions_league_titles` | int | Future TROPHY_COUNT proxy |

### Relations
| Column | FK Target |
|--------|-----------|
| `current_club_id` | `clubs.id` |
| `nationality_country_id` | `countries.id` |
| `national_team_id` | `national_teams.id` |

## CAREER_GOALS (`total_goals`) Data Quality

| Metric | Value |
|--------|-------|
| Total players | 51,666 |
| Non-null `total_goals` | 13,529 |
| Null `total_goals` | 38,137 |
| Negative values | 0 |
| Min | 0 |
| Max | 982 |
| Mean | 43.21 |
| Median (p50) | 23 |
| p25 | 8 |
| p75 | 59 |
| p90 | 111 |
| Eligible (non-null, >= 0) | 13,531 |

### Target Generation Implications (5 selections, SUM aggregation)

Approximate single-player percentiles suggest realistic 5-player totals:
- p10 single → ~0, p50 → 23, p90 → 111
- Expected 5-player sum range: roughly **40–555** (p10×5 to p90×5)
- Recommended default target bounds: **minimum 250, maximum 1200** (configurable per game definition)

## Indexes on `players`

Existing indexes cover: `id`, `transfermarkt_id`, `current_club_id`, `nationality_country_id`, `national_team_id`, `is_active`, `height_cm`, market values, `external_player_id`, `data_source`.

**Gap:** No index on `total_goals` or name search columns. Name search uses `ILIKE` with `unaccent` fallback via normalized query. For production scale, consider adding:
- `CREATE INDEX ... ON players (total_goals) WHERE total_goals IS NOT NULL`
- `pg_trgm` GIN index on `display_name`, `last_name`, `first_name` (requires extension; not applied automatically)

## Extension Availability

`pg_trgm` and `unaccent` may be available on Neon but are not installed by default. Search uses case-insensitive `ILIKE` with application-level diacritic stripping as a fallback.

## Game Engine Tables

New tables (prefixed `game_`) are created by migration `20250721000000_init_game_engine` and are isolated from football reference data. See `prisma/schema.prisma` for the full model.

## Assumptions Documented

1. **CAREER_GOALS** maps to `players.total_goals` (career total, not club-only).
2. **Active/retired filter**: `is_active = true` for active; `is_active = false OR is_active IS NULL` treated as retired-compatible when filter allows retired players. GLOBAL_FREE does not filter by active status.
3. Players without `total_goals` are ineligible for Target Hunt (CAREER_GOALS).
4. No destructive changes to existing football tables.

## Position & Height Discovery

Draft family implementation uses the existing raw position fields:

- `players.primary_position`
- `players.sub_position`

Observed dominant values:

- `Goalkeeper`
- `Centre-Back`
- `Left-Back`
- `Right-Back`
- `Defensive Midfield`
- `Central Midfield`
- `Attacking Midfield`
- `Left Winger`
- `Right Winger`
- `Centre-Forward`
- `Second Striker`

These are normalized in application code into reusable position groups (`GK`, `CB`, `LB`, `RB`, `DM`, `CM`, `AM`, `LW`, `RW`, `CF`, `ST`).

### HEIGHT_CM data quality

| Metric | Value |
|--------|-------|
| Non-null `height_cm` | 13,947 |
| Null `height_cm` | 37,719 |
| Non-positive | 0 |
| > 230 cm | 0 |
| Min | 159 |
| Max | 208 |
| Mean | 182.20 |
| Median | 182 |
| p10 | 174 |
| p90 | 191 |

Draft `HEIGHT_CM` resolver treats heights outside `150..230` as invalid, although no such outliers were observed in current data.
