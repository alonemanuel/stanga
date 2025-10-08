<!-- 50d8e023-1e40-4e29-9675-f8dc52ff611e 1c16054e-b7c4-47c6-86ea-a3a354faa78b -->
# Sidebar Navigation Implementation Plan

## Phase 1: Install shadcn Sidebar Components

### Install required shadcn/ui components

Run the following commands to add necessary UI components:

```bash
npx shadcn@latest add sidebar
npx shadcn@latest add breadcrumb
npx shadcn@latest add separator
npx shadcn@latest add collapsible
```

These will create:

- `src/components/ui/sidebar.tsx` - Core sidebar primitives
- `src/components/ui/breadcrumb.tsx` - For page title display
- `src/components/ui/separator.tsx` - Visual separators
- `src/components/ui/collapsible.tsx` - For matchdays dropdown

## Phase 2: Create New Sidebar Components

### 2.1 Create AppSidebar Component

**File**: `src/components/layout/AppSidebar.tsx`

This is the main sidebar component with four sections:

- **SidebarHeader**: Group switcher (adapt existing GroupSwitcher)
- **SidebarContent**: Navigation items + collapsible matchdays
- **SidebarFooter**: User menu with avatar
- **SidebarRail**: Visual rail for collapsed state

Key implementation details:

```typescript
<Sidebar collapsible="icon">
  <SidebarHeader>
    <GroupSwitcherSidebar /> {/* Adapted version */}
  </SidebarHeader>
  <SidebarContent>
    <NavMain /> {/* Overview, Players, Stats */}
    <NavMatchdays /> {/* Collapsible matchdays list */}
  </SidebarContent>
  <SidebarFooter>
    <NavUser /> {/* User menu with avatar */}
  </SidebarFooter>
  <SidebarRail />
</Sidebar>
```

### 2.2 Create NavMain Component

**File**: `src/components/layout/NavMain.tsx`

Navigation for main routes (non-collapsible):

- **Overview** (`/overview`) - Home icon
- **Players** (`/players`) - Users icon  
- **Stats** (`/stats`) - BarChart3 icon

Use `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` from shadcn.

Use `usePathname()` to highlight active route.

Use Next.js `Link` component for navigation.

Example structure:

```typescript
<SidebarGroup>
  <SidebarGroupLabel>Navigation</SidebarGroupLabel>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname === '/overview'}>
        <Link href="/overview">
          <Home />
          <span>Overview</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
    {/* Players, Stats items... */}
  </SidebarMenu>
</SidebarGroup>
```

### 2.3 Create NavMatchdays Component

**File**: `src/components/layout/NavMatchdays.tsx`

Collapsible section showing list of matchdays by date:

- Use `Collapsible` from shadcn with `defaultOpen={true}`
- Use `useMatchdays()` hook to fetch matchdays
- Show first 10 matchdays, then "See More" button
- Each matchday shows formatted date (e.g., "Jan 15, 2025")
- Links to `/matchdays/[id]`
- Show Calendar icon for the group header
- Show loading skeleton when fetching

Structure:

```typescript
<Collapsible defaultOpen className="group/collapsible">
  <SidebarGroup>
    <SidebarGroupLabel asChild>
      <CollapsibleTrigger>
        <Calendar />
        Matchdays
        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
    </SidebarGroupLabel>
    <CollapsibleContent>
      <SidebarMenuSub>
        {matchdays.slice(0, displayLimit).map(matchday => (
          <SidebarMenuSubItem key={matchday.id}>
            <SidebarMenuSubButton asChild>
              <Link href={`/matchdays/${matchday.id}`}>
                {formatDate(matchday.scheduledAt)}
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
        {matchdays.length > displayLimit && (
          <Button onClick={() => setDisplayLimit(displayLimit + 10)}>
            See More
          </Button>
        )}
      </SidebarMenuSub>
    </CollapsibleContent>
  </SidebarGroup>
</Collapsible>
```

Date formatting: Use `format(new Date(scheduledAt), 'MMM dd, yyyy')` from `date-fns`.

### 2.4 Create GroupSwitcherSidebar Component

**File**: `src/components/layout/GroupSwitcherSidebar.tsx`

Adapt the existing `GroupSwitcher` for sidebar use:

- Reuse logic from `src/components/groups/GroupSwitcher.tsx`
- Use `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` layout
- Display active group name + icon (use Users icon as default)
- Dropdown shows:
  - Current group info (name)
  - Switch to other groups
  - Join Group (opens modal)
  - Create Group (opens modal)
  - Settings (if admin) - links to `/groups/[id]/settings`
