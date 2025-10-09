import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Base audit fields for all tables
const auditFields = {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: text('created_by'), // References auth.users
  updatedBy: text('updated_by'), // References auth.users
  deletedAt: timestamp('deleted_at'), // Soft delete
};

// Users table (extends Supabase auth.users)
export const users = pgTable('users', {
  ...auditFields,
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  gender: text('gender'), // 'male', 'female', 'other', 'prefer_not_to_say'
  dateOfBirth: timestamp('date_of_birth'),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  activeIdx: index('users_active_idx').on(table.isActive),
}));

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
  activeIdx: index('group_members_active_idx').on(table.isActive),
}));

// Players table
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
  groupActiveIdx: index('players_group_active_idx').on(table.groupId, table.isActive), // NEW: Compound index
}));

// Matchdays table
export const matchdays = pgTable('matchdays', {
  ...auditFields,
  groupId: text('group_id').references(() => groups.id).notNull(),
  name: text('name'), // Optional - display names are computed from date/location
  description: text('description'),
  scheduledAt: timestamp('scheduled_at').notNull(),
  location: text('location'),
  teamSize: integer('team_size').default(9).notNull(),
  numberOfTeams: integer('number_of_teams').default(2).notNull(),
  status: text('status').default('upcoming').notNull(), // 'upcoming', 'active', 'completed', 'cancelled'
  rules: jsonb('rules').notNull(), // Snapshot of rules at creation time
  isPublic: boolean('is_public').default(true).notNull(),
}, (table) => ({
  groupIdx: index('matchdays_group_idx').on(table.groupId),
  scheduledIdx: index('matchdays_scheduled_idx').on(table.scheduledAt),
  statusIdx: index('matchdays_status_idx').on(table.status),
  publicIdx: index('matchdays_public_idx').on(table.isPublic),
}));

// Teams table (per matchday)
export const teams = pgTable('teams', {
  ...auditFields,
  matchdayId: text('matchday_id').references(() => matchdays.id).notNull(),
  name: text('name').notNull(),
  colorToken: text('color_token').notNull(), // 'blue', 'amber', 'rose'
  colorHex: text('color_hex').notNull(), // Hex color code
  formationJson: jsonb('formation_json'), // Formation data as JSON
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  matchdayIdx: index('teams_matchday_idx').on(table.matchdayId),
  activeIdx: index('teams_active_idx').on(table.isActive),
  colorIdx: index('teams_color_idx').on(table.matchdayId, table.colorToken), // Unique color per matchday
}));

// Team assignments (players to teams for a matchday)
export const teamAssignments = pgTable('team_assignments', {
  ...auditFields,
  matchdayId: text('matchday_id').references(() => matchdays.id).notNull(),
  teamId: text('team_id').references(() => teams.id).notNull(),
  playerId: text('player_id').references(() => players.id).notNull(),
  position: text('position'), // Position within the team
  positionOrder: integer('position_order'), // For ordering within position
  xPct: integer('x_pct'), // X position percentage for DnD grid
  yPct: integer('y_pct'), // Y position percentage for DnD grid
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  matchdayTeamPlayerIdx: index('team_assignments_matchday_team_player_idx').on(table.matchdayId, table.teamId, table.playerId),
  teamPlayerIdx: index('team_assignments_team_player_idx').on(table.teamId, table.playerId),
  playerIdx: index('team_assignments_player_idx').on(table.playerId),
  activeIdx: index('team_assignments_active_idx').on(table.isActive),
}));

// Games table
export const games = pgTable('games', {
  ...auditFields,
  matchdayId: text('matchday_id').references(() => matchdays.id).notNull(),
  homeTeamId: text('home_team_id').references(() => teams.id).notNull(),
  awayTeamId: text('away_team_id').references(() => teams.id).notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'active', 'completed', 'cancelled'
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'), // Game duration in minutes
  homeScore: integer('home_score').default(0).notNull(),
  awayScore: integer('away_score').default(0).notNull(),
  winnerTeamId: text('winner_team_id').references(() => teams.id),
  endReason: text('end_reason'), // 'regulation', 'extra_time', 'penalties', 'early_finish'
  maxGoals: integer('max_goals'), // Early finish threshold
  queuePosition: integer('queue_position'), // Position in game queue
}, (table) => ({
  matchdayIdx: index('games_matchday_idx').on(table.matchdayId),
  statusIdx: index('games_status_idx').on(table.status),
  teamsIdx: index('games_teams_idx').on(table.homeTeamId, table.awayTeamId),
  awayTeamIdx: index('games_away_team_id_idx').on(table.awayTeamId), // NEW: Foreign key index
  winnerTeamIdx: index('games_winner_team_id_idx').on(table.winnerTeamId), // NEW: Foreign key index
  queueIdx: index('games_queue_idx').on(table.queuePosition),
  matchdayStatusIdx: index('games_matchday_status_idx').on(table.matchdayId, table.status), // NEW: Compound index
}));

