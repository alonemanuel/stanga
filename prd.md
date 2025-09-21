# Stanga — Product Requirements Document (PRD)

## 1) Product Summary

Stanga is a modern, mobile‑first web app to organize casual football (soccer) nights with 3 rotating teams. It lets people:
- Manage a shared pool of players
- Create a matchday (date, time, location) with 3 teams of 6
- Log each 8‑minute game, winner‑stays, goals, assists, and match outcomes
- See stats overall and per matchday (top scorers, most wins, etc.)
- Allow anyone with an account to view/create/edit (full collaboration); anonymous users can read

Constraints/goals:
- 100% free to build/run using common free tiers
- Modern, minimal UI, light/dark, responsive, mobile‑first
- Simple auth (Google or email)
- Everything is editable/deletable with audit metadata (who/when)

## 2) Users and Permissions

- Authenticated user: the only “role”. All authenticated users can create/read/update/delete app content.
- Anonymous: public read‑only access to all primary content; sign‑in required to add/edit/delete.
- Audit trail: all write operations store `created_by`, `updated_by`, timestamps. Edits are visible via an activity log.

## 3) Core Domain and Rules

Matchday rules (for tonight’s use case and as defaults):
- 18 total players -> 3 teams of 6
- Games are 8 minutes; winner stays on
- A game ends early when a team scores 2 goals
- If tied at 8:00 → +2 minutes; if still tied → penalties
- Duration: session typically runs ~2 hours

These rules are stored on each matchday so they can be adjusted later (e.g., team size, time per game, win condition).

## 4) Key Entities (SST)

- User: authenticated person (id from auth provider)
- Player: a person in the general pool. Optional link to a User (for self‑owned profiles) but not required
- Matchday: a scheduled event with date/time/location and a ruleset snapshot
- Team: one of the 3 teams for a matchday
- TeamAssignment: relation of Player to Team on a specific matchday
- Game: one game between two teams with timing and outcome
- GameEvent: a goal or assist attributed to a player and team during a game
- PenaltyShootout: optional record if a game was decided by penalties
- ActivityLog: append‑only record of who did what, when

## 5) Data Model (logical)

- User(id, display_name, avatar_url, created_at)
- Player(id, name, is_active, created_at, created_by, updated_at, updated_by, deleted_at nullable, deleted_by nullable)
- Matchday(id, date, start_time, end_time, location_name, location_coords, rules_json, created_at, created_by, updated_at, updated_by)
- Team(id, matchday_id, color_token, color_hex, formation_json json nullable, created_at, created_by)
- TeamAssignment(id, matchday_id, team_id, player_id, position_label nullable, x_pct nullable, y_pct nullable, created_at, created_by, deleted_at nullable, deleted_by nullable)
- Game(id, matchday_id, home_team_id, away_team_id, started_at, ended_at, end_reason: enum['goals','time','penalties'], home_goals, away_goals, winner_team_id, created_at, created_by)
- GameEvent(id, game_id, matchday_id, team_id, scorer_player_id, assist_player_id nullable, minute, type: enum['goal'], created_at, created_by, deleted_at nullable, deleted_by nullable)
- PenaltyShootout(id, game_id, winner_team_id, home_score, away_score, created_at, created_by)
- PenaltyKick(id, penalty_shootout_id, team_id, player_id, order_index, result: enum['scored','missed','saved','post','bar'], created_at, created_by)
- ActivityLog(id, actor_user_id, entity_type, entity_id, action: enum['create','update','delete'], diff_json, created_at)

Notes:
- `rules_json` holds snapshot: team_size, game_minutes=8, extra_minutes=2, max_goals_to_win=2, penalties_on_tie=true, penalty_win_weight=0.5 (default), points: { loss:0, draw:1, penalty_bonus_win:1, regulation_win:3 }.
- Soft delete across primary entities (players, team_assignments, game_events, games, matchdays, teams): `deleted_at`, `deleted_by`. Default queries exclude deleted items; a "Trash" filter can reveal/restore.

## 6) Feature Scope and UX Flows

### 6.1 Players
- Add a player (name required only)
- Edit player name
- Deactivate/reactivate (keep in pool without deleting)
- Search/filter by name

Flow:
1) Players → "Add player" → form (name only) → save → shows in list
2) Tap player row → edit/delete → confirm

### 6.2 Matchday
- Create matchday with date, start time, location, rules snapshot
- See matchday list (upcoming/past)
- Open a matchday details screen

Flow:
1) Home/Dashboard → “Create matchday” → form → save
2) Matchday card shows time, location, participant count, and quick actions

### 6.3 Teams (3 teams of 6)
- Create 3 teams inside a matchday (auto‑name A/B/C and colors, editable)
- Assign players from the pool to teams (drag/drop or multi‑select)
- Validate team size (cannot exceed configured team_size)

Team identity:
- Teams are identified by color, not by arbitrary name (e.g., "Orange Team", "Black Team").
- When creating teams, select a unique color per team from a curated palette; the UI derives the display name from color.

Flow:
1) Matchday → Teams tab → Auto‑seed empty teams → Add players → Save
2) Show remaining unassigned players and counts per team

