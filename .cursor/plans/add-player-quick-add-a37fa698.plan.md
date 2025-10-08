<!-- a37fa698-6bfe-4769-92ac-7d0673a5a376 c4d64c35-5f56-4b5e-9387-0f840641d9d1 -->
# Add Quick Player Creation to Available Players

## Overview

Add a Plus icon button at the bottom of the Available Players card that reveals an inline form for quickly creating new players. The form will support rapid sequential additions similar to the Players page.

## Implementation Details

### 1. Modify UnassignedPlayersCard Component

**File:** `src/components/matchdays/TeamManagement.tsx` (lines 631-677)

Add state and functionality to the `UnassignedPlayersCard` component:

**Changes needed:**

- Import `useCreatePlayer` hook and `Plus` icon from lucide-react
- Add state for showing/hiding the inline form: `const [showAddForm, setShowAddForm] = useState(false)`
- Add state for new player name: `const [newPlayerName, setNewPlayerName] = useState("")` 
- Add ref for input autofocus: `const inputRef = useRef<HTMLInputElement>(null)`
- Integrate `useCreatePlayer` mutation hook
- Create form submit handler that:
- Creates the player via mutation
- Resets the input field to empty
- Keeps the form visible for next addition
- Re-focuses the input for quick sequential adds

**UI Structure:**
After the existing players list (after line 673), add:

- Plus icon button at bottom of card (only if `canEdit` is true)
- Conditionally rendered inline form below button (when `showAddForm` is true):
- Compact horizontal layout: text input + icon button
- Input: `flex-1`, placeholder "Player name", value bound to state
- Submit button: Plus icon, compact size
- Handle Enter key for submission
- Handle Escape key to close form

### 2. Styling Considerations

- Keep form compact to fit within the sticky sidebar width (w-80)
- Use existing design system components (border, rounded, padding)
- Match the existing card aesthetic
- Icon button should be small and unobtrusive
- Form should appear/disappear smoothly

### 3. User Experience Flow

1. User clicks Plus icon button at bottom of Available Players
2. Inline form appears below the button
3. Input is auto-focused
4. User types player name and presses Enter (or clicks Plus icon)
5. Player is created and appears in the Available Players list
6. Form stays visible, input clears, and refocuses for next player
7. User can click Plus button again or click outside to close form

### 4. Edge Cases

- Handle loading state during player creation
- Disable submit when input is empty
- Prevent duplicate submissions while mutation is pending
- Show form only when user has edit permissions (`canEdit`)
- Handle creation errors gracefully (existing mutation hook handles this)

## Files to Modify

- `src/components/matchdays/TeamManagement.tsx` - Add quick-add functionality to `UnassignedPlayersCard` component