import { z } from 'zod';

// Player positions enum
export const PlayerPosition = z.enum(['goalkeeper', 'defender', 'midfielder', 'forward']);

// Base player schema for creation
export const PlayerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  nickname: z.string().max(50, 'Nickname must be less than 50 characters').optional().nullable().transform(val => val === '' ? null : val),
  position: z.string().optional().nullable().transform(val => val === '' ? null : val).pipe(PlayerPosition.optional().nullable()),
  skillLevel: z.coerce.number().int().min(1).max(10).default(5),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable().transform(val => val === '' ? null : val),
});

// Schema for updating players (all fields optional except constraints)
export const PlayerUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  nickname: z.string().max(50, 'Nickname must be less than 50 characters').optional().nullable().transform(val => val === '' ? null : val),
  position: z.string().optional().nullable().transform(val => val === '' ? null : val).pipe(PlayerPosition.optional().nullable()),
  skillLevel: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable().transform(val => val === '' ? null : val),
  isActive: z.boolean().optional(),
});

// Schema for query parameters
export const PlayerQuerySchema = z.object({
  query: z.string().optional(),
  position: PlayerPosition.optional(),
  skillLevel: z.coerce.number().int().min(1).max(10).optional(),
  isActive: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Types
export type PlayerCreate = z.infer<typeof PlayerCreateSchema>;
export type PlayerUpdate = z.infer<typeof PlayerUpdateSchema>;
export type PlayerQuery = z.infer<typeof PlayerQuerySchema>;
export type PlayerPositionType = z.infer<typeof PlayerPosition>;
