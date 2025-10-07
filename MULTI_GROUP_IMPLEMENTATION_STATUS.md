# Multi-Group System Implementation Status

## ✅ Completed

### Database Schema
- ✅ Added `groups` table with invite codes
- ✅ Added `groupMembers` table with role support (admin/member)
- ✅ Updated `players` table with `groupId` and `userId` (for linking to registered users)
- ✅ Updated `matchdays` table with `groupId`
- ✅ Created migration SQL file: `drizzle/0004_add_groups_and_update_schema.sql`
- ✅ Created data migration script: `scripts/migrate-to-groups.ts`

### Authentication & Permissions
- ✅ Added permission guards in `src/lib/auth-guards.ts`:
  - `isGroupMember()` - Check if user is member
  - `isGroupAdmin()` - Check if user is admin
  - `requireGroupMember()` - Enforce membership
  - `requireGroupAdmin()` - Enforce admin access
  - `canManageMatchdays()` - Check management permissions

### Group Context & State Management
- ✅ Created `GroupProvider` in `src/lib/hooks/use-group-context.tsx`
  - Manages active group state
  - Persists to cookies (30 days)
  - Syncs across browser tabs
- ✅ Added GroupProvider to app providers
- ✅ Installed `js-cookie` and `@types/js-cookie`

### Group Management Hooks
- ✅ Created `useGroups()` hook in `src/lib/hooks/use-groups.ts` with:
  - `fetchUserGroups()` - Get all groups for user
  - `createGroup()` - Create new group
  - `joinGroup()` - Join via invite code
  - `updateGroup()` - Update group details
  - `regenerateInviteCode()` - Generate new invite code
  - `fetchGroupMembers()` - Get group members
  - `updateMemberRole()` - Change member role
  - `removeMember()` - Remove member from group

### API Routes - Group Management
- ✅ `GET /api/groups` - List user's groups
- ✅ `POST /api/groups` - Create group (auto-generates 6-char invite code)
- ✅ `POST /api/groups/join` - Join group via invite code
- ✅ `GET /api/groups/[id]` - Get group details
- ✅ `PATCH /api/groups/[id]` - Update group (admin only)
- ✅ `DELETE /api/groups/[id]` - Soft delete group (admin only)
- ✅ `GET /api/groups/[id]/members` - List members
- ✅ `PATCH /api/groups/[id]/members/[userId]` - Update role (admin only)
- ✅ `DELETE /api/groups/[id]/members/[userId]` - Remove member (admin only)
- ✅ `POST /api/groups/[id]/regenerate-code` - Regenerate invite code (admin only)

### UI Components
- ✅ `GroupSwitcher` component in header
  - Shows active group name
  - Dropdown with user's groups
  - "Join Group" and "Create Group" buttons
- ✅ `JoinGroupModal` - Join group via 6-character code
- ✅ `CreateGroupModal` - Create new group with name and description
- ✅ Updated `AppShell` to use GroupSwitcher instead of static "Stanga" text

### Hook Updates for Group Filtering
- ✅ Updated `use-matchdays.ts`:
  - Automatically adds `groupId` to queries
  - Only fetches when active group is set
  - Injects `groupId` when creating matchdays
- ✅ Updated `use-players.ts`:
  - Automatically adds `groupId` to queries
  - Only fetches when active group is set
  - Injects `groupId` when creating players
- ✅ Updated `use-stats.ts`:
  - Passes `groupId` to stats API
  - Only fetches when active group is set

## ✅ All Implementation Complete!

All code has been implemented. The following sections describe what was built:

### 1. API Routes for Group Filtering ✅
All API routes have been updated to support group-based filtering:

#### Matchdays API
- ✅ `GET /api/matchdays/route.ts` - Filters by `groupId` query parameter
- ✅ `POST /api/matchdays/route.ts` - Validates user is admin and requires `groupId`
- ✅ Updated validation schemas to accept `groupId`

#### Players API
- ✅ `GET /api/players/route.ts` - Filters by `groupId` query parameter
- ✅ `POST /api/players/route.ts` - Validates admin access and requires `groupId`
- ✅ Updated validation schemas for `groupId` and `userId`

