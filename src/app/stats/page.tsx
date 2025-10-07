"use client";

import * as React from "react";
import { useOverallStats } from "@/lib/hooks/use-stats";
import { useMatchdays } from "@/lib/hooks/use-matchdays";
import { useGroupContext } from "@/lib/hooks/use-group-context";
import { Button } from "@/components/ui/button";
import { getMatchdayDisplayName } from "@/lib/matchday-display";
import { BarChart3 } from "lucide-react";

type TabType = 'overall' | 'matchday' | 'players' | 'teams';

export default function StatsPage() {
  const [activeTab, setActiveTab] = React.useState<TabType>('overall');
  const [selectedMatchdayId, setSelectedMatchdayId] = React.useState<string>('');
  const { activeGroup, isLoading: groupLoading } = useGroupContext();
  
  const { data: overallStats, isLoading: overallLoading, error: overallError } = useOverallStats();
  const { data: matchdaysData } = useMatchdays({ 
    status: 'completed', 
    isPublic: true,
    page: 1, 
    limit: 50 
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overall', label: 'Overall' },
    { id: 'matchday', label: 'Matchday' },
    { id: 'players', label: 'Players' },
    { id: 'teams', label: 'Teams' },
  ];

  const renderOverallTab = () => {
    if (overallLoading) {
      return (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading overall stats...</p>
        </div>
      );
    }

    if (overallError || !overallStats) {
      return (
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load overall stats</p>
        </div>
      );
    }

    const { summary, topScorers, topAssists } = overallStats.data;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Games</h3>
            <p className="text-2xl font-bold">{summary.totalGames}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Goals</h3>
            <p className="text-2xl font-bold">{summary.totalGoals}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Active Players</h3>
            <p className="text-2xl font-bold">{summary.totalPlayers}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Avg Goals/Game</h3>
            <p className="text-2xl font-bold">{summary.averageGoalsPerGame.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Scorers */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🥅 Top Scorers</h3>
            {topScorers.length > 0 ? (
              <div className="space-y-3">
                {topScorers.map((player, index) => (
                  <div key={player.playerId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
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
              <p className="text-muted-foreground">No goals scored yet</p>
            )}
          </div>

          {/* Top Assists */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🎯 Top Assists</h3>
            {topAssists.length > 0 ? (
              <div className="space-y-3">
                {topAssists.map((player, index) => (
                  <div key={player.playerId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
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
              <p className="text-muted-foreground">No assists recorded yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMatchdayTab = () => {
    return (
      <div className="space-y-6">
        {/* Matchday Selector */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Select Matchday</h3>
          {matchdaysData?.data.length ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {matchdaysData.data.map((matchday) => (
                <button
                  key={matchday.id}
                  onClick={() => setSelectedMatchdayId(matchday.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedMatchdayId === matchday.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{getMatchdayDisplayName(matchday.scheduledAt, matchday.location)}</div>
                  <div className="text-sm opacity-75">
                    {new Date(matchday.scheduledAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No completed matchdays found</p>
          )}
        </div>

        {selectedMatchdayId && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Matchday-specific stats coming soon...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {matchdaysData?.data.find(m => m.id === selectedMatchdayId) ? getMatchdayDisplayName(matchdaysData.data.find(m => m.id === selectedMatchdayId)!.scheduledAt, matchdaysData.data.find(m => m.id === selectedMatchdayId)!.location) : ''}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPlayersTab = () => {
    if (overallLoading) {
      return (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading player stats...</p>
        </div>
      );
    }

    if (overallError || !overallStats) {
      return (
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load player stats</p>
        </div>
      );
    }

    const { playerStats } = overallStats.data;

    return (
      <div className="space-y-6">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Player Statistics</h3>
          {playerStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Player</th>
                    <th className="text-center py-2">GP</th>
                    <th className="text-center py-2">Goals</th>
                    <th className="text-center py-2">Assists</th>
                    <th className="text-center py-2">GPG</th>
                    {playerStats[0].winRate !== undefined && (
                      <th className="text-center py-2">Win%</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((player) => (
                    <tr key={player.playerId} className="border-b">
                      <td className="py-2 font-medium">{player.playerName}</td>
                      <td className="text-center py-2">{player.gamesPlayed}</td>
                      <td className="text-center py-2">{player.goals}</td>
                      <td className="text-center py-2">{player.assists}</td>
                      <td className="text-center py-2">{player.goalsPerGame.toFixed(1)}</td>
                      {player.winRate !== undefined && (
                        <td className="text-center py-2">{player.winRate.toFixed(0)}%</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">No player statistics available</p>
          )}
        </div>
      </div>
    );
  };

  const renderTeamsTab = () => {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Team statistics coming soon...</p>
        <p className="text-sm text-muted-foreground mt-2">
          This will show team standings and performance across matchdays
        </p>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overall':
        return renderOverallTab();
      case 'matchday':
        return renderMatchdayTab();
      case 'players':
        return renderPlayersTab();
      case 'teams':
        return renderTeamsTab();
      default:
        return null;
    }
  };

  // Show loading state while checking group
  if (groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if no active group
  if (!activeGroup) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-semibold">No Group Selected</h2>
          <p className="text-muted-foreground">
            You need to join or create a group to view statistics. 
            Click on "Select Group" in the header to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="text-muted-foreground">
          View player performance and team standings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
              }`}
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