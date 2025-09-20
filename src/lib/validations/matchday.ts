import { z } from 'zod';

// Rules snapshot schema - strict validation for game rules
export const RulesSnapshotSchema = z.object({
  team_size: z.coerce.number().int().min(1).max(11).default(6),
  game_minutes: z.coerce.number().int().positive().default(8),
  extra_minutes: z.coerce.number().int().nonnegative().default(2),
  max_goals_to_win: z.coerce.number().int().positive().default(2),
  penalties_on_tie: z.boolean().default(true),
  penalty_win_weight: z.coerce.number().min(0).max(1).default(0.5),
  points: z.object({
    loss: z.coerce.number().default(0),
    draw: z.coerce.number().default(1),
    penalty_bonus_win: z.coerce.number().default(2),
    regulation_win: z.coerce.number().default(3),
  }).default({
    loss: 0,
    draw: 1,
    penalty_bonus_win: 2,
    regulation_win: 3,
  }),
});

// Default rules configuration
export const DEFAULT_RULES: z.infer<typeof RulesSnapshotSchema> = {
  team_size: 6,
  game_minutes: 8,
  extra_minutes: 2,
  max_goals_to_win: 2,
  penalties_on_tie: true,
  penalty_win_weight: 0.5,
  points: {
    loss: 0,
    draw: 1,
    penalty_bonus_win: 2,
    regulation_win: 3,
  },
};

// Schema for creating a matchday
export const MatchdayCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable().transform(val => val === '' ? null : val),
  scheduledAt: z.string().datetime('Invalid date format'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location must be less than 200 characters').optional().nullable().transform(val => val === '' ? null : val),
  maxPlayers: z.coerce.number().int().min(6).max(30).default(18),
  rules: RulesSnapshotSchema.default(DEFAULT_RULES),
  isPublic: z.boolean().default(true),
});

// Schema for updating a matchday
export const MatchdayUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  scheduledAt: z.string().datetime('Invalid date format').optional(),
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location must be less than 200 characters').optional().nullable(),
  maxPlayers: z.number().int().min(6).max(30).optional(),
  status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
  isPublic: z.boolean().optional(),
});

// Schema for query parameters
export const MatchdayQuerySchema = z.object({
  status: z.enum(['upcoming', 'past', 'active', 'completed', 'cancelled']).optional(),
  isPublic: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Types
export type RulesSnapshot = z.infer<typeof RulesSnapshotSchema>;
export type MatchdayCreate = z.infer<typeof MatchdayCreateSchema>;
export type MatchdayUpdate = z.infer<typeof MatchdayUpdateSchema>;
export type MatchdayQuery = z.infer<typeof MatchdayQuerySchema>;
