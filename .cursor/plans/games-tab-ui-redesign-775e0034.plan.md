<!-- 775e0034-1e34-4133-a78d-506bb7f7b18c 9614320b-5279-485f-89a6-2c40858c429f -->
# Games Tab UI Redesign

## Overview

Redesign the games tab interface in the matchday page with:

1. Shadcn Select component for team selection
2. Repositioned stopwatch with controls (play/pause, restart, +/-20)
3. Inline goal management under score circles with plus button dropdowns
4. End game and penalties buttons below score
5. Inline penalty scoring interface below main score

## Key Files to Modify

- `src/components/matchdays/GameManagement.tsx` - Main game management component
- `src/components/ui/select.tsx` - New shadcn Select component (to be created)
- `src/components/ui/dropdown-menu.tsx` - Existing component for goal logging
- `src/components/ui/tooltip.tsx` - Existing component for disabled button tooltips

## Implementation Steps

### 1. Create shadcn Select Component

Create `src/components/ui/select.tsx` with the standard shadcn Select component implementation (Select, SelectTrigger, SelectContent, SelectItem, SelectValue).

### 2. Redesign GameTimer Component

Transform the `GameTimer` component (lines 26-69 in GameManagement.tsx) into a card with:

- Time display on the left
- Control buttons on the right: Play/Pause toggle, Restart, +20 seconds, -20 seconds
- Needs state for paused/playing and ability to adjust elapsed time
- Green styling to indicate active game

### 3. Update GameQueue Component  

Replace native `<select>` elements (lines 364-399 in GameManagement.tsx) with shadcn Select components for both team dropdowns.

### 4. Redesign ActiveGame Score Section

Modify the score display section (lines 192-228) to:

- Remove the "VS" and stopwatch from the center
- Add stopwatch card at the top (next to "Active Game" heading or below it)
- Add a `+` button next to each team's score circle
- `+` button opens a shadcn dropdown-menu with all players from that team
- Clicking a player in dropdown calls `handleAddGoal` and increments score

### 5. Create Goal Rows Under Score

Below the score circles, render goal rows (similar to "Recent Results" style from lines 534-566):

- Each goal as a row with team color indicator, player name, minute
- Include edit and delete buttons for each goal
- Goals from both teams displayed in chronological order
- Style similar to `ChronologicalGoalsList` component

### 6. Add Game Control Buttons

Below the goal rows section (replacing current section at lines 258-278):

- "End Game" button (always enabled)
- "Go to Penalties" button (disabled if not tied, with tooltip explaining requirement)
- Use shadcn Tooltip for the disabled state explanation

### 7. Redesign Penalty Mode

Update `PenaltyMode` component (lines 794-1009) to show inline below main score:

- Keep main score circles visible at top
- Add shadcn Separator component below main score
- Show penalty score circles below separator (same style as main, but for penalties)
- Penalty goal rows appear below regular goal rows, separated visually
- Use same `+` button dropdown pattern for penalty scoring
- Keep "Back to Game" functionality

### 8. Remove GoalList Component Usage

Remove the grid layout with `GoalList` components (lines 232-256) and replace with:

- Inline goal rows under score
- Plus button dropdowns for adding goals
- Edit/delete functionality on each goal row

## Technical Details

### Stopwatch State Management

- Add `isPaused` state to control timer running
- Add `timeAdjustment` state to track manual time changes
- Modify timer calculation to respect paused state and adjustments
- Play/Pause button toggles `isPaused`
- Restart button resets timer to 0
- +20/-20 buttons adjust `timeAdjustment` by 20 seconds

### Goal Management Flow

- Plus button next to score opens dropdown with team players
- Dropdown items call `handleAddGoal(teamId, playerId)`
- Goal rows render below with edit/delete icons
- Edit icon opens inline edit form (similar to current GoalList)
- Delete icon shows confirmation dialog then calls `handleDeleteGoal`

### Penalty Mode Integration

- When "Go to Penalties" clicked, penalty section appears inline
- Shadcn Separator divides regular and penalty sections
- Penalty scores show in circles below separator
- Penalty goal rows appear below regular goal rows with visual distinction
- Same dropdown pattern for penalty goal logging

## Dependencies

- Install shadcn Select if not already present
- Use existing shadcn components: dropdown-menu, separator, tooltip, button, badge

### To-dos

- [ ] Create shadcn Select component in src/components/ui/select.tsx
- [ ] Redesign GameTimer component with controls card (play/pause, restart, +/-20)
- [ ] Replace native select with shadcn Select in GameQueue component
- [ ] Add plus buttons next to score circles with player dropdown menus
- [ ] Create goal rows under score with edit/delete functionality
- [ ] Add End Game and Go to Penalties buttons below score with tooltip for disabled state
- [ ] Redesign PenaltyMode to display inline below main score with separator
- [ ] Remove GoalList component usage and clean up unused code