"use client";

import * as React from "react";
import { useMatchday, useUpdateMatchday, useDeleteMatchday } from "@/lib/hooks/use-matchdays";
import { useMatchdayStats } from "@/lib/hooks/use-stats";
import { MatchdayForm } from "@/components/matchdays/MatchdayForm";
import { TeamManagement } from "@/components/matchdays/TeamManagement";
import { GameManagement } from "@/components/matchdays/GameManagement";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2 } from "lucide-react";
import { getMatchdayDisplayName } from "@/lib/matchday-display";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface MatchdayDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

type TabType = 'overview' | 'teams' | 'games' | 'stats';

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  contentId: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isExpanded, onToggle, contentId, children }: CollapsibleSectionProps) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      
      <div
        id={contentId}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isExpanded}
      >
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MatchdayDetailPage({ params }: MatchdayDetailPageProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');
  const [isEditing, setIsEditing] = React.useState(false);
  const [matchdayId, setMatchdayId] = React.useState<string>('');
  const [isRulesExpanded, setIsRulesExpanded] = React.useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = React.useState(false);
  
  const supabase = createClient();
  
  // Await params and set matchdayId
  React.useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setMatchdayId(resolvedParams.id);
    };
    getParams();
  }, [params]);
  
  const { data: matchdayData, isLoading, error } = useMatchday(matchdayId);
  const updateMutation = useUpdateMatchday();
  const deleteMutation = useDeleteMatchday();
  const {
    data: matchdayStats,
    isLoading: matchdayStatsLoading,
    error: matchdayStatsError,
    refetch: refetchMatchdayStats,
  } = useMatchdayStats(matchdayId);
  
  // Get current user
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleEditSuccess = () => {
    setIsEditing(false);
  };


  const handleDeleteMatchday = async () => {
    if (!matchdayData) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${matchdayData.data.name}"? This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(matchdayId);
        // Redirect to matchdays list after successful deletion
        window.location.href = '/matchdays';
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading matchday...</p>
        </div>
      </div>
    );
  }

  if (error || !matchdayData) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load matchday</p>
          <Button 
            onClick={() => window.location.href = '/matchdays'} 
            className="mt-4"
          >
            Back to Matchdays
          </Button>
        </div>
      </div>
    );
  }

  const matchday = matchdayData.data;

  // Show edit form if editing
  if (isEditing) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(false)}
            >
              ← Back
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">Edit Matchday</h1>
          <p className="text-muted-foreground">
            Update matchday information and rules
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-6">
          <MatchdayForm
            matchday={{
              id: matchday.id,
              scheduledAt: matchday.scheduledAt,
              location: matchday.location,
              teamSize: matchday.teamSize,
              numberOfTeams: matchday.numberOfTeams,
              rules: matchday.rules,
            }}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'teams', label: 'Teams' },
    { id: 'games', label: 'Games' },
    { id: 'stats', label: 'Stats' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Basic Info */}
            <CollapsibleSection
              title="Matchday Information"
              isExpanded={isInfoExpanded}
              onToggle={() => setIsInfoExpanded(!isInfoExpanded)}
              contentId="matchday-info-content"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="text-sm">{formatDate(matchday.scheduledAt)}</p>
                </div>
                {matchday.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-sm">{matchday.location}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Team Size</label>
                  <p className="text-sm">{matchday.teamSize} players per team</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Number of Teams</label>
                  <p className="text-sm">{matchday.numberOfTeams} teams</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(matchday.status)}`}>
                    {matchday.status.charAt(0).toUpperCase() + matchday.status.slice(1)}
                  </span>
                </div>
              </div>
            </CollapsibleSection>

            {/* Rules Snapshot */}
            <CollapsibleSection
              title="Game Rules"
              isExpanded={isRulesExpanded}
              onToggle={() => setIsRulesExpanded(!isRulesExpanded)}
              contentId="game-rules-content"
            >
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Game Duration</label>
                  <p className="text-sm">{matchday.rules.game_minutes} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Extra Time</label>
                  <p className="text-sm">{matchday.rules.extra_minutes} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Goals to Win</label>
                  <p className="text-sm">{matchday.rules.max_goals_to_win} goals</p>
                </div>
              </div>
              
              {/* Points System */}
              <div className="mt-6">
                <h4 className="text-md font-medium mb-3">Points System</h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Loss</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.loss}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Draw</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.draw}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Penalty Win</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.penalty_bonus_win}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Regulation Win</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.regulation_win}</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        );
      case 'teams':
        return (
          <TeamManagement 
            matchdayId={matchdayId}
            maxPlayersPerTeam={matchday.teamSize}
            numberOfTeams={matchday.numberOfTeams}
          />
        );
      case 'games':
        return (
          <GameManagement
            matchdayId={matchdayId}
            maxPlayersPerTeam={matchday.teamSize}
          />
        );
      case 'stats': {
        if (matchdayStatsLoading) {
          return (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading matchday statistics...</p>
            </div>
          );
        }

        if (matchdayStatsError) {
          return (
            <div className="text-center py-8 space-y-4">
              <p className="text-red-600">Failed to load matchday statistics</p>
              <Button variant="outline" onClick={() => refetchMatchdayStats()}>
                Try again
              </Button>
            </div>
          );
        }

        if (!matchdayStats?.data) {
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Matchday statistics are not available yet.</p>
            </div>
          );
        }

        const { summary, standings, topScorers, topAssists, playerStats, games: statsGames } = matchdayStats.data;
        const hasStandings = (standings ?? []).length > 0;
        const hasGames = (statsGames ?? []).length > 0;
        const sortedPlayerStats = [...(playerStats ?? [])].sort((a, b) => {
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.assists !== a.assists) return b.assists - a.assists;
          return b.goalsPerGame - a.goalsPerGame;
        });
        const formatGameStatus = (status: string) => {
          switch (status) {
            case 'completed':
              return 'Completed';
            case 'in_progress':
              return 'In progress';
            case 'scheduled':
              return 'Scheduled';
            default:
              return status
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase());
          }
        };

        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Games</h3>
                <p className="text-2xl font-bold">{summary.totalGames}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Completed Games</h3>
                <p className="text-2xl font-bold">{summary.completedGames}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Goals</h3>
                <p className="text-2xl font-bold">{summary.totalGoals}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Avg Goals/Game</h3>
                <p className="text-2xl font-bold">{summary.averageGoalsPerGame.toFixed(1)}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Participating Players</h3>
                <p className="text-2xl font-bold">{summary.totalPlayers}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Teams</h3>
                <p className="text-2xl font-bold">{summary.totalTeams}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold">Team Standings</h3>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {summary.completedGames} / {summary.totalGames} games completed
                  </span>
                </div>
                {hasStandings ? (
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
                        {standings.map((team, index) => (
                          <tr
                            key={team.teamId}
                            className={index === 0 ? 'bg-muted/40' : undefined}
                          >
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
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
                    Standings will appear once at least one game has been completed.
                  </p>
                )}
              </div>

              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Game Results</h3>
                {hasGames ? (
                  <div className="space-y-3">
                    {statsGames.map((game) => {
                      const homeTeamName = game.homeTeam?.name ?? 'Home';
                      const awayTeamName = game.awayTeam?.name ?? 'Away';
                      const isCompleted = game.status === 'completed';
                      const endedLabel = game.endedAt
                        ? new Date(game.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : null;

                      return (
                        <div
                          key={game.id}
                          className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium">
                              {homeTeamName}
                              <span className="mx-2 text-xs text-muted-foreground">vs</span>
                              {awayTeamName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isCompleted
                                ? endedLabel
                                  ? `Finished • ${endedLabel}`
                                  : 'Finished'
                                : formatGameStatus(game.status)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-semibold">{game.homeScore ?? 0}</span>
                            <span className="text-sm text-muted-foreground">-</span>
                            <span className="text-xl font-semibold">{game.awayScore ?? 0}</span>
                            {game.endReason === 'penalties' && (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-100">
                                Penalties
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No games have been scheduled for this matchday yet.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">🥅 Top Scorers</h3>
                {topScorers?.length ? (
                  <div className="space-y-3">
                    {topScorers.map((player, index) => (
                      <div key={player.playerId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                          <span className="font-medium">{player.playerName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">{player.goals}</span>
                          <span className="text-sm text-muted-foreground ml-1">goals</span>
                          <div className="text-xs text-muted-foreground">
                            {player.goalsPerGame.toFixed(1)} per game
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No goals recorded yet.</p>
                )}
              </div>

              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">🎯 Top Assists</h3>
                {topAssists?.length ? (
                  <div className="space-y-3">
                    {topAssists.map((player, index) => (
                      <div key={player.playerId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                          <span className="font-medium">{player.playerName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">{player.assists}</span>
                          <span className="text-sm text-muted-foreground ml-1">assists</span>
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

            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Player Breakdown</h3>
              {sortedPlayerStats.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground/80">
                      <tr>
                        <th className="py-2 pr-3 text-left font-medium">Player</th>
                        <th className="px-2 py-2 text-right font-medium">GP</th>
                        <th className="px-2 py-2 text-right font-medium">Goals</th>
                        <th className="px-2 py-2 text-right font-medium">Assists</th>
                        <th className="px-2 py-2 text-right font-medium">G/GP</th>
                        <th className="px-2 py-2 text-right font-medium">Penalty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayerStats.slice(0, 10).map((player) => (
                        <tr key={player.playerId}>
                          <td className="py-2 pr-3">
                            <span className="font-medium">{player.playerName}</span>
                          </td>
                          <td className="px-2 py-2 text-right">{player.gamesPlayed}</td>
                          <td className="px-2 py-2 text-right">{player.goals}</td>
                          <td className="px-2 py-2 text-right">{player.assists}</td>
                          <td className="px-2 py-2 text-right">{player.goalsPerGame.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs text-muted-foreground">
                            {player.penaltyGoals} scored / {player.penaltyMisses} missed
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Player statistics will appear once match events have been recorded.
                </p>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/matchdays'}
            >
              ← Back
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">{getMatchdayDisplayName(matchday.scheduledAt, matchday.location)}</h1>
          <p className="text-muted-foreground">
            {formatDate(matchday.scheduledAt)}
          </p>
        </div>
        {user && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsEditing(true)}
              aria-label="Edit matchday"
              title="Edit matchday"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleDeleteMatchday}
              loading={deleteMutation.isPending}
              aria-label="Delete matchday"
              title="Delete matchday"
              className="text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : tab.disabled
                  ? 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
              }`}
              disabled={tab.disabled}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
}