### 6.4 Games (winner stays)
- Start a game by selecting the two teams on the field; track which team is waiting
- Timer shown (8:00). Early finish if a team hits 2 goals
- If tie at 8:00 → auto add +2:00. If still tie → penalties UI with per‑kick logging
- Record goals with scorer and optional assist; live score updates
- End game → persist score, end_reason, winner; enqueue next matchup (winner stays vs waiting team)

Flow:
1) Matchday → Games tab → “New game” suggests matchup using rotation logic
2) In‑game screen shows large timer, team names/colors, score buttons, goal/assist picker, undo last
3) End game → confirm → back to Games list with result card

Rotation logic (baseline):
- Initial matchup: Team A vs Team B, Team C waits
- Winner stays vs waiting team; if penalties, winner = penalties winner
- Track an ordered queue: [on_field_1, on_field_2, waiting]

### 6.5 Stats
- Overall: top scorers, top assisters, team win rates, games played, goals per game
- Per matchday: same metrics scoped to matchday
- Player detail: goals, assists, wins, recent form
- Weighting: wins in penalties count less than regulation wins (default weight 0.5; configurable per matchday rules)

Matchday standings table:
- Columns: Team (color), GP, W, PW (penalty wins), D, L, GF, GA, GD, Pts
- Points calculation (defaults):
  - Regulation/extra‑time win (end_reason != 'penalties' and winner exists): 3 points
  - Penalty shootout: both teams get 1 point (draw), shootout winner +1 bonus (total 2)
  - Loss: 0 points
  - Ties without shootout are not expected under default rules (always go to penalties)

### 6.6 Editing & Activity Log
- Any entity (player, matchday, team, game, event) can be edited/deleted
- ActivityLog shows who changed what and when (e.g., “Alon updated Game #42 score 1–0 → 2–0”)

## 7) Screens (mobile‑first)

**App Shell**: Sticky header with Stanga brand wordmark, user profile icon/name (opens dropdown menu), and dark/light theme toggle button, positioned at top and visible during scrolling.

**Profile Access**: User profile is accessed through a dropdown menu triggered by clicking the user's name/profile icon in the header. Menu includes: View Profile, Settings, Sign Out.

**Navigation**: The app uses a simplified navigation structure with matchdays as the home page, eliminating the need for a separate dashboard.

1) Auth: "Continue with Google" + email
2) Home/Matchdays: list of matchday cards (date/time/location, progress) with quick actions (Create matchday, Manage players)
3) Players: list, search, add/edit
4) Matchday detail: tabs — Overview | Teams | Games | Stats | Activity
   - Overview: rules snapshot, start/end time, team/players counts
   - Teams: assign players, enforce sizes, select team colors
   - Games: current game (timer/score), recent results, start new
   - Stats: per‑matchday metrics
   - Activity: audit trail
6) Player detail: profile + stats
7) User Profile: accessed via header dropdown menu, shows user stats and settings

## 8) Validation and Business Rules

- Team size cannot exceed `rules.team_size` (default 6)
- A game cannot start without two distinct teams; if teams have fewer than `team_size` players assigned, show a confirmation dialog with option to proceed anyway (with "don't show again" preference)
- Goal events require a scorer linked to a team on the field; assist is optional but cannot equal scorer
- Early end when goals for a team reach `rules.max_goals_to_win`
- On tie at base time, add `rules.extra_minutes`; if still tie and `rules.penalties_on_tie`, open penalties flow
 - Standings points computed from `rules.points`; color must be unique per matchday

## 9) Non‑Functional Requirements

- Performance: snappy on 3G; minimal JS on mobile
- Reliability: no data loss; optimistic UI with safe retries
- Security: public read, auth required to write; all writes attributed
- Accessibility: WCAG AA color contrast; large tap targets; keyboard support on desktop
- UX: Sticky header with brand identity and theme toggle for consistent navigation
- Cost: stays within free tiers for hosting, DB, auth

## 10) Analytics and Success

- Basic metrics: number of matchdays created, games logged, active players, average goals/game
- Opt‑in privacy: only aggregate non‑PII metrics

## 11) Acceptance Criteria (MVP)

- Users can sign in with Google or email
- Users can add/edit players
- Users can create a matchday with rules snapshot
- Users can define 3 teams and assign players (team size validated)
- Users can start a game, log goals/assists, and complete games respecting rules (8 min, early win at 2 goals, extra time, penalties with per‑kick logging)
- Users can see stats overall and per matchday
- Users can see matchday standings (points table) using the configured point rules
- Users can edit or delete any item and see activity log
- Works well on mobile (light/dark)
- Anonymous users can view all primary content (public read)

## 12) Open Questions for You

1) Penalty win weight default is 0.5 — confirm preferred value?
2) Team positions/formation: storing as `formation_json` on Team (template + slots with coordinates + assigned players). OK?

## 13) Future (post‑MVP)

- Elo‑like team ranking, balanced auto‑draft
- CSV export of stats
- Photos/avatars and team badges
- Multiple concurrent pitches / parallel games
- Multi‑group spaces (separate communities)


