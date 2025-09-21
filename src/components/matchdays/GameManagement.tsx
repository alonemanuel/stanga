"use client";

import * as React from "react";
import { useGames, useGame, useStartGame, useEndGame } from "@/lib/hooks/use-games";
import { useMatchdayTeams } from "@/lib/hooks/use-teams";
import { usePlayers } from "@/lib/hooks/use-players";
import { useGameGoals, useAddGoal, useEditGoal, useDeleteGoal } from "@/lib/hooks/use-goal-management";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenaltyShootout } from "./PenaltyShootout";
import { GoalList } from "./GoalList";
import type { Game } from "@/lib/hooks/use-games";

interface GameManagementProps {
  matchdayId: string;
  maxPlayersPerTeam: number;
}

interface GameTimerProps {
  game: Game;
  onTimeUpdate?: (minutes: number, seconds: number) => void;
}

// Game Timer Component
function GameTimer({ game, onTimeUpdate }: GameTimerProps) {
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    if (game.status === 'active' && game.startedAt) {
      const startTime = new Date(game.startedAt).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        onTimeUpdate?.(minutes, seconds);
      };
      
      // Update immediately
      updateTimer();
      
      // Update every second
      intervalRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setElapsedTime(0);
    }
  }, [game.status, game.startedAt, onTimeUpdate]);
  
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  
  return (
    <div className="text-2xl font-mono font-bold text-center">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}

// Active Game Component
interface ActiveGameProps {
  game: Game;
  matchdayId: string;
  onGameEnd: () => void;
}

