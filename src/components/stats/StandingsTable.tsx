"use client";

import * as React from "react";

export interface TeamStanding {
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

interface StandingsTableProps {
  standings: TeamStanding[];
  isLoading?: boolean;
  error?: string | null;
  isRefetching?: boolean;
}

export function StandingsTable({ standings, isLoading, error, isRefetching }: StandingsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Team Standings</h3>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading standings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Team Standings</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Team Standings</h3>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No team standings available</p>
        </div>
      </div>
    );
  }

  // Sort standings by points (descending), then by goal difference (descending), then by goals for (descending)
  const sortedStandings = [...standings].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🏆 Team Standings</h3>
        {isRefetching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
            Updating...
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Pos</th>
              <th className="text-left py-2 px-2">Team</th>
              <th className="text-center py-2 px-2">GP</th>
              <th className="text-center py-2 px-2">W</th>
              <th className="text-center py-2 px-2">D</th>
              <th className="text-center py-2 px-2">L</th>
              <th className="text-center py-2 px-2">GF</th>
              <th className="text-center py-2 px-2">GA</th>
              <th className="text-center py-2 px-2">GD</th>
              <th className="text-center py-2 px-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team, index) => (
              <tr key={team.teamId} className="border-b hover:bg-muted/50">
                <td className="py-2 px-2 text-center font-medium">{index + 1}</td>
                <td className="py-2 px-2 font-medium">{team.teamName}</td>
                <td className="py-2 px-2 text-center">{team.gamesPlayed}</td>
                <td className="py-2 px-2 text-center">
                  {team.wins}
                  {team.penaltyWins > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (+{team.penaltyWins})
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-center">
                  {team.draws - team.penaltyWins - team.penaltyLosses}
                </td>
                <td className="py-2 px-2 text-center">
                  {team.losses}
                  {team.penaltyLosses > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (+{team.penaltyLosses})
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-center">{team.goalsFor}</td>
                <td className="py-2 px-2 text-center">{team.goalsAgainst}</td>
                <td className="py-2 px-2 text-center">
                  <span className={team.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {team.goalDifference >= 0 ? '+' : ''}{team.goalDifference}
                  </span>
                </td>
                <td className="py-2 px-2 text-center font-bold">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p className="mb-1">
          <strong>GP:</strong> Games Played, <strong>W:</strong> Wins, <strong>D:</strong> Draws, <strong>L:</strong> Losses
        </p>
        <p className="mb-1">
          <strong>GF:</strong> Goals For, <strong>GA:</strong> Goals Against, <strong>GD:</strong> Goal Difference, <strong>Pts:</strong> Points
        </p>
        <p>
          Numbers in parentheses indicate penalty wins/losses
        </p>
      </div>
    </div>
  );
}
