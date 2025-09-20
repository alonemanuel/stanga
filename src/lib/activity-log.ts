import { db } from '@/lib/db';
import { activityLog } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';

export type ActivityAction = 'create' | 'update' | 'delete' | 'restore';
export type EntityType = 'player' | 'matchday' | 'team' | 'game' | 'user';

interface ActivityLogData {
  entityType: EntityType;
  entityId: string;
  action: ActivityAction;
  actorId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the audit trail
 */
export async function logActivity(data: ActivityLogData) {
  try {
    await db.insert(activityLog).values({
      id: createId(),
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actorId: data.actorId,
      changes: data.changes || null,
      metadata: data.metadata || null,
    });
  } catch (error) {
    // Log error but don't throw - activity logging shouldn't break the main operation
    console.error('Failed to log activity:', error);
  }
}

/**
 * Generate a diff between old and new values
 */
export function generateDiff(oldValue: any, newValue: any): Record<string, any> {
  const diff: Record<string, any> = {};
  
  // Handle creation (old value is null)
  if (oldValue === null || oldValue === undefined) {
    return { created: newValue };
  }
  
  // Handle deletion (new value is null)
  if (newValue === null || newValue === undefined) {
    return { deleted: oldValue };
  }
  
  // Compare objects
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  
  for (const key of allKeys) {
    const oldVal = oldValue[key];
    const newVal = newValue[key];
    
    if (oldVal !== newVal) {
      diff[key] = {
        from: oldVal,
        to: newVal,
      };
    }
  }
  
  return diff;
}