function ActiveGame({ game, matchdayId, onGameEnd }: ActiveGameProps) {
  const { data: playersData } = usePlayers();
  const { data: goalsData, isLoading: goalsLoading } = useGameGoals(game.id);
  const addGoalMutation = useAddGoal();
  const editGoalMutation = useEditGoal();
  const deleteGoalMutation = useDeleteGoal();
  const endGameMutation = useEndGame();
  
  const [showPenalties, setShowPenalties] = React.useState(false);
  
  const players = playersData?.data || [];
  const activePlayers = players.filter(p => p.isActive);
  
  // Get team players for goal assignment
  const homeTeamPlayers = activePlayers; // TODO: Filter to actual team players when team assignments are available
  const awayTeamPlayers = activePlayers; // TODO: Filter to actual team players when team assignments are available
  
  // Check if game should show penalties (tied and ended)
  React.useEffect(() => {
    if (game.status === 'completed' && game.homeScore === game.awayScore) {
      setShowPenalties(true);
    }
  }, [game.status, game.homeScore, game.awayScore]);
  
  const handleAddGoal = async (teamId: string, playerId: string, assistId?: string) => {
    try {
      await addGoalMutation.mutateAsync({
        gameId: game.id,
        teamId,
        playerId,
        assistId,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleEditGoal = async (goalId: string, playerId: string, assistId?: string) => {
    try {
      await editGoalMutation.mutateAsync({
        goalId,
        playerId,
        assistId,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalMutation.mutateAsync(goalId);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleEndGame = async (reason: string, winnerId?: string) => {
    try {
      await endGameMutation.mutateAsync({
        gameId: game.id,
        endReason: reason,
        winnerTeamId: winnerId,
      });
      onGameEnd();
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  // Show penalty shootout if game is completed and tied
  if (showPenalties) {
    return (
      <div className="space-y-6">
        <PenaltyShootout 
          game={game} 
          onShootoutEnd={() => {
            setShowPenalties(false);
            onGameEnd();
          }}
        />
      </div>
    );
  }

  const isLoading = goalsLoading || addGoalMutation.isPending || editGoalMutation.isPending || deleteGoalMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {game.status === 'active' ? 'Active Game' : 'Game Completed'}
          </h3>
          <Badge variant="secondary" className={game.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {game.status === 'active' ? 'Live' : 'Completed'}
          </Badge>
        </div>
        
        {/* Score Display */}
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
              style={{ backgroundColor: game.homeTeam?.colorHex }}
            >
              {goalsData?.homeTeamGoals.length || 0}
            </div>
            <p className="text-sm font-medium">{game.homeTeam?.name}</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-muted-foreground mb-2">VS</div>
            <GameTimer game={game} />
          </div>
          
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
              style={{ backgroundColor: game.awayTeam?.colorHex }}
            >
              {goalsData?.awayTeamGoals.length || 0}
            </div>
            <p className="text-sm font-medium">{game.awayTeam?.name}</p>
          </div>
        </div>
      </div>
      
      {/* Goal Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Home Team Goals */}
        <GoalList
          teamId={game.homeTeamId}
          teamName={game.homeTeam?.name || 'Home Team'}
          goals={goalsData?.homeTeamGoals || []}
          players={homeTeamPlayers}
          onAddGoal={(playerId, assistId) => handleAddGoal(game.homeTeamId, playerId, assistId)}
          onEditGoal={handleEditGoal}
          onDeleteGoal={handleDeleteGoal}
          isLoading={isLoading}
        />
        
        {/* Away Team Goals */}
        <GoalList
          teamId={game.awayTeamId}
          teamName={game.awayTeam?.name || 'Away Team'}
          goals={goalsData?.awayTeamGoals || []}
          players={awayTeamPlayers}
          onAddGoal={(playerId, assistId) => handleAddGoal(game.awayTeamId, playerId, assistId)}
          onEditGoal={handleEditGoal}
          onDeleteGoal={handleDeleteGoal}
          isLoading={isLoading}
        />
      </div>
      
      {/* Game Controls */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => handleEndGame('regulation')}
            disabled={endGameMutation.isPending}
          >
            End Game
          </Button>
        </div>
      </div>
    </div>
  );
}

// Game Queue Component
interface GameQueueProps {
  matchdayId: string;
  onGameStart: (game: Game) => void;
}

function GameQueue({ matchdayId, onGameStart }: GameQueueProps) {
  const { data: teamsData } = useMatchdayTeams(matchdayId);
  const startGameMutation = useStartGame();
  
  const [selectedHomeTeam, setSelectedHomeTeam] = React.useState<string>('');
  const [selectedAwayTeam, setSelectedAwayTeam] = React.useState<string>('');
  
  const teams = teamsData?.data || [];
  const availableTeams = teams.filter((t: any) => t.isActive);
  
  const handleStartGame = async (force = false) => {
    if (!selectedHomeTeam || !selectedAwayTeam) {
      return;
    }
    
    try {
      const game = await startGameMutation.mutateAsync({
        matchdayId,
        homeTeamId: selectedHomeTeam,
        awayTeamId: selectedAwayTeam,
        force,
      });
      onGameStart(game);
    } catch (error: any) {
      if (error.code === 'INSUFFICIENT_PLAYERS' && !force) {
        // Check if user has disabled this warning
        const dontShowAgain = localStorage.getItem('stanga-skip-roster-warning') === 'true';
        
        if (dontShowAgain) {
          // Skip dialog and start with force
          handleStartGame(true);
          return;
        }
        
        // Show confirmation dialog
        const details = error.details;
        const message = `Teams don't have enough players assigned:\n\n• ${details.homeTeamName}: ${details.homeTeamPlayers}/${details.required} players\n• ${details.awayTeamName}: ${details.awayTeamPlayers}/${details.required} players\n\nStart the game anyway?`;
        
        const confirmed = window.confirm(message);
        if (confirmed) {
          // Ask about "don't show again"
          const dontShowAgain = window.confirm("Don't show this warning again?");
          if (dontShowAgain) {
            localStorage.setItem('stanga-skip-roster-warning', 'true');
          }
          
          // Start game with force
          handleStartGame(true);
        }
      }
      // Other errors are handled by the mutation's onError
    }
  };
  
  return (
    <div className="bg-card border rounded-lg p-6">
      <h4 className="text-md font-semibold mb-4">Start New Game</h4>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Home Team */}
        <div>
          <label className="block text-sm font-medium mb-2">Home Team</label>
          <select
            value={selectedHomeTeam}
            onChange={(e) => setSelectedHomeTeam(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select home team</option>
            {availableTeams.map((team: any) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Away Team */}
        <div>
          <label className="block text-sm font-medium mb-2">Away Team</label>
          <select
            value={selectedAwayTeam}
            onChange={(e) => setSelectedAwayTeam(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select away team</option>
            {availableTeams
              .filter((t: any) => t.id !== selectedHomeTeam)
              .map((team: any) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </select>
        </div>
        
        {/* Start Button */}
        <div className="flex items-end">
          <Button
            onClick={() => handleStartGame()}
            disabled={!selectedHomeTeam || !selectedAwayTeam || startGameMutation.isPending}
            loading={startGameMutation.isPending}
            className="w-full"
          >
            Start Game
          </Button>
        </div>
      </div>
    </div>
  );
}

// Recent Games Component
interface RecentGamesProps {
  matchdayId: string;
}

function RecentGames({ matchdayId }: RecentGamesProps) {
  const { data: gamesData } = useGames(matchdayId, 'completed');
  
  const games = gamesData || [];
  const recentGames = games.slice(0, 5); // Show last 5 games
  
  if (recentGames.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h4 className="text-md font-semibold mb-4">Recent Results</h4>
        <p className="text-muted-foreground text-center py-4">No completed games yet</p>
      </div>
    );
  }
  
  return (
    <div className="bg-card border rounded-lg p-6">
      <h4 className="text-md font-semibold mb-4">Recent Results</h4>
      
      <div className="space-y-3">
        {recentGames.map(game => (
          <div key={game.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: game.homeTeam?.colorHex }}
                />
                <span className="text-sm font-medium">{game.homeTeam?.name}</span>
              </div>
              
              <div className="text-lg font-bold">
                {game.homeScore} - {game.awayScore}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{game.awayTeam?.name}</span>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: game.awayTeam?.colorHex }}
                />
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {game.endReason === 'early_finish' && 'Early finish'}
              {game.endReason === 'regulation' && 'Full time'}
              {game.endReason === 'penalties' && 'Penalties'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Component
export function GameManagement({ matchdayId, maxPlayersPerTeam }: GameManagementProps) {
  const { data: gamesData } = useGames(matchdayId);
  const [activeGameId, setActiveGameId] = React.useState<string | null>(null);
  
  const games = gamesData || [];
  const activeGame = games.find(g => g.status === 'active');
  
  React.useEffect(() => {
    if (activeGame) {
      setActiveGameId(activeGame.id);
    } else {
      setActiveGameId(null);
    }
  }, [activeGame]);
  
  const handleGameStart = (game: Game) => {
    setActiveGameId(game.id);
  };
  
  const handleGameEnd = () => {
    setActiveGameId(null);
  };
  
  return (
    <div className="space-y-6">
      {activeGame ? (
        <ActiveGame 
          game={activeGame} 
          matchdayId={matchdayId}
          onGameEnd={handleGameEnd}
        />
      ) : (
        <GameQueue 
          matchdayId={matchdayId} 
          onGameStart={handleGameStart}
        />
      )}
      
      <RecentGames matchdayId={matchdayId} />
    </div>
  );
}
