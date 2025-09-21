"use client";

import * as React from "react";
import { useGames, useGame, useStartGame, useEndGame, usePenalties, useStartPenalties, useLogPenaltyKick } from "@/lib/hooks/use-games";
import { useMatchdayTeams } from "@/lib/hooks/use-teams";
import { usePlayers } from "@/lib/hooks/use-players";
import { useGameGoals, useAddGoal, useEditGoal, useDeleteGoal } from "@/lib/hooks/use-goal-management";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenaltyShootout } from "./PenaltyShootout";
import { GoalList } from "./GoalList";
import { ChevronDown, ChevronUp, User, Clock } from "lucide-react";
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
  const { data: teamsData } = useMatchdayTeams(matchdayId);
  const { data: goalsData, isLoading: goalsLoading } = useGameGoals(game.id);
  const { data: penaltyData } = usePenalties(game.id);
  const addGoalMutation = useAddGoal();
  const editGoalMutation = useEditGoal();
  const deleteGoalMutation = useDeleteGoal();
  const endGameMutation = useEndGame();
  
  const [showPenalties, setShowPenalties] = React.useState(false);
  
  const players = playersData?.data || [];
  const teams = teamsData?.data || [];
  
  // Get team players for goal assignment from team assignments
  const homeTeam = teams.find(t => t.id === game.homeTeamId);
  const awayTeam = teams.find(t => t.id === game.awayTeamId);
  
  const homeTeamPlayers = homeTeam?.assignments?.map(assignment => ({
    id: assignment.player.id,
    name: assignment.player.name,
    isActive: assignment.player.isActive
  })).filter(p => p.isActive) || [];
  
  const awayTeamPlayers = awayTeam?.assignments?.map(assignment => ({
    id: assignment.player.id,
    name: assignment.player.name,
    isActive: assignment.player.isActive
  })).filter(p => p.isActive) || [];
  
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
  
  // Show penalty mode if enabled
  if (showPenalties) {
    return (
      <PenaltyMode 
        game={game}
        matchdayId={matchdayId}
        onBackToRegular={() => setShowPenalties(false)}
        onGameEnd={onGameEnd}
      />
    );
  }

  const isLoading = goalsLoading || addGoalMutation.isPending || editGoalMutation.isPending || deleteGoalMutation.isPending;
  
  // Check if the game is tied (same number of goals for both teams)
  const isGameTied = (goalsData?.homeTeamGoals.length || 0) === (goalsData?.awayTeamGoals.length || 0);

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
            {penaltyData && (
              <div className="text-xs text-muted-foreground mb-1">
                ({penaltyData.homeTeamScore})
              </div>
            )}
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
            {penaltyData && (
              <div className="text-xs text-muted-foreground mb-1">
                ({penaltyData.awayTeamScore})
              </div>
            )}
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
            onClick={() => setShowPenalties(true)}
            disabled={endGameMutation.isPending || !isGameTied}
            title={!isGameTied ? "Only available when the game is tied" : "Start penalty shootout"}
            className={!isGameTied ? "cursor-not-allowed opacity-50" : ""}
          >
            Go to Penalties
          </Button>
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

interface ChronologicalGoalsListProps {
  homeGoals: Array<{
    id: string;
    playerId: string;
    playerName: string;
    minute: number;
    assistId?: string;
    assistName?: string;
  }>;
  awayGoals: Array<{
    id: string;
    playerId: string;
    playerName: string;
    minute: number;
    assistId?: string;
    assistName?: string;
  }>;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamColor: string;
  awayTeamColor: string;
}

