<!-- 0e173a53-3953-4262-8ba9-c2f7ebe335c1 5d92780a-b23f-4499-b3c0-240d19384cdb -->
# Multi-Group System Implementation

## Database Schema Changes

### 1. Add Groups & Membership Tables

Create new tables in `src/lib/db/schema.ts`:

```typescript
// Groups table
export const groups = pgTable('groups', {
  ...auditFields,
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(), // 6-character code
  description: text('description'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  inviteCodeIdx: index('groups_invite_code_idx').on(table.inviteCode),
  activeIdx: index('groups_active_idx').on(table.isActive),
}));

// Group members with roles
export const groupMembers = pgTable('group_members', {
  ...auditFields,
  groupId: text('group_id').references(() => groups.id).notNull(),
  userId: text('user_id').notNull(), // References auth.users
  role: text('role').default('member').notNull(), // 'admin', 'member'
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  groupUserIdx: index('group_members_group_user_idx').on(table.groupId, table.userId),
  userIdx: index('group_members_user_idx').on(table.userId),
}));
```

### 2. Update Players Table

Add `groupId` and `userId` (nullable) to players:

```typescript
export const players = pgTable('players', {
  ...auditFields,
  groupId: text('group_id').references(() => groups.id).notNull(),
  userId: text('user_id'), // Nullable - links player to registered user
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  groupIdx: index('players_group_idx').on(table.groupId),
  userIdx: index('players_user_idx').on(table.userId),
  nameIdx: index('players_name_idx').on(table.name),
  activeIdx: index('players_active_idx').on(table.isActive),
}));
```

### 3. Add Group Context to All Entity Tables

Add `groupId` to: `matchdays`, `teams`, `games`, etc. (cascade from matchday)

## Migration Script

Create `scripts/migrate-to-groups.ts`:

1. Create "FC Yarkon" default group with generated invite code
2. Link all existing matchdays/players to this group
3. Create admin group membership for all existing users

## UI Components

### 1. Group Switcher (`src/components/groups/GroupSwitcher.tsx`)

Replace "Stanga" in AppShell header with dropdown showing:
- Current group name
- List of user's groups
- "Join Group" option
- "Create Group" option

### 2. Join Group Modal (`src/components/groups/JoinGroupModal.tsx`)

Two methods:
- Input field for 6-character invite code
- Auto-join if accessed via invite link

### 3. Create Group Modal (`src/components/groups/CreateGroupModal.tsx`)

Form with:
- Group name (required)
- Description (optional)
- Auto-generate 6-character invite code
- Creator becomes admin

### 4. Group Settings Page (`src/app/groups/[id]/settings/page.tsx`)

Admin-only page with:
- Group details editing
- Invite code display/regenerate
- Member list with role management
- Remove members functionality

### 5. Player Identity Link (`src/components/players/LinkPlayerModal.tsx`)

Allow users to claim/link themselves to existing guest players in the group

## API Routes

### Group Management
- `POST /api/groups` - Create group
- `GET /api/groups/[id]` - Get group details
- `PATCH /api/groups/[id]` - Update group (admin only)
- `DELETE /api/groups/[id]` - Soft delete group (admin only)

### Group Membership
- `POST /api/groups/[id]/join` - Join via invite code
- `GET /api/groups/[id]/members` - List members
- `PATCH /api/groups/[id]/members/[userId]` - Update member role (admin only)
- `DELETE /api/groups/[id]/members/[userId]` - Remove member (admin only)

### Player Identity
- `POST /api/players/[id]/claim` - Link player to current user
- `DELETE /api/players/[id]/claim` - Unlink player from user

## Context & Auth

### 1. Group Context Provider (`src/lib/hooks/use-group-context.ts`)

Store current active group in:
- Client-side context/state
- Cookie for server-side access
- Sync across tabs

### 2. Permission Guards (`src/lib/auth-guards.ts`)

Add functions:
- `isGroupAdmin(userId, groupId)` - Check admin status
- `isGroupMember(userId, groupId)` - Check membership
- `canManageMatchdays(userId, groupId)` - Admin-only actions

### 3. Middleware Updates (`src/middleware.ts`)

Validate group access for all protected routes

## Updated Hooks

Modify existing hooks to filter by current group:
- `use-matchdays.ts` - Filter by groupId
- `use-players.ts` - Filter by groupId
- `use-stats.ts` - Calculate per-group stats
- Add new: `use-groups.ts`, `use-group-members.ts`

## Key Features

**Group Invite Links:**
Format: `https://stanga.app/groups/join?code=ABC123`

**Guest vs Registered Players:**
- Guest players: Just name, no userId, group-specific
- Registered players: Have userId, can track across groups
- Users can "claim" guest players to link them

**Role Permissions:**
- Admins: Full CRUD on matchdays, players, games, group settings
- Members: Read-only + can log goals/events during active games

## Migration Steps

1. Run database migration to add new tables/columns
2. Execute data migration script (creates FC Yarkon, links data)
3. Deploy UI changes with group switcher
4. Users automatically see existing data in FC Yarkon group

### To-dos

- [ ] Add groups, groupMembers tables and update existing tables with groupId
- [ ] Create migration script to move existing data to FC Yarkon default group
- [ ] Implement group context provider and hooks for managing active group
- [ ] Add role-based permission guards for admin/member actions
- [ ] Create API routes for group CRUD and membership management
- [ ] Build group switcher component in AppShell header
- [ ] Implement join group (code/link) and create group flows
- [ ] Create group settings page for admins (members, invite codes, details)
- [ ] Add player claim/link functionality for registered users
- [ ] Update matchdays, players, stats hooks to filter by active group