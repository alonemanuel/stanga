import { z } from 'zod';

// Base player schema for creation
export const PlayerCreateSchema = z.object({
  groupId: z.string().optional(), // Group ID for multi-group support
  userId: z.string().optional().nullable(), // Link to registered user (nullable for guest players)
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
});

// Schema for updating players (all fields optional except constraints)
export const PlayerUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  isActive: z.boolean().optional(),
  userId: z.string().optional().nullable(), // Allow updating user link
});

// Schema for query parameters
export const PlayerQuerySchema = z.object({
  groupId: z.string().optional(), // Filter by group
  query: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Types
export type PlayerCreate = z.infer<typeof PlayerCreateSchema>;
export type PlayerUpdate = z.infer<typeof PlayerUpdateSchema>;
export type PlayerQuery = z.infer<typeof PlayerQuerySchema>;
