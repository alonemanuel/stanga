/**
 * Generate a display name for a matchday based on date and optional location
 * Format: "29/9 Matchday" or "29/9 at The Yarkon"
 */
export function getMatchdayDisplayName(scheduledAt: Date | string, location?: string | null): string {
  const date = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const day = date.getDate();
  const month = date.getMonth() + 1;
  
  if (location && location.trim()) {
    return `${day}/${month} at ${location.trim()}`;
  }
  
  return `${day}/${month} Matchday`;
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
