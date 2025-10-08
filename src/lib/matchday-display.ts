/**
 * Generate a display name for a matchday based on date and optional location
 * Format: "Wednesday 8/10" or "Wednesday 29/9"
 */
export function getMatchdayDisplayName(scheduledAt: Date | string, location?: string | null): string {
  const date = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  return `${weekday} ${day}/${month}`;
}

/**
 * Generate a display name for a matchday from database row data
 */
export function getMatchdayDisplayNameFromRow(matchday: {
  scheduledAt: Date | string;
  location?: string | null;
}): string {
  return getMatchdayDisplayName(matchday.scheduledAt, matchday.location);
}
