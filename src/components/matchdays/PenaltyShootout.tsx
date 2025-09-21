"use client";

import * as React from "react";
import { usePenalties, useStartPenalties, useLogPenaltyKick } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Game, PenaltyShootout, PenaltyKick } from "@/lib/hooks/use-games";

interface PenaltyShootoutProps {
  game: Game;
  onShootoutEnd: () => void;
}

interface PenaltyKickFormProps {
  game: Game;
  shootout: PenaltyShootout;
  onKickLogged: () => void;
}

function PenaltyKickForm({ game, shootout, onKickLogged }: PenaltyKickFormProps) {
  const { data: playersData } = usePlayers();
  const logKickMutation = useLogPenaltyKick();
  
  const [selectedPlayer, setSelectedPlayer] = React.useState<string>('');
  const [selectedTeam, setSelectedTeam] = React.useState<string>('');
  const [selectedResult, setSelectedResult] = React.useState<'goal' | 'miss' | 'save'>('goal');
  
  const players = playersData?.data || [];
  const activePlayers = players.filter(p => p.isActive);
  
  const handleLogKick = async () => {
    if (!selectedPlayer || !selectedTeam) {
      return;
    }
    
    try {
      await logKickMutation.mutateAsync({
        gameId: game.id,
        playerId: selectedPlayer,
        teamId: selectedTeam,
        result: selectedResult,
      });
      
      // Reset form
      setSelectedPlayer('');
      setSelectedTeam('');
      setSelectedResult('goal');
      
      onKickLogged();
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  if (shootout.status !== 'active') {
    return null;
  }
  
  return (
    <div className="bg-card border rounded-lg p-4">
      <h4 className="text-md font-semibold mb-4">Log Penalty Kick</h4>
      
      <div className="grid gap-4 md:grid-cols-4">
        {/* Team Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Team</label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select team</option>
            <option value={game.homeTeamId}>{game.homeTeam?.name}</option>
            <option value={game.awayTeamId}>{game.awayTeam?.name}</option>
          </select>
        </div>
        
        {/* Player Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Player</label>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select player</option>
            {activePlayers.map(player => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Result Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Result</label>
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value as 'goal' | 'miss' | 'save')}
            className="w-full p-2 border rounded-md"
          >
            <option value="goal">Goal</option>
            <option value="miss">Miss</option>
            <option value="save">Save</option>
          </select>
        </div>
        
        {/* Log Button */}
        <div className="flex items-end">
          <Button
            onClick={handleLogKick}
            disabled={!selectedPlayer || !selectedTeam || logKickMutation.isPending}
            loading={logKickMutation.isPending}
            className="w-full"
          >
            Log Kick
          </Button>
        </div>
      </div>
    </div>
  );
}

interface KickHistoryProps {
  kicks: PenaltyKick[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}

function KickHistory({ kicks, homeTeamId, awayTeamId, homeTeamName, awayTeamName }: KickHistoryProps) {
  const homeKicks = kicks.filter(k => k.teamId === homeTeamId).sort((a, b) => a.kickOrder - b.kickOrder);
  const awayKicks = kicks.filter(k => k.teamId === awayTeamId).sort((a, b) => a.kickOrder - b.kickOrder);
  
  const maxKicks = Math.max(homeKicks.length, awayKicks.length);
  
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'goal': return '⚽';
      case 'miss': return '❌';
      case 'save': return '🧤';
      default: return '?';
    }
  };
  
  const getResultColor = (result: string) => {
    switch (result) {
      case 'goal': return 'text-green-600';
      case 'miss': return 'text-red-600';
      case 'save': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };
  
  return (
    <div className="bg-card border rounded-lg p-4">
      <h4 className="text-md font-semibold mb-4">Penalty Kicks</h4>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Home Team */}
        <div>
          <h5 className="font-medium mb-3 text-center">{homeTeamName}</h5>
          <div className="space-y-2">
            {Array.from({ length: Math.max(5, maxKicks) }, (_, i) => {
              const kick = homeKicks[i];
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">Kick {i + 1}</span>
                  {kick ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{kick.player?.name}</span>
                      <span className={`text-lg ${getResultColor(kick.result)}`}>
                        {getResultIcon(kick.result)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Away Team */}
        <div>
          <h5 className="font-medium mb-3 text-center">{awayTeamName}</h5>
          <div className="space-y-2">
            {Array.from({ length: Math.max(5, maxKicks) }, (_, i) => {
              const kick = awayKicks[i];
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">Kick {i + 1}</span>
                  {kick ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{kick.player?.name}</span>
                      <span className={`text-lg ${getResultColor(kick.result)}`}>
                        {getResultIcon(kick.result)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PenaltyShootout({ game, onShootoutEnd }: PenaltyShootoutProps) {
  const { data: shootoutData, refetch } = usePenalties(game.id);
  const startPenaltiesMutation = useStartPenalties();
  
  const handleStartPenalties = async () => {
    try {
      await startPenaltiesMutation.mutateAsync(game.id);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleKickLogged = () => {
    refetch();
  };
  
  React.useEffect(() => {
    if (shootoutData?.status === 'completed') {
      onShootoutEnd();
    }
  }, [shootoutData?.status, onShootoutEnd]);
  
  // If no shootout exists and game is tied, show start button
  if (!shootoutData && game.homeScore === game.awayScore) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Game Tied!</h3>
          <p className="text-muted-foreground mb-4">
            The game ended in a tie. Start penalty shootout to determine the winner.
          </p>
          <Button
            onClick={handleStartPenalties}
            disabled={startPenaltiesMutation.isPending}
            loading={startPenaltiesMutation.isPending}
          >
            Start Penalty Shootout
          </Button>
        </div>
      </div>
    );
  }
  
  // If shootout doesn't exist and game isn't tied, don't show anything
  if (!shootoutData) {
    return null;
  }
  
  const shootout = shootoutData;
  
  return (
    <div className="space-y-6">
      {/* Shootout Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Penalty Shootout</h3>
          <Badge variant={shootout.status === 'active' ? 'default' : 'secondary'}>
            {shootout.status === 'active' ? 'In Progress' : 'Completed'}
          </Badge>
        </div>
        
        {/* Penalty Score Display */}
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
              style={{ backgroundColor: game.homeTeam?.colorHex }}
            >
              {shootout.homeTeamScore}
            </div>
            <p className="text-sm font-medium">{game.homeTeam?.name}</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">PENALTIES</div>
          </div>
          
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
              style={{ backgroundColor: game.awayTeam?.colorHex }}
            >
              {shootout.awayTeamScore}
            </div>
            <p className="text-sm font-medium">{game.awayTeam?.name}</p>
          </div>
        </div>
        
        {shootout.status === 'completed' && shootout.winnerTeamId && (
          <div className="text-center mt-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Winner: {shootout.winnerTeamId === game.homeTeamId ? game.homeTeam?.name : game.awayTeam?.name}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Kick Form */}
      {shootout.status === 'active' && (
        <PenaltyKickForm 
          game={game} 
          shootout={shootout} 
          onKickLogged={handleKickLogged}
        />
      )}
      
      {/* Kick History */}
      {shootout.kicks && shootout.kicks.length > 0 && (
        <KickHistory
          kicks={shootout.kicks}
          homeTeamId={game.homeTeamId}
          awayTeamId={game.awayTeamId}
          homeTeamName={game.homeTeam?.name || 'Home'}
          awayTeamName={game.awayTeam?.name || 'Away'}
        />
      )}
    </div>
  );
}
