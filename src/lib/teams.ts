/**
 * Team color palette and utilities
 */

export const TEAM_COLORS = {
  black: {
    token: 'black' as const,
    hex: '#000000',
    name: 'Black',
  },
  white: {
    token: 'white' as const,
    hex: '#ffffff',
    name: 'White',
  },
  red: {
    token: 'red' as const,
    hex: '#ef4444',
    name: 'Red',
  },
  green: {
    token: 'green' as const,
    hex: '#10b981',
    name: 'Green',
  },
  orange: {
    token: 'orange' as const,
    hex: '#f97316',
    name: 'Orange',
  },
  yellow: {
    token: 'yellow' as const,
    hex: '#eab308',
    name: 'Yellow',
  },
  blue: {
    token: 'blue' as const,
    hex: '#3b82f6',
    name: 'Blue',
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
