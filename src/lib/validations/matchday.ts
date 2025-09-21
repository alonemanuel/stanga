import { z } from 'zod';

// Rules snapshot schema - strict validation for game rules
export const RulesSnapshotSchema = z.object({
  team_size: z.coerce.number().int().min(1).max(11).default(6),
  game_minutes: z.coerce.number().int().positive().default(8),
  extra_minutes: z.coerce.number().int().nonnegative().default(2),
  max_goals_to_win: z.coerce.number().int().positive().default(2),
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
  points: {
    loss: 0,
    draw: 1,
    penalty_bonus_win: 2,
    regulation_win: 3,
  },
};

// Schema for creating a matchday
export const MatchdayCreateSchema = z.object({
  scheduledAt: z.string().min(1, 'Date and time is required').refine((val) => {
    // Accept datetime-local format (YYYY-MM-DDTHH:MM) and convert to ISO
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid date format'),
  location: z.string().max(200, 'Location must be less than 200 characters').optional().nullable().transform(val => val === '' ? null : val),
  teamSize: z.coerce.number().int().min(3).max(15).default(9),
  numberOfTeams: z.coerce.number().int().min(2).max(20).default(2),
  rules: RulesSnapshotSchema.default(DEFAULT_RULES),
});

// Schema for updating a matchday
export const MatchdayUpdateSchema = z.object({
  scheduledAt: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid date format').optional(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional().nullable(),
  teamSize: z.coerce.number().int().min(3).max(15).optional(),
  numberOfTeams: z.coerce.number().int().min(2).max(20).optional(),
  status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
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