// Game events (goals, assists, penalties, etc.)
export const gameEvents = pgTable('game_events', {
  ...auditFields,
  gameId: text('game_id').references(() => games.id).notNull(),
  playerId: text('player_id').references(() => players.id),
  teamId: text('team_id').references(() => teams.id).notNull(),
  eventType: text('event_type').notNull(), // 'goal', 'assist', 'penalty_goal', 'penalty_miss', 'yellow_card', 'red_card'
  minute: integer('minute'), // Game minute when event occurred
  description: text('description'),
  metadata: jsonb('metadata'), // Additional event data
  isActive: boolean('is_active').default(true).notNull(), // For undo functionality
}, (table) => ({
  gameIdx: index('game_events_game_idx').on(table.gameId),
  playerIdx: index('game_events_player_idx').on(table.playerId),
  teamIdx: index('game_events_team_id_idx').on(table.teamId), // NEW: Foreign key index
  typeIdx: index('game_events_type_idx').on(table.eventType),
  activeIdx: index('game_events_active_idx').on(table.isActive),
  gameActiveIdx: index('game_events_game_active_idx').on(table.gameId, table.isActive), // NEW: Compound index
}));

// Penalty shootouts
export const penaltyShootouts = pgTable('penalty_shootouts', {
  ...auditFields,
  gameId: text('game_id').references(() => games.id).notNull(),
  homeTeamScore: integer('home_team_score').default(0).notNull(),
  awayTeamScore: integer('away_team_score').default(0).notNull(),
  winnerTeamId: text('winner_team_id').references(() => teams.id),
  status: text('status').default('active').notNull(), // 'active', 'completed'
}, (table) => ({
  gameIdx: index('penalty_shootouts_game_idx').on(table.gameId),
  winnerTeamIdx: index('penalty_shootouts_winner_team_id_idx').on(table.winnerTeamId), // NEW: Foreign key index
}));

// Individual penalty kicks
export const penaltyKicks = pgTable('penalty_kicks', {
  ...auditFields,
  shootoutId: text('shootout_id').references(() => penaltyShootouts.id).notNull(),
  playerId: text('player_id').references(() => players.id).notNull(),
  teamId: text('team_id').references(() => teams.id).notNull(),
  kickOrder: integer('kick_order').notNull(),
  result: text('result').notNull(), // 'goal', 'miss', 'save'
  description: text('description'),
}, (table) => ({
  shootoutIdx: index('penalty_kicks_shootout_idx').on(table.shootoutId),
  playerIdx: index('penalty_kicks_player_id_idx').on(table.playerId), // NEW: Foreign key index
  teamIdx: index('penalty_kicks_team_id_idx').on(table.teamId), // NEW: Foreign key index
  orderIdx: index('penalty_kicks_order_idx').on(table.shootoutId, table.kickOrder),
}));

// Activity log for audit trail
export const activityLog = pgTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  entityType: text('entity_type').notNull(), // 'player', 'matchday', 'team', 'game', etc.
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'restore'
  actorId: text('actor_id'), // Who performed the action
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  changes: jsonb('changes'), // JSON diff of changes
  metadata: jsonb('metadata'), // Additional context
}, (table) => ({
  entityIdx: index('activity_log_entity_idx').on(table.entityType, table.entityId),
  actorIdx: index('activity_log_actor_idx').on(table.actorId),
  timestampIdx: index('activity_log_timestamp_idx').on(table.timestamp),
}));

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export type Matchday = typeof matchdays.$inferSelect;
export type NewMatchday = typeof matchdays.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamAssignment = typeof teamAssignments.$inferSelect;
export type NewTeamAssignment = typeof teamAssignments.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type GameEvent = typeof gameEvents.$inferSelect;
export type NewGameEvent = typeof gameEvents.$inferInsert;

export type PenaltyShootout = typeof penaltyShootouts.$inferSelect;
export type NewPenaltyShootout = typeof penaltyShootouts.$inferInsert;

export type PenaltyKick = typeof penaltyKicks.$inferSelect;
export type NewPenaltyKick = typeof penaltyKicks.$inferInsert;

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type NewActivityLogEntry = typeof activityLog.$inferInsert;
