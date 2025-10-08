<!-- 8e15f74f-4cb4-4615-9eec-2d35042f972d dce30fc8-2907-488b-a484-357acb674e45 -->
# Matchday Page Redesign

## Overview

Transform the matchday detail page with improved navigation, cleaner layout, sticky bottom tabs, and inline editing capabilities.

## Key Changes

### 1. Header & Breadcrumb Navigation

**File:** `src/components/layout/AppShell.tsx`

- Update `getPageTitle()` to detect matchday detail pages (`/matchdays/[id]`)
- Return breadcrumb-style title: "Matchdays → [Date]" with clickable navigation
- Add three-dot menu (DropdownMenu from shadcn) next to breadcrumb for delete action
- Remove the back button and title/subtitle from the page content

### 2. Install shadcn Tabs Component

**Command:** `npx shadcn@latest add tabs`

- Install the tabs component for the sticky bottom navigation

### 3. Sticky Bottom Tabs

**File:** `src/app/matchdays/[id]/[[...tab]]/page.tsx`

- Replace current border-bottom tabs (lines 499-536) with shadcn Tabs component
- Position tabs fixed at bottom: `fixed bottom-0 left-0 right-0 z-50`
- Three tabs only: Overview, Games, Teams (remove Stats tab)
- Style with backdrop blur and border-top for floating effect

### 4. Overview Tab Redesign

**File:** `src/app/matchdays/[id]/[[...tab]]/page.tsx`

- Keep collapsible "Matchday Information" section with pencil icon for inline editing
- Keep collapsible "Game Rules" section with pencil icon for inline editing
- Add icons to Information fields:
- Calendar icon for Date & Time
- MapPin icon for Location
- Users icon for Team Size
- Hash icon for Number of Teams
- Remove Status chip from Information section
- Move Stats tab content (lines 378-447) into Overview tab below collapsibles
- Include summary cards, StandingsTable, and TopScorerTable

### 5. Inline Editing State Management

**File:** `src/app/matchdays/[id]/[[...tab]]/page.tsx`

- Add state: `isEditingInfo` and `isEditingRules` (separate from current `isEditing`)
- When pencil clicked, convert display fields to form inputs inline
- Replace pencil with checkmark icon when in edit mode
- On checkmark click, call `updateMutation.mutateAsync()` and revert to display mode
- Use existing `MatchdayUpdateSchema` for validation

### 6. Three-Dot Delete Menu

**File:** `src/components/layout/AppShell.tsx`

- Import DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
- Add MoreVertical icon (three dots) next to breadcrumb
- Menu item: "Delete Matchday" with Trash2 icon
- Call existing `handleDeleteMatchday` logic with confirm dialog
- Only show menu when user is authenticated and on matchday detail page

### 7. Content Padding Adjustment

**File:** `src/app/matchdays/[id]/[[...tab]]/page.tsx`

- Add bottom padding to content area: `pb-24` to account for fixed bottom tabs
- Remove header section (lines 456-496) - now handled by AppShell
- Remove back button, title, and subtitle

## Files to Modify

1. `src/components/layout/AppShell.tsx` - Breadcrumb navigation + three-dot menu
2. `src/app/matchdays/[id]/[[...tab]]/page.tsx` - Main redesign: tabs, inline editing, layout
3. Install shadcn tabs component

## Implementation Notes

- Use existing hooks: `useMatchday`, `useUpdateMatchday`, `useDeleteMatchday`, `useMatchdayStats`
- Preserve all existing functionality (team management, game management)
- Maintain accessibility with proper ARIA labels
- Keep confirm dialog for delete action
- Reuse `CollapsibleSection` component for Information and Rules