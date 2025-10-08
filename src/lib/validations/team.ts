import { z } from 'zod';
import { TEAM_COLORS } from '@/lib/teams';

// Color token validation
export const ColorTokenSchema = z.enum([
  'black', 'white', 'red', 'green', 'orange', 'yellow', 'blue'
] as const);

// Team creation schema
export const TeamCreateSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name too long'),
  colorToken: ColorTokenSchema,
  formationJson: z.record(z.any()).optional(),
});

// Team update schema
export const TeamUpdateSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name too long').optional(),
  colorToken: ColorTokenSchema.optional(),
  formationJson: z.record(z.any()).optional(),
});

// Team assignment schema
export const TeamAssignmentCreateSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  position: z.string().optional(),
  positionOrder: z.number().int().optional(),
  xPct: z.number().int().min(0).max(100).optional(),
  yPct: z.number().int().min(0).max(100).optional(),
});

// Team assignment update schema
export const TeamAssignmentUpdateSchema = z.object({
  position: z.string().optional(),
  positionOrder: z.number().int().optional(),
  xPct: z.number().int().min(0).max(100).optional(),
  yPct: z.number().int().min(0).max(100).optional(),
});

// Team initialization schema (for creating all 3 teams at once)
export const TeamInitializationSchema = z.object({
  matchdayId: z.string().min(1, 'Matchday ID is required'),
});

// Query schemas
export const TeamQuerySchema = z.object({
  matchdayId: z.string().optional(),
  colorToken: ColorTokenSchema.optional(),
  isActive: z.coerce.boolean().optional().default(true),
});

export const TeamAssignmentQuerySchema = z.object({
  matchdayId: z.string().optional(),
  teamId: z.string().optional(),
  playerId: z.string().optional(),
  isActive: z.coerce.boolean().optional().default(true),
});

// Type exports
export type TeamCreateInput = z.infer<typeof TeamCreateSchema>;
export type TeamUpdateInput = z.infer<typeof TeamUpdateSchema>;
export type TeamAssignmentCreateInput = z.infer<typeof TeamAssignmentCreateSchema>;
export type TeamAssignmentUpdateInput = z.infer<typeof TeamAssignmentUpdateSchema>;
export type TeamInitializationInput = z.infer<typeof TeamInitializationSchema>;
export type TeamQueryInput = z.infer<typeof TeamQuerySchema>;
export type TeamAssignmentQueryInput = z.infer<typeof TeamAssignmentQuerySchema>;
