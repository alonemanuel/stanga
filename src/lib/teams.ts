/**
 * Team color palette and utilities
 */

export const TEAM_COLORS = {
  blue: {
    token: 'blue' as const,
    hex: '#3b82f6',
    name: 'Blue',
  },
  amber: {
    token: 'amber' as const,
    hex: '#f59e0b',
    name: 'Amber',
  },
  rose: {
    token: 'rose' as const,
    hex: '#f43f5e',
    name: 'Rose',
  },
  green: {
    token: 'green' as const,
    hex: '#10b981',
    name: 'Green',
  },
  purple: {
    token: 'purple' as const,
    hex: '#8b5cf6',
    name: 'Purple',
  },
  orange: {
    token: 'orange' as const,
    hex: '#f97316',
    name: 'Orange',
  },
} as const;

export type ColorToken = keyof typeof TEAM_COLORS;

/**
 * Get all available color tokens
 */
export function getAvailableColors(): ColorToken[] {
  return Object.keys(TEAM_COLORS) as ColorToken[];
}

/**
 * Resolve color token to hex value
 */
export function resolveColorHex(token: ColorToken): string {
  return TEAM_COLORS[token].hex;
}

/**
 * Resolve color token to team name
 */
export function resolveTeamName(token: ColorToken): string {
  return TEAM_COLORS[token].name;
}

/**
 * Validate color token
 */
export function isValidColorToken(token: string): token is ColorToken {
  return token in TEAM_COLORS;
}

/**
 * Get color info by token
 */
export function getColorInfo(token: ColorToken) {
  return TEAM_COLORS[token];
}