- Keep existing modals: `JoinGroupModal`, `CreateGroupModal`

Use `DropdownMenu` for the switcher dropdown similar to the reference TeamSwitcher:

```typescript
<SidebarMenu>
  <SidebarMenuItem>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg">
          <Users className="h-4 w-4" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{activeGroup.name}</span>
            <span className="truncate text-xs">{memberCount} members</span>
          </div>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* Groups list, Join, Create, Settings */}
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem>
</SidebarMenu>
```

### 2.5 Create NavUser Component

**File**: `src/components/layout/NavUser.tsx`

User menu in sidebar footer:

- Reuse logic from `src/components/auth/UserMenu.tsx`
- Show avatar (first letter of name as fallback)
- Display name and email
- Dropdown menu with:
  - View Profile (`/profile`)
  - Settings (if needed, or remove)
  - Theme toggle (Dark/Light mode)
  - Sign Out

Use `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` with dropdown:

```typescript
<SidebarMenu>
  <SidebarMenuItem>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{displayName}</span>
            <span className="truncate text-xs">{email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User /> View Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'dark' ? <Sun /> : <Moon />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem>
</SidebarMenu>
```

Use `useAuth()` hook for user data and `useTheme()` for theme toggling.

## Phase 3: Update AppShell Layout

### 3.1 Replace AppShell with Sidebar Layout

**File**: `src/components/layout/AppShell.tsx`

Replace the current top header navigation with sidebar layout:

```typescript
"use client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Derive page title from pathname
  const getPageTitle = () => {
    if (pathname === '/overview') return 'Overview';
    if (pathname === '/players') return 'Players';
    if (pathname === '/stats') return 'Stats';
    if (pathname.startsWith('/matchdays')) return 'Matchdays';
    if (pathname.startsWith('/groups/') && pathname.endsWith('/settings')) return 'Group Settings';
    if (pathname === '/profile') return 'Profile';
    return 'Dashboard';
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with sidebar trigger and page title */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        {/* Main content */}
        <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Remove old header navigation, keep skip-to-content link (move to sidebar if needed).

## Phase 4: Create Overview/Dashboard Page

### 4.1 Create Overview Page

**File**: `src/app/overview/page.tsx`

New dashboard/overview page showing:

- Welcome message with group name
- Quick stats cards (total players, upcoming matchdays, recent activity)
- Recent matchdays list (next 3 upcoming)
- Quick actions (Create Matchday, Add Player)

Example structure:

```typescript
export default async function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Welcome to your group dashboard</p>
      </div>
      
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playerCount}</div>
          </CardContent>
        </Card>
        {/* More cards... */}
      </div>
      
      {/* Upcoming matchdays */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Matchdays</CardTitle>
        </CardHeader>
        <CardContent>
          {/* List of next 3 matchdays */}
        </CardContent>
      </Card>
    </div>
  );
}
```

Use existing hooks: `useMatchdays()`, `usePlayers()`, `useGroupContext()` to fetch data.

### 4.2 Update Root Page to Redirect

**File**: `src/app/page.tsx`

Update root page to redirect to `/overview` when user has active group:

```typescript
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroupContext } from '@/lib/hooks/use-group-context';

