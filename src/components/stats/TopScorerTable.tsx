"use client";

import * as React from "react";

export interface TopScorer {
  playerId: string;
  playerName: string;
  goals: number;
  assists: number;
  gamesPlayed: number;
  goalsPerGame: number;
}

interface TopScorerTableProps {
  topScorers: TopScorer[];
  isLoading?: boolean;
  error?: string | null;
  limit?: number;
  isRefetching?: boolean;
}

export function TopScorerTable({ topScorers, isLoading, error, limit = 10, isRefetching }: TopScorerTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">⚽ Top Scorers</h3>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading top scorers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">⚽ Top Scorers</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!topScorers || topScorers.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">⚽ Top Scorers</h3>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No goals scored yet</p>
        </div>
      </div>
    );
  }

  // Limit the number of players shown
  const displayedScorers = topScorers.slice(0, limit);

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">⚽ Top Scorers</h3>
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
              <th className="text-left py-2 px-2">Rank</th>
              <th className="text-left py-2 px-2">Player</th>
              <th className="text-center py-2 px-2">Goals</th>
              <th className="text-center py-2 px-2">Assists</th>
              <th className="text-center py-2 px-2">GP</th>
              <th className="text-center py-2 px-2">GPG</th>
            </tr>
          </thead>
          <tbody>
            {displayedScorers.map((player, index) => (
              <tr key={player.playerId} className="border-b hover:bg-muted/50">
                <td className="py-2 px-2 text-center">
                  <div className="flex items-center justify-center">
                    {index < 3 ? (
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2 font-medium">{player.playerName}</td>
                <td className="py-2 px-2 text-center">
                  <span className="font-bold text-lg">{player.goals}</span>
                </td>
                <td className="py-2 px-2 text-center">{player.assists}</td>
                <td className="py-2 px-2 text-center">{player.gamesPlayed}</td>
                <td className="py-2 px-2 text-center">
                  <span className="text-sm font-medium">
                    {player.goalsPerGame.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          <strong>GP:</strong> Games Played, <strong>GPG:</strong> Goals Per Game
        </p>
      </div>
    </div>
  );
}
