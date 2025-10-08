<!-- 026c69a7-47b4-43b0-bf71-b2b2054bc18e cc4b57e5-5955-49dd-975a-3ec4d469ef7a -->
# Navigation Menu Redesign: Consolidate Top Bar and Remove Bottom Navigation

## Overview

This plan consolidates all navigation elements into the top bar, removes the bottom navigation, and enhances the group dropdown with additional functionality including a new Group Overview page.

## Implementation Strategy

### Phase 1: Remove Bottom Navigation

- Remove `BottomNav` component from `src/app/layout.tsx`
- Delete `src/components/navigation/BottomNav.tsx` 
- Remove bottom padding (`pb-16`) from body in `src/app/layout.tsx`
- Delete associated test file `src/tests/BottomNav.test.tsx`

### Phase 2: Move Dark Mode Toggle to Profile Menu

- Remove `ModeToggle` import and usage from `src/components/layout/AppShell.tsx`
- Add dark mode toggle to `src/components/auth/UserMenu.tsx` dropdown
- Update UserMenu dropdown layout to include theme toggle with proper separator

### Phase 3: Add Navigation Buttons to Top Bar

- Add "Players" and "Stats" buttons to `src/components/layout/AppShell.tsx`
- Use `Users` and `BarChart3` icons from lucide-react (same as bottom nav)
- Implement responsive design with proper spacing
- Add proper ARIA labels and navigation semantics

### Phase 4: Create Group Overview Page

- Create `src/app/groups/[id]/page.tsx` for group overview
- Display group information, rules, and basic statistics
- Add proper routing and navigation structure
- Include group admin-only content where appropriate

### Phase 5: Redesign Group Dropdown Menu

- Modify `src/components/groups/GroupSwitcher.tsx` to match new structure:
- Add "Switch Group" button next to current group name
- Add "Group Settings" option (admin only)
- Add separator before navigation section
- Add "Group Overview", "Players", and "Stats" navigation options
- Update dropdown styling and layout for better organization

### Phase 6: Update Routing and Navigation Logic

- Ensure all navigation links work correctly
- Update active state logic for new navigation structure
- Test group context and permissions for admin-only features

## Key Files to Modify

1. **`src/app/layout.tsx`** - Remove BottomNav and bottom padding
2. **`src/components/layout/AppShell.tsx`** - Remove ModeToggle, add navigation buttons
3. **`src/components/auth/UserMenu.tsx`** - Add dark mode toggle to dropdown
4. **`src/components/groups/GroupSwitcher.tsx`** - Redesign dropdown structure
5. **`src/app/groups/[id]/page.tsx`** - Create new Group Overview page

## Files to Delete

1. **`src/components/navigation/BottomNav.tsx`**
2. **`src/tests/BottomNav.test.tsx`**

## Technical Considerations

- Maintain responsive design for mobile devices
- Preserve all existing functionality during transition
- Ensure proper accessibility with ARIA labels
- Test group admin permissions for settings access
- Verify navigation state management works correctly

### To-dos

- [ ] Remove bottom navigation component and clean up layout
- [ ] Move dark mode toggle from top bar to profile menu dropdown
- [ ] Add Players and Stats navigation buttons to top bar
- [ ] Create new Group Overview page with group information and rules
- [ ] Redesign group dropdown menu with new structure and navigation options
- [ ] Test and ensure responsive design works on mobile and desktop
- [ ] Verify accessibility compliance and add proper ARIA labels