export default function HomePage() {
  const router = useRouter();
  const { activeGroup, isLoading } = useGroupContext();
  
  useEffect(() => {
    if (!isLoading) {
      if (activeGroup) {
        router.replace('/overview');
      } else {
        // Show "join or create group" message
      }
    }
  }, [activeGroup, isLoading, router]);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="container flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Stanga</h1>
        <p className="text-muted-foreground">Join or create a group to get started</p>
      </div>
    </div>
  );
}
```

## Phase 5: Update Navigation Links Throughout App

### 5.1 Update Matchdays Page Links

**File**: `src/app/matchdays/page.tsx`

Ensure breadcrumb and navigation work with new sidebar.

Remove any old header-specific navigation code.

### 5.2 Update Individual Matchday Pages

**File**: `src/app/matchdays/[id]/[[...tab]]/page.tsx`

Update breadcrumb to show: Overview > Matchdays > [Matchday Name]

Ensure back navigation works properly.

### 5.3 Update Players Page

**File**: `src/app/players/page.tsx`

Ensure compatibility with sidebar navigation.

Remove any old navigation patterns.

### 5.4 Update Stats Page

**File**: `src/app/stats/page.tsx`

Ensure compatibility with sidebar navigation.

## Phase 6: Cleanup Old Components

### 6.1 Archive or Remove Old Components

- Keep `src/components/groups/GroupSwitcher.tsx` for now (might be useful)
- Keep `src/components/auth/UserMenu.tsx` for now (might be useful)
- Update `src/components/mode-toggle.tsx` to be used in sidebar if needed

### 6.2 Update Imports

Search and replace any imports of old `AppShell` to ensure they use the new version.

## Phase 7: Styling and Responsiveness

### 7.1 Mobile Responsiveness

The shadcn sidebar is responsive by default:

- On mobile: Sidebar becomes an overlay
- `useSidebar()` hook provides `isMobile` flag
- Sidebar trigger shows hamburger icon

Ensure `DropdownMenuContent` uses proper `side` prop:

```typescript
side={isMobile ? "bottom" : "right"}
```

### 7.2 Theme Integration

Verify dark/light mode works with sidebar:

- Test sidebar colors in both themes
- Ensure active states are visible
- Check contrast ratios for accessibility

### 7.3 Accessibility

- Ensure all interactive elements have proper ARIA labels
- Test keyboard navigation through sidebar
- Verify screen reader compatibility
- Keep skip-to-content link functional

## Phase 8: Testing

### 8.1 Manual Testing Checklist

- [ ] Sidebar opens/closes correctly
- [ ] Group switching works and updates context
- [ ] Matchdays collapsible expands/collapses
- [ ] "See More" for matchdays works (if >10 matchdays)
- [ ] User menu dropdown functions properly
- [ ] Theme toggle works from user menu
- [ ] Sign out works
- [ ] All navigation links route correctly
- [ ] Active route highlighting works
- [ ] Mobile responsive overlay works
- [ ] Overview page displays correctly
- [ ] Root page redirects to overview when group active

### 8.2 Edge Cases

- [ ] User with no groups (show appropriate message)
- [ ] User with many matchdays (>50, test "See More")
- [ ] Very long group/user names (truncation works)
- [ ] Rapid group switching (no race conditions)
- [ ] Deep linking to routes (e.g., `/matchdays/123`)

## Implementation Order Summary

1. Install shadcn components (sidebar, breadcrumb, separator, collapsible)
2. Create NavMain, NavMatchdays, GroupSwitcherSidebar, NavUser components
3. Create AppSidebar component assembling all parts
4. Update AppShell to use SidebarProvider and new layout
5. Create `/overview` page with dashboard content
6. Update root page to redirect to overview
7. Test thoroughly across all routes and devices
8. Clean up old unused code

## Key Files to Modify/Create

**New Files:**

- `src/components/ui/sidebar.tsx` (auto-generated)
- `src/components/ui/breadcrumb.tsx` (auto-generated)
- `src/components/ui/separator.tsx` (auto-generated)
- `src/components/ui/collapsible.tsx` (auto-generated)
- `src/components/layout/AppSidebar.tsx` ⭐
- `src/components/layout/NavMain.tsx` ⭐
- `src/components/layout/NavMatchdays.tsx` ⭐
- `src/components/layout/GroupSwitcherSidebar.tsx` ⭐
- `src/components/layout/NavUser.tsx` ⭐
- `src/app/overview/page.tsx` ⭐

**Modified Files:**

- `src/components/layout/AppShell.tsx` (complete rewrite)
- `src/app/page.tsx` (add redirect logic)
- `src/app/layout.tsx` (no changes needed, just verification)

**Dependencies:**

- `date-fns` (for date formatting) - may need to install if not present

### To-dos

- [ ] Install shadcn/ui components: sidebar, breadcrumb, separator, collapsible
- [ ] Create NavMain component for main navigation (Overview, Players, Stats)
- [ ] Create NavMatchdays component with collapsible matchdays list and 'See More' functionality
- [ ] Create GroupSwitcherSidebar component adapting existing GroupSwitcher for sidebar
- [ ] Create NavUser component for sidebar footer with avatar and user menu
- [ ] Create AppSidebar component assembling all sidebar sections
- [ ] Update AppShell component to use SidebarProvider and new sidebar layout
- [ ] Create overview/dashboard page at /overview route with stats and quick actions
- [ ] Update root page to redirect to /overview when user has active group
- [ ] Test sidebar functionality, navigation, responsiveness, and edge cases