# Stanga — Design SST (UX/UI)

## Principles

- Minimal, distraction‑free, fast
- Mobile‑first; one‑hand navigation; large tap targets
- Clear hierarchy; obvious primary actions; undo where possible
- Accessible (WCAG AA): contrast, focus states, semantic HTML

## Information Architecture

- Bottom nav (mobile): Dashboard, Matchdays, Players, Stats, Profile
- Matchday detail tabs: Overview, Teams, Games, Stats, Activity
- Quick actions on Dashboard: Create Matchday, Manage Players, Resume Current Game

## Key Screens (mobile‑first)

0) Public Browse
   - Anyone can view Dashboard/Matchdays/Players/Stats (read‑only)
   - Prominent sign‑in CTA to contribute
1) Auth
   - Buttons: “Continue with Google”, “Continue with Email”
   - Brand wordmark: Stanga
2) Dashboard
   - Next matchday card (time, location, team readiness)
   - Recent results snippet, top scorers (last 7 days)
   - Quick actions
3) Players
   - Search bar; list with avatars/initials
   - Add player FAB; edit sheet modal
4) Matchdays
   - Cards with date/time/location; status (upcoming/active/past)
   - Create button (top right)
5) Matchday → Teams
   - Three columns/sections (A/B/C), color‑coded
   - Add from pool; counts per team; validation on size
   - Color selector per team (chip palette), derived team name like “Orange Team”
   - Formation view toggle: choose template (e.g., 2‑2‑1, 2‑1‑2, 1‑2‑1‑1), then drag players into slots on a mini‑pitch
6) Matchday → Games
   - Current game panel: large timer, scores, goal/assist picker, undo last
   - Start new game (suggested matchup per rotation)
   - Recent results list
   - Penalties modal: record winner, then per‑kick list with player, order, and result (scored/missed/saved/post/bar)
7) Stats
   - Tabs: Overall | This Matchday | Players | Teams
   - Charts/cards: top scorers, assists, win rates
   - Win weighting: indicate that penalty wins are counted with reduced weight (e.g., 0.5)
   - Standings table (per matchday): Team (color), GP, W, PW, D, L, GF, GA, GD, Pts
8) Activity
   - Reverse‑chronological list of edits with actor and timestamp

## Components

- App shell: sticky header with brand wordmark and theme toggle, bottom nav (mobile), left nav (desktop)
- Cards, List items with leading avatar, Badge (team color), Pill counters
- Inputs: segmented controls for team selection, numeric steppers for score
- Interactive elements: all clickable elements use pointer cursor for clear affordance
- DnD pitch: grid with slot placeholders; player chips draggable; long‑press on mobile
- Color picker: curated palette ensuring contrast/accessibility
- Dialogs/sheets: create/edit entities; destructive action confirms
- Toasts for success/error; inline validation messages
- Trash views: filter to show deleted items with restore/permanent delete actions

## Theming

- System: light/dark auto + manual toggle in Profile
- Base scale: 8px spacing; radii 8/12/16; shadow subtle

### Color Tokens

- Brand: emerald 500 (#10B981)
- Team A: blue 500 (#3B82F6)
- Team B: amber 500 (#F59E0B)
- Team C: rose 500 (#EF4444)
- Success: green 500 (#22C55E); Error: red 500 (#EF4444); Warning: amber 500 (#F59E0B)

Light mode
- Background: #FFFFFF
- Surface: #F8FAFC
- Text: #0F172A
- Muted text: #475569

Dark mode
- Background: #0B1220
- Surface: #0F172A
- Text: #E2E8F0
- Muted text: #94A3B8

### Typography

- Font: Inter (fallback: system-ui, -apple-system, Segoe UI, Roboto)
- Scale: 16 base; H1 28, H2 22, H3 18, Body 16, Small 14
- Weight: 600 headings; 400 body

## Micro‑interactions

- Timer ticks per second; vibrate (if permitted) at period end
- Score buttons animate and confirm with haptic/ sound (optional)
- Undo snackbar with “Revert”
 - Soft delete: after delete, show toast with “Restore” shortcut for a few seconds

## Accessibility Specifics

- Minimum touch target 44x44
- Focus visible outlines; prefers-reduced-motion support
- Color alone never conveys state; include labels/icons
- Pointer cursor on all clickable elements (buttons, links, interactive cards, form controls)

## Empty States & Errors

- Friendly guidance with primary action buttons
- Retry with exponential backoff; offline guard messages

## Iconography

- Lucide or Heroicons (outline for default, solid for active)

## Brand

- Wordmark “Stanga” typeset in Inter SemiBold with slight letter spacing
- Optional field pattern background at low opacity on hero cards


