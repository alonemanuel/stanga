"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useMatchdayStats } from "@/lib/hooks/use-stats";

interface MatchdayStatsTabProps {
  matchdayId: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function MatchdayStatsTab({ matchdayId }: MatchdayStatsTabProps) {
  const { data, isLoading, error, refetch } = useMatchdayStats(matchdayId);

  if (!matchdayId) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Select a matchday to view statistics once games have been logged.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading matchday statistics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-sm text-destructive">Unable to load matchday statistics.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Statistics will appear once games have been recorded for this matchday.
      </div>
    );
  }

  const {
    summary,
    standings = [],
    topScorers = [],
    topAssists = [],
    playerStats = [],
  } = data.data;

  const sortedStandings = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  const sortedPlayers = [...playerStats].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return b.goalsPerGame - a.goalsPerGame;
  });

  const hasPenaltyStats = sortedPlayers.some(
    (player) => (player.penaltyGoals ?? 0) > 0 || (player.penaltyMisses ?? 0) > 0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Games</h3>
          <p className="text-2xl font-semibold">{summary.totalGames}</p>
          <p className="text-xs text-muted-foreground">{summary.completedGames} completed</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Goals</h3>
          <p className="text-2xl font-semibold">{summary.totalGoals}</p>
          <p className="text-xs text-muted-foreground">{formatNumber(summary.averageGoalsPerGame)} per completed game</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Participating Players</h3>
          <p className="text-2xl font-semibold">{summary.totalPlayers}</p>
          <p className="text-xs text-muted-foreground">Across {summary.totalTeams} teams</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Team Standings</h3>
          <span className="text-xs text-muted-foreground">
            Points follow the matchday rules for wins, draws, and penalty shootouts.
          </span>
        </div>
        {sortedStandings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground/80">
                <tr>
                  <th className="py-2 pr-3 text-left font-medium">Team</th>
                  <th className="px-2 py-2 text-right font-medium">GP</th>
                  <th className="px-2 py-2 text-right font-medium">W</th>
                  <th className="px-2 py-2 text-right font-medium">PW</th>
                  <th className="px-2 py-2 text-right font-medium">D</th>
                  <th className="px-2 py-2 text-right font-medium">L</th>
                  <th className="px-2 py-2 text-right font-medium">GF</th>
                  <th className="px-2 py-2 text-right font-medium">GA</th>
                  <th className="px-2 py-2 text-right font-medium">GD</th>
                  <th className="px-2 py-2 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((team, index) => (
                  <tr key={team.teamId} className={index === 0 ? "bg-muted/40" : undefined}>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-xs font-medium text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium">{team.teamName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">{team.gamesPlayed}</td>
                    <td className="px-2 py-2 text-right">{team.wins}</td>
                    <td className="px-2 py-2 text-right">{team.penaltyWins}</td>
                    <td className="px-2 py-2 text-right">{team.draws}</td>
                    <td className="px-2 py-2 text-right">{team.losses}</td>
                    <td className="px-2 py-2 text-right">{team.goalsFor}</td>
                    <td className="px-2 py-2 text-right">{team.goalsAgainst}</td>
                    <td className="px-2 py-2 text-right">{team.goalDifference}</td>
                    <td className="px-2 py-2 text-right font-semibold">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Standings will appear once games have been completed.
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">🥅 Top Scorers</h3>
          {topScorers.length ? (
            <div className="space-y-3">
              {topScorers.map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{player.playerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{player.goals}</span>
                    <span className="ml-1 text-sm text-muted-foreground">goals</span>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(player.goalsPerGame)} per game
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No goal scorers recorded yet.</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">🎯 Top Assists</h3>
          {topAssists.length ? (
            <div className="space-y-3">
              {topAssists.map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{player.playerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{player.assists}</span>
                    <span className="ml-1 text-sm text-muted-foreground">assists</span>
                    <div className="text-xs text-muted-foreground">
                      {player.goals} goals
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No assists recorded yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Player Breakdown</h3>
        {sortedPlayers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground/80">
                <tr>
                  <th className="py-2 pr-3 text-left font-medium">Player</th>
                  <th className="px-2 py-2 text-right font-medium">GP</th>
                  <th className="px-2 py-2 text-right font-medium">Goals</th>
                  <th className="px-2 py-2 text-right font-medium">Assists</th>
                  <th className="px-2 py-2 text-right font-medium">G/GP</th>
                  {hasPenaltyStats && (
                    <th className="px-2 py-2 text-right font-medium">PK</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.slice(0, 12).map((player) => (
                  <tr key={player.playerId}>
                    <td className="py-2 pr-3 font-medium">{player.playerName}</td>
                    <td className="px-2 py-2 text-right">{player.gamesPlayed}</td>
                    <td className="px-2 py-2 text-right">{player.goals}</td>
                    <td className="px-2 py-2 text-right">{player.assists}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(player.goalsPerGame)}</td>
                    {hasPenaltyStats && (
                      <td className="px-2 py-2 text-right text-xs text-muted-foreground">
                        {player.penaltyGoals ?? 0} scored / {player.penaltyMisses ?? 0} missed
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Player statistics will appear once goals or assists have been logged.
          </p>
        )}
      </div>
    </div>
  );
}