function ChronologicalGoalsList({ 
  homeGoals, 
  awayGoals, 
  homeTeamName, 
  awayTeamName, 
  homeTeamColor, 
  awayTeamColor 
}: ChronologicalGoalsListProps) {
  // Combine all goals and add team information
  const allGoals = [
    ...homeGoals.map(goal => ({
      ...goal,
      teamName: homeTeamName,
      teamColor: homeTeamColor,
      isHome: true
    })),
    ...awayGoals.map(goal => ({
      ...goal,
      teamName: awayTeamName,
      teamColor: awayTeamColor,
      isHome: false
    }))
  ];

  // Sort by minute (chronological order)
  const sortedGoals = allGoals.sort((a, b) => a.minute - b.minute);

  if (sortedGoals.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-2">
        No goals were scored in this game
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        Goals in chronological order ({sortedGoals.length})
      </div>
      
      <div className="space-y-2">
        {sortedGoals.map((goal, index) => (
          <div key={goal.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
            {/* Team color indicator */}
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: goal.teamColor }}
            />
            
            {/* Goal details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border">
                  #{index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-gray-500" />
                  <span className="font-medium truncate">
                    {goal.playerName || 'Unknown Player'}
                  </span>
                </div>
                {goal.assistName && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs text-gray-600 truncate">
                      Assist: {goal.assistName}
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span className="font-medium">{goal.teamName}</span>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{goal.minute}' minute</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentGames({ matchdayId }: RecentGamesProps) {
  const { data: gamesData } = useGames(matchdayId, 'completed');
  const [expandedGames, setExpandedGames] = React.useState<Set<string>>(new Set());
  
  const games = gamesData || [];
  const recentGames = games.slice(0, 5); // Show last 5 games
  
  const toggleGameExpansion = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };
  
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
        {recentGames.map(game => {
          const isExpanded = expandedGames.has(game.id);
          
          return (
            <RecentGameItem 
              key={game.id} 
              game={game} 
              isExpanded={isExpanded}
              onToggle={() => toggleGameExpansion(game.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface RecentGameItemProps {
  game: Game;
  isExpanded: boolean;
  onToggle: () => void;
}

function RecentGameItem({ game, isExpanded, onToggle }: RecentGameItemProps) {
  const { data: goalsData, isLoading } = useGameGoals(game.id);
  
  return (
    <div className="bg-muted/50 rounded-lg overflow-hidden">
      {/* Main game row - clickable */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={onToggle}
      >
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
        
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>
      
      {/* Expandable goal details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-200">
          {isLoading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              Loading goal details...
            </div>
          ) : goalsData ? (
            <div className="pt-3">
              <ChronologicalGoalsList 
                homeGoals={goalsData.homeTeamGoals}
                awayGoals={goalsData.awayTeamGoals}
                homeTeamName={game.homeTeam?.name || 'Home Team'}
                awayTeamName={game.awayTeam?.name || 'Away Team'}
                homeTeamColor={game.homeTeam?.colorHex || '#3b82f6'}
                awayTeamColor={game.awayTeam?.colorHex || '#ef4444'}
              />
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-red-500">
              Failed to load goal details
            </div>
          )}
        </div>
      )}
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

// Penalty Mode Component
interface PenaltyModeProps {
  game: Game;
  matchdayId: string;
  onBackToRegular: () => void;
  onGameEnd: () => void;
}

function PenaltyMode({ game, matchdayId, onBackToRegular, onGameEnd }: PenaltyModeProps) {
  const { data: playersData } = usePlayers();
  const { data: teamsData } = useMatchdayTeams(matchdayId);
  const { data: penaltyData, refetch: refetchPenalties } = usePenalties(game.id);
  const startPenaltiesMutation = useStartPenalties();
  const logPenaltyKickMutation = useLogPenaltyKick();
  const endGameMutation = useEndGame();

  const players = playersData?.data || [];
  const teams = teamsData?.data || [];

  // Filter players by team assignments
  const teamAssignments = teams.flatMap((team: any) => 
    team.assignments?.map((assignment: any) => ({
      teamId: team.id,
      playerId: assignment.playerId,
      player: assignment.player
    })) || []
  );

  const homeTeamPlayers = teamAssignments
    .filter((assignment: any) => assignment.teamId === game.homeTeamId)
    .map((assignment: any) => assignment.player);

  const awayTeamPlayers = teamAssignments
    .filter((assignment: any) => assignment.teamId === game.awayTeamId)
    .map((assignment: any) => assignment.player);

  // Initialize penalty shootout if it doesn't exist
  React.useEffect(() => {
    if (!penaltyData && game.homeScore === game.awayScore) {
      startPenaltiesMutation.mutate(game.id);
    }
  }, [penaltyData, game.homeScore, game.awayScore, game.id, startPenaltiesMutation]);

  const handleAddPenaltyGoal = async (teamId: string, playerId: string) => {
    try {
      await logPenaltyKickMutation.mutateAsync({
        gameId: game.id,
        playerId,
        teamId,
        result: 'goal',
      });
      refetchPenalties();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditPenaltyGoal = async (goalId: string, playerId: string) => {
    // For penalties, we might need a different edit approach
    // For now, we'll handle this in the penalty kick API
    console.log('Edit penalty goal:', goalId, playerId);
  };

  const handleDeletePenaltyGoal = async (goalId: string) => {
    // For penalties, we might need a different delete approach
    // For now, we'll handle this in the penalty kick API
    console.log('Delete penalty goal:', goalId);
  };

  const handleEndGame = async (reason: string) => {
    try {
      let winnerId: string | undefined;
      if (penaltyData && penaltyData.homeTeamScore !== penaltyData.awayTeamScore) {
        winnerId = penaltyData.homeTeamScore > penaltyData.awayTeamScore 
          ? game.homeTeamId 
          : game.awayTeamId;
      }

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

  // Convert penalty kicks to goal format for GoalList component
  const homeTeamPenalties = penaltyData?.kicks
    ?.filter(kick => kick.teamId === game.homeTeamId && kick.result === 'goal')
    ?.map(kick => ({
      id: kick.id,
      playerId: kick.playerId,
      playerName: kick.player?.name || 'Unknown Player',
      minute: kick.kickOrder,
      teamId: kick.teamId,
    })) || [];

  const awayTeamPenalties = penaltyData?.kicks
    ?.filter(kick => kick.teamId === game.awayTeamId && kick.result === 'goal')
    ?.map(kick => ({
      id: kick.id,
      playerId: kick.playerId,
      playerName: kick.player?.name || 'Unknown Player',
      minute: kick.kickOrder,
      teamId: kick.teamId,
    })) || [];

  const isLoading = startPenaltiesMutation.isPending || logPenaltyKickMutation.isPending || endGameMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Penalty Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Penalty Shootout</h3>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-orange-100 text-orange-800">
              Penalties
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToRegular}
            >
              Back to Game
            </Button>
          </div>
        </div>
        
        {/* Penalty Score Display */}
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Regular Score</div>
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
              style={{ backgroundColor: game.homeTeam?.colorHex }}
            >
              {game.homeScore}
            </div>
            <div className="text-lg font-bold text-orange-600">
              ({penaltyData?.homeTeamScore || 0})
            </div>
            <p className="text-sm font-medium">{game.homeTeam?.name}</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground mb-2">PENALTIES</div>
            <GameTimer game={game} />
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Regular Score</div>
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
              style={{ backgroundColor: game.awayTeam?.colorHex }}
            >
              {game.awayScore}
            </div>
            <div className="text-lg font-bold text-orange-600">
              ({penaltyData?.awayTeamScore || 0})
            </div>
            <p className="text-sm font-medium">{game.awayTeam?.name}</p>
          </div>
        </div>
      </div>
      
      {/* Penalty Goal Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Home Team Penalties */}
        <GoalList
          teamId={game.homeTeamId}
          teamName={`${game.homeTeam?.name || 'Home Team'} - Penalties`}
          goals={homeTeamPenalties}
          players={homeTeamPlayers}
          onAddGoal={(playerId) => handleAddPenaltyGoal(game.homeTeamId, playerId)}
          onEditGoal={handleEditPenaltyGoal}
          onDeleteGoal={handleDeletePenaltyGoal}
          isLoading={isLoading}
          isPenaltyMode={true}
        />
        
        {/* Away Team Penalties */}
        <GoalList
          teamId={game.awayTeamId}
          teamName={`${game.awayTeam?.name || 'Away Team'} - Penalties`}
          goals={awayTeamPenalties}
          players={awayTeamPlayers}
          onAddGoal={(playerId) => handleAddPenaltyGoal(game.awayTeamId, playerId)}
          onEditGoal={handleEditPenaltyGoal}
          onDeleteGoal={handleDeletePenaltyGoal}
          isLoading={isLoading}
          isPenaltyMode={true}
        />
      </div>
      
      {/* Penalty Controls */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => handleEndGame('penalties')}
            disabled={endGameMutation.isPending}
          >
            End Game
          </Button>
        </div>
      </div>
    </div>
  );
}
