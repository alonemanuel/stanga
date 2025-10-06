"use client";

import { useQuery } from '@tanstack/react-query';

// Types for API responses
interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  goalsPerGame: number;
  penaltyGoals: number;
  penaltyMisses: number;
  matchdaysPlayed?: number;
  winRate?: number;
}

interface TeamStanding {
  teamId: string;
  teamName: string;
  matchdayId: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  penaltyWins: number;
  penaltyLosses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface OverallStatsResponse {
  data: {
    summary: {
      totalGames: number;
      totalGoals: number;
      totalPlayers: number;
      totalMatchdays: number;
      averageGoalsPerGame: number;
    };
    topScorers: PlayerStats[];
    topAssists: PlayerStats[];
    playerStats: PlayerStats[];
    matchdayStandings: Record<string, TeamStanding[]>;
  };
}

interface MatchdayStatsResponse {
  data: {
    matchday: {
      id: string;
      name: string;
      scheduledAt: string;
      status: string;
      rules: any;
    };
    summary: {
      totalGames: number;
      completedGames: number;
      totalGoals: number;
      totalPlayers: number;
      totalTeams: number;
      averageGoalsPerGame: number;
    };
    standings: TeamStanding[];
    topScorers: PlayerStats[];
    topAssists: PlayerStats[];
    playerStats: PlayerStats[];
    games: any[];
  };
}

// API functions
async function fetchOverallStats(): Promise<OverallStatsResponse> {
  const response = await fetch('/api/stats/overall');
  
  if (!response.ok) {
    throw new Error('Failed to fetch overall stats');
  }
  
  return response.json();
}

async function fetchMatchdayStats(matchdayId: string): Promise<MatchdayStatsResponse> {
  const response = await fetch(`/api/stats/matchday/${matchdayId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch matchday stats');
  }
  
  return response.json();
}

// React Query hooks
export function useOverallStats(options?: { enableRealTime?: boolean }) {
  return useQuery({
    queryKey: ['stats', 'overall'],
    queryFn: fetchOverallStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: options?.enableRealTime ? 30 * 1000 : false, // 30 seconds if real-time enabled
    refetchIntervalInBackground: options?.enableRealTime ? true : false,
  });
}

export function useMatchdayStats(matchdayId: string) {
  return useQuery({
    queryKey: ['stats', 'matchday', matchdayId],
    queryFn: () => fetchMatchdayStats(matchdayId),
    enabled: !!matchdayId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Export types for use in components
export type { PlayerStats, TeamStanding, OverallStatsResponse, MatchdayStatsResponse };