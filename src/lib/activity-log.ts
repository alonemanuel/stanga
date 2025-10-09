// DEPRECATED: Activity logging removed for performance optimization
// Use console.log for debugging instead
// The activityLog table remains in the database schema but is no longer actively used

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
 * @deprecated Activity logging has been disabled for performance. Use console.log instead.
 */
export async function logActivity(data: ActivityLogData) {
  // Activity logging disabled for performance optimization
  // Uncomment the line below if you need debugging output
  // console.log(`[${data.action.toUpperCase()}]`, data.entityType, data.entityId, data.changes);
  return Promise.resolve();
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