#### Stats API
- ✅ `GET /api/stats/overall/route.ts` - Filters by `groupId` query parameter
- ✅ Filters both matchdays and players by group

### 2. Group Settings Page ✅
Created `src/app/groups/[id]/settings/page.tsx` with:
- ✅ Group details editing (name, description)
- ✅ Invite code display with copy button
- ✅ Regenerate invite code button
- ✅ Member list with role badges
- ✅ Role management (promote/demote members)
- ✅ Remove member functionality with confirmation
- ✅ Admin-only access

### 3. Player Identity / Claim Feature ✅
Player claim functionality implemented:
- ✅ `POST /api/players/[id]/claim` - Links guest player to current user
- ✅ `DELETE /api/players/[id]/claim` - Unlinks player from user
- ✅ Validates group membership before claiming
- ✅ Prevents claiming already-claimed players
- ✅ Ready for UI integration in player list component

### 4. Database Migration Execution

**Prerequisites:**
1. Create a `.env` file in the project root (copy from `env.example`)
2. Set `DATABASE_URL` to your PostgreSQL database connection string
3. Ensure database is running and accessible

**Steps to run migrations:**

```bash
# 1. Make sure .env file exists with DATABASE_URL
cat .env | grep DATABASE_URL

# 2. Push schema changes to database
npm run db:push

# 3. Run data migration script to create FC Yarkon and migrate existing data
npx tsx scripts/migrate-to-groups.ts
```

**What the migration does:**
- Creates `groups` and `group_members` tables
- Adds `groupId` column to `players` and `matchdays` tables
- Creates "FC Yarkon" default group with a unique invite code
- Migrates all existing matchdays and players to FC Yarkon
- Makes all existing users admins of FC Yarkon group
- Outputs the invite code for the default group

**After Migration:**
- All existing users will see their data in "FC Yarkon" group
- Users can create new groups or join other groups via invite codes
- Data is properly isolated per group

### 5. Invite Link Support (Optional Enhancement)
Currently only invite codes work. Could add:
- `GET /app/groups/join/[code]/page.tsx` - Auto-join page for invite links
- Format: `https://stanga.app/groups/join/ABC123`
- Auto-fills code in join modal or joins directly if authenticated

## 🔧 Testing Checklist

After completing remaining work:

1. **Group Creation & Joining**
   - [ ] Create a new group
   - [ ] Verify invite code is generated
   - [ ] Join group with invite code
   - [ ] Verify both users can switch between groups

2. **Role-Based Permissions**
   - [ ] As admin: Create/edit/delete matchdays
   - [ ] As member: View matchdays but can't edit
   - [ ] As admin: Manage group members
   - [ ] As member: Can't access group settings

3. **Data Isolation**
   - [ ] Create matchday in Group A
   - [ ] Switch to Group B
   - [ ] Verify matchday from Group A is not visible
   - [ ] Create players in each group
   - [ ] Verify players are isolated per group

4. **Statistics**
   - [ ] Verify stats page shows only data for active group
   - [ ] Switch groups and verify stats update

5. **Player Identity**
   - [ ] Create guest player (no userId)
   - [ ] Claim guest player as registered user
   - [ ] Verify player is linked to your account

## 📝 Notes

### Design Decisions Made
1. **All existing users become admins**: When migrating, all users become admins of the default "FC Yarkon" group to maintain their existing access level.
2. **Invite codes only**: Currently using 6-character codes (no confusing chars like O/0, I/1). Could add magic link support later.
3. **Guest vs Registered players**: 
   - Guest players: Only have a name, specific to one group
   - Registered players: Have userId, can (in future) aggregate stats across groups
4. **Admins can manage matchdays/players**: Only admins can create/edit/delete. Members can view and log events during active games.
5. **Cookie-based active group**: Active group stored in cookie for 30 days, syncs across tabs via localStorage events.

### Potential Future Enhancements
- Cross-group player statistics for registered users
- Group avatars/images
- Group-level settings (privacy, who can create matchdays, etc.)
- Invite link expiration
- Group discovery (public groups)
- Group categories/tags
- Transfer group ownership
- Activity feed per group
