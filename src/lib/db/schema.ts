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
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  activeIdx: index('users_active_idx').on(table.isActive),
}));

// Players table
export const players = pgTable('players', {
  ...auditFields,
  name: text('name').notNull(),
  nickname: text('nickname'),
  position: text('position'), // 'goalkeeper', 'defender', 'midfielder', 'forward'
  skillLevel: integer('skill_level').default(5), // 1-10 scale
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
}, (table) => ({
  nameIdx: index('players_name_idx').on(table.name),
  activeIdx: index('players_active_idx').on(table.isActive),
  skillIdx: index('players_skill_idx').on(table.skillLevel),
}));

// Matchdays table
export const matchdays = pgTable('matchdays', {
  ...auditFields,
  name: text('name').notNull(),
  description: text('description'),
  scheduledAt: timestamp('scheduled_at').notNull(),
  location: text('location'),
  maxPlayers: integer('max_players').default(18).notNull(),
  status: text('status').default('upcoming').notNull(), // 'upcoming', 'active', 'completed', 'cancelled'
  rules: jsonb('rules').notNull(), // Snapshot of rules at creation time
  isPublic: boolean('is_public').default(true).notNull(),
}, (table) => ({
  scheduledIdx: index('matchdays_scheduled_idx').on(table.scheduledAt),
  statusIdx: index('matchdays_status_idx').on(table.status),
  publicIdx: index('matchdays_public_idx').on(table.isPublic),
}));

// Teams table (per matchday)
export const teams = pgTable('teams', {
  ...auditFields,
  matchdayId: text('matchday_id').references(() => matchdays.id).notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(), // Hex color code
  formation: text('formation').default('4-4-2'), // Formation string
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  matchdayIdx: index('teams_matchday_idx').on(table.matchdayId),
  activeIdx: index('teams_active_idx').on(table.isActive),
}));

// Team assignments (players to teams for a matchday)
export const teamAssignments = pgTable('team_assignments', {
  ...auditFields,
  teamId: text('team_id').references(() => teams.id).notNull(),
  playerId: text('player_id').references(() => players.id).notNull(),
  position: text('position'), // Position within the team
  positionOrder: integer('position_order'), // For ordering within position
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
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
  queueIdx: index('games_queue_idx').on(table.queuePosition),
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
  typeIdx: index('game_events_type_idx').on(table.eventType),
  activeIdx: index('game_events_active_idx').on(table.isActive),
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
