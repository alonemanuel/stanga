"use client";

import * as React from "react";
import { useGames, useGame, useStartGame, useEndGame, useDeleteGame, usePenalties, useStartPenalties, useLogPenaltyKick } from "@/lib/hooks/use-games";
import { useMatchdayTeams } from "@/lib/hooks/use-teams";
import { usePlayers } from "@/lib/hooks/use-players";
import { useGameGoals, useAddGoal, useEditGoal, useDeleteGoal } from "@/lib/hooks/use-goal-management";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChevronDown, ChevronUp, User, Play, Pause, RotateCcw, Trash2, X } from "lucide-react";
import { useConfirmWithOptions, useConfirm } from "@/lib/hooks/use-dialogs";
import type { Game } from "@/lib/hooks/use-games";

interface GameManagementProps {
  matchdayId: string;
  maxPlayersPerTeam: number;
}

interface GameTimerProps {
  game: Game;
  onTimeUpdate?: (minutes: number, seconds: number) => void;
}

// Enhanced Game Timer Component with Controls
function GameTimer({ game, onTimeUpdate }: GameTimerProps) {
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(0);
  const pausedTimeRef = React.useRef<number>(0);
  
  React.useEffect(() => {
    if (game.status === 'active' && game.startedAt) {
      if (!startTimeRef.current) {
        startTimeRef.current = new Date(game.startedAt).getTime();
      }
      
      if (!isPaused) {
        const updateTimer = () => {
          const now = new Date().getTime();
          const baseElapsed = Math.floor((now - startTimeRef.current) / 1000);
          setElapsedTime(baseElapsed);
          
          const minutes = Math.floor(baseElapsed / 60);
          const seconds = baseElapsed % 60;
          onTimeUpdate?.(minutes, seconds);
        };
        
        updateTimer();
        intervalRef.current = setInterval(updateTimer, 1000);
        
        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      } else {
        // Keep showing the paused time
        if (pausedTimeRef.current > 0) {
          setElapsedTime(pausedTimeRef.current);
        }
      }
    }
  }, [game.status, game.startedAt, onTimeUpdate, isPaused]);
  
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  
  const handlePlayPause = () => {
    if (isPaused) {
      // Resuming: adjust startTime to continue from paused time
      const now = new Date().getTime();
      startTimeRef.current = now - (pausedTimeRef.current * 1000);
      setIsPaused(false);
    } else {
      // Pausing: store current time
      pausedTimeRef.current = elapsedTime;
      setIsPaused(true);
    }
  };
  
  const handleRestart = () => {
    const now = new Date().getTime();
    startTimeRef.current = now;
    pausedTimeRef.current = 0;
    setElapsedTime(0);
    // Keep the paused state as is - don't change it
  };
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Time Display */}
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-green-700">Active Game</h3>
          <div className="text-2xl font-mono font-bold text-green-700">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            className="h-9 w-9 p-0 rounded-full"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRestart}
            className="h-9 w-9 p-0 rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
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
  const deleteGameMutation = useDeleteGame();
  const confirm = useConfirm();
  
  const [showPenalties, setShowPenalties] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  
  const players = playersData?.data || [];
  const teams = teamsData?.data || [];
  
  // Get team players
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
  
  const handleAddGoal = async (teamId: string, playerId: string) => {
    try {
      await addGoalMutation.mutateAsync({
        gameId: game.id,
        teamId,
        playerId,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleEditGoal = async (goalId: string, playerId: string) => {
    try {
      await editGoalMutation.mutateAsync({
        goalId,
        playerId,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleDeleteGoal = async (goalId: string) => {
    try {
      const confirmed = await confirm({
        title: 'Delete Goal',
        message: 'Are you sure you want to delete this goal? This will also update the score.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'default',
      });

      if (confirmed) {
        await deleteGoalMutation.mutateAsync(goalId);
      }
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
  
  const handleGoToPenalties = () => {
    setShowPenalties(true);
  };

  const handleCancelGame = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    try {
      await deleteGameMutation.mutateAsync({
        gameId: game.id,
        matchdayId: matchdayId
      });
      setShowCancelDialog(false);
      // Call onGameEnd immediately to update the UI
      onGameEnd();
    } catch (error) {
      // Error handled by mutation
      setShowCancelDialog(false);
    }
  };

  const isLoading = goalsLoading || addGoalMutation.isPending || editGoalMutation.isPending || deleteGoalMutation.isPending;
  
  // Combine and sort goals chronologically
  const allGoals = [
    ...(goalsData?.homeTeamGoals || []).map(g => ({ ...g, teamId: game.homeTeamId, teamName: game.homeTeam?.name, teamColor: game.homeTeam?.colorHex })),
    ...(goalsData?.awayTeamGoals || []).map(g => ({ ...g, teamId: game.awayTeamId, teamName: game.awayTeam?.name, teamColor: game.awayTeam?.colorHex }))
  ].sort((a, b) => a.minute - b.minute);

  const isGameTied = (goalsData?.homeTeamGoals.length || 0) === (goalsData?.awayTeamGoals.length || 0);

  return (
    <div className="space-y-6">
      {/* Timer Card */}
      <GameTimer game={game} />
      
      {/* Game Controls */}
      <div className="bg-card border-2 border-green-200 rounded-lg p-6">
        <div className="flex justify-center space-x-2">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    onClick={handleGoToPenalties}
                    disabled={endGameMutation.isPending || !isGameTied || showPenalties}
                  >
                    Go to Penalties
                  </Button>
                </span>
              </TooltipTrigger>
              {(!isGameTied || showPenalties) && (
                <TooltipContent>
                  <p>{showPenalties ? 'Already in penalty mode' : 'Only available when the game is tied'}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={() => handleEndGame('regulation')}
            disabled={endGameMutation.isPending}
          >
            End Game
          </Button>
          <Button
            variant="outline"
            onClick={handleCancelGame}
            disabled={deleteGameMutation.isPending || endGameMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Score Card with Goals */}
      <div className="bg-card border-2 border-green-200 rounded-lg p-6">
        {/* Score Display */}
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl mb-2 mx-auto border-2"
              style={{ 
                backgroundColor: game.homeTeam?.colorHex,
                borderColor: game.homeTeam?.colorHex?.toLowerCase() === '#ffffff' || game.homeTeam?.colorHex?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent',
                color: game.homeTeam?.colorHex?.toLowerCase() === '#ffffff' || game.homeTeam?.colorHex?.toLowerCase() === '#fff' ? '#000000' : '#ffffff'
              }}
            >
              {goalsData?.homeTeamGoals.length || 0}
            </div>
            <p className="text-sm font-medium mb-2">{game.homeTeam?.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isLoading}>
                  + Goal
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {homeTeamPlayers.map(player => (
                  <DropdownMenuItem key={player.id} onClick={() => handleAddGoal(game.homeTeamId, player.id)}>
                    {player.name}
                  </DropdownMenuItem>
                ))}
                {homeTeamPlayers.length === 0 && (
                  <DropdownMenuItem disabled>No players available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="text-4xl font-bold text-muted-foreground self-start mt-4">VS</div>
          
          <div className="text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl mb-2 mx-auto border-2"
              style={{ 
                backgroundColor: game.awayTeam?.colorHex,
                borderColor: game.awayTeam?.colorHex?.toLowerCase() === '#ffffff' || game.awayTeam?.colorHex?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent',
                color: game.awayTeam?.colorHex?.toLowerCase() === '#ffffff' || game.awayTeam?.colorHex?.toLowerCase() === '#fff' ? '#000000' : '#ffffff'
              }}
            >
              {goalsData?.awayTeamGoals.length || 0}
            </div>
            <p className="text-sm font-medium mb-2">{game.awayTeam?.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isLoading}>
                  + Goal
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {awayTeamPlayers.map(player => (
                  <DropdownMenuItem key={player.id} onClick={() => handleAddGoal(game.awayTeamId, player.id)}>
                    {player.name}
                  </DropdownMenuItem>
                ))}
                {awayTeamPlayers.length === 0 && (
                  <DropdownMenuItem disabled>No players available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Goals Section */}
        {allGoals.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Goals</h4>
              {allGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 border"
                      style={{ 
                        backgroundColor: goal.teamColor,
                        borderColor: goal.teamColor?.toLowerCase() === '#ffffff' || goal.teamColor?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent'
                      }}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="font-medium" disabled={isLoading}>
                          {goal.playerName || 'Unknown Player'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(goal.teamId === game.homeTeamId ? homeTeamPlayers : awayTeamPlayers).map(player => (
                          <DropdownMenuItem 
                            key={player.id} 
                            onClick={() => handleEditGoal(goal.id, player.id)}
                          >
                            {player.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="text-xs text-gray-500">{goal.minute}'</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteGoal(goal.id)}
                    disabled={isLoading}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Penalty Section (if active) */}
      {showPenalties && (
        <PenaltySection 
          game={game}
          matchdayId={matchdayId}
          homeTeamPlayers={homeTeamPlayers}
          awayTeamPlayers={awayTeamPlayers}
          onBack={() => setShowPenalties(false)}
          onEndGame={onGameEnd}
        />
      )}

      {/* Cancel Game Confirmation Dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        title="Cancel Game"
        message="Are you sure you want to cancel this game? This action cannot be undone and will permanently delete the game and all its data."
        confirmText="Delete Game"
        cancelText="Keep Game"
        variant="default"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
}

// Penalty Section Component
interface PenaltySectionProps {
  game: Game;
  matchdayId: string;
  homeTeamPlayers: Array<{ id: string; name: string; isActive: boolean }>;
  awayTeamPlayers: Array<{ id: string; name: string; isActive: boolean }>;
  onBack: () => void;
  onEndGame: () => void;
}

function PenaltySection({ game, matchdayId, homeTeamPlayers, awayTeamPlayers, onBack, onEndGame }: PenaltySectionProps) {
  const { data: penaltyData, refetch: refetchPenalties } = usePenalties(game.id);
  const startPenaltiesMutation = useStartPenalties();
  const logPenaltyKickMutation = useLogPenaltyKick();
  const endGameMutation = useEndGame();
  
  const hasTriedToInitialize = React.useRef(false);
  
  React.useEffect(() => {
    if (!penaltyData && !hasTriedToInitialize.current) {
      hasTriedToInitialize.current = true;
      startPenaltiesMutation.mutate(game.id);
    }
  }, [penaltyData, game.id]);

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

  const handleEndGame = async () => {
    try {
      let winnerId: string | undefined;
      if (penaltyData && penaltyData.homeTeamScore !== penaltyData.awayTeamScore) {
        winnerId = penaltyData.homeTeamScore > penaltyData.awayTeamScore 
          ? game.homeTeamId 
          : game.awayTeamId;
      }

      await endGameMutation.mutateAsync({
        gameId: game.id,
        endReason: 'penalties',
        winnerTeamId: winnerId,
      });
      onEndGame();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const homeTeamPenalties = penaltyData?.kicks
    ?.filter(kick => kick.teamId === game.homeTeamId && kick.result === 'goal')
    ?.map(kick => ({
      id: kick.id,
      playerId: kick.playerId,
      playerName: kick.player?.name || 'Unknown Player',
      kickOrder: kick.kickOrder,
    })) || [];

  const awayTeamPenalties = penaltyData?.kicks
    ?.filter(kick => kick.teamId === game.awayTeamId && kick.result === 'goal')
    ?.map(kick => ({
      id: kick.id,
      playerId: kick.playerId,
      playerName: kick.player?.name || 'Unknown Player',
      kickOrder: kick.kickOrder,
    })) || [];

  const allPenalties = [
    ...homeTeamPenalties.map(p => ({ ...p, teamId: game.homeTeamId, teamName: game.homeTeam?.name, teamColor: game.homeTeam?.colorHex })),
    ...awayTeamPenalties.map(p => ({ ...p, teamId: game.awayTeamId, teamName: game.awayTeam?.name, teamColor: game.awayTeam?.colorHex }))
  ].sort((a, b) => a.kickOrder - b.kickOrder);

  const isLoading = startPenaltiesMutation.isPending || logPenaltyKickMutation.isPending || endGameMutation.isPending;

  return (
    <>
      <Separator className="my-6" />
      
      <div className="bg-card border border-orange-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-orange-700">Penalty Shootout</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
          >
            Back to Game
          </Button>
        </div>
        
        {/* Penalty Score Display */}
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl mb-2 mx-auto border-2 border-orange-400"
              style={{ 
                backgroundColor: game.homeTeam?.colorHex,
                color: game.homeTeam?.colorHex?.toLowerCase() === '#ffffff' || game.homeTeam?.colorHex?.toLowerCase() === '#fff' ? '#000000' : '#ffffff'
              }}
            >
              {penaltyData?.homeTeamScore || 0}
            </div>
            <p className="text-sm font-medium mb-2">{game.homeTeam?.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  + Goal
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {homeTeamPlayers.map(player => (
                  <DropdownMenuItem key={player.id} onClick={() => handleAddPenaltyGoal(game.homeTeamId, player.id)}>
                    {player.name}
                  </DropdownMenuItem>
                ))}
                {homeTeamPlayers.length === 0 && (
                  <DropdownMenuItem disabled>No players available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="text-4xl font-bold text-muted-foreground self-start mt-4">VS</div>
          
          <div className="text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl mb-2 mx-auto border-2 border-orange-400"
              style={{ 
                backgroundColor: game.awayTeam?.colorHex,
                color: game.awayTeam?.colorHex?.toLowerCase() === '#ffffff' || game.awayTeam?.colorHex?.toLowerCase() === '#fff' ? '#000000' : '#ffffff'
              }}
            >
              {penaltyData?.awayTeamScore || 0}
            </div>
            <p className="text-sm font-medium mb-2">{game.awayTeam?.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  + Goal
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {awayTeamPlayers.map(player => (
                  <DropdownMenuItem key={player.id} onClick={() => handleAddPenaltyGoal(game.awayTeamId, player.id)}>
                    {player.name}
                  </DropdownMenuItem>
                ))}
                {awayTeamPlayers.length === 0 && (
                  <DropdownMenuItem disabled>No players available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Penalty Goals */}
        {allPenalties.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-orange-600 mb-3">Penalty Goals</h4>
              {allPenalties.map((penalty) => (
                <div key={penalty.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0 border"
                    style={{ 
                      backgroundColor: penalty.teamColor,
                      borderColor: penalty.teamColor?.toLowerCase() === '#ffffff' || penalty.teamColor?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent'
                    }}
                  />
                  <Badge variant="outline" className="font-mono text-xs bg-orange-100 text-orange-800">
                    P{penalty.kickOrder}
                  </Badge>
                  <span className="text-sm font-medium flex-1">
                    {penalty.playerName}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
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
  const confirmWithOptions = useConfirmWithOptions();
  
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
        const dontShowAgain = localStorage.getItem('stanga-skip-roster-warning') === 'true';
        
        if (dontShowAgain) {
          handleStartGame(true);
          return;
        }
        
        const details = error.details;
        const message = `Teams don't have enough players assigned:\n\n• ${details.homeTeamName}: ${details.homeTeamPlayers}/${details.required} players\n• ${details.awayTeamName}: ${details.awayTeamPlayers}/${details.required} players\n\nStart the game anyway?`;
        
        try {
          const result = await confirmWithOptions({
            title: 'Insufficient Players',
            message,
            confirmText: 'Start Game',
            cancelText: 'Cancel',
            variant: 'default',
            showDontShowAgain: true,
          });

          if (result.confirmed) {
            if (result.dontShowAgain) {
              localStorage.setItem('stanga-skip-roster-warning', 'true');
            }
            
            handleStartGame(true);
          }
        } catch (error) {
          console.log('Dialog cancelled');
        }
      }
    }
  };
  
  return (
    <div className="bg-card border rounded-lg p-6">
      <h4 className="text-md font-semibold mb-4">Start New Game</h4>
      
      <div className="space-y-4">
        {/* Team Selection Row */}
        <div className="flex items-center gap-4">
          {/* Team A Select */}
          <div className="flex-1">
            <Select value={selectedHomeTeam} onValueChange={setSelectedHomeTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select team A" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* VS Separator */}
          <div className="text-lg font-semibold text-muted-foreground px-2">
            VS
          </div>
          
          {/* Team B Select */}
          <div className="flex-1">
            <Select value={selectedAwayTeam} onValueChange={setSelectedAwayTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select team B" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams
                  .filter((t: any) => t.id !== selectedHomeTeam)
                  .map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Start Button Row */}
        <div className="flex justify-center">
          <Button
            onClick={() => handleStartGame()}
            disabled={!selectedHomeTeam || !selectedAwayTeam || startGameMutation.isPending}
            size="lg"
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
  penaltyData?: {
    id: string;
    status: string;
    homeTeamScore: number;
    awayTeamScore: number;
    kicks?: Array<{
      id: string;
      playerId: string;
      teamId: string;
      result: 'goal' | 'miss' | 'save';
      kickOrder: number;
      player?: {
        id: string;
        name: string;
      };
    }>;
  } | null;
  homeTeamId?: string;
  awayTeamId?: string;
}

function ChronologicalGoalsList({ 
  homeGoals, 
  awayGoals, 
  homeTeamName, 
  awayTeamName, 
  homeTeamColor, 
  awayTeamColor,
  penaltyData,
  homeTeamId,
  awayTeamId
}: ChronologicalGoalsListProps) {
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

  const sortedGoals = allGoals.sort((a, b) => a.minute - b.minute);

  const penaltyGoals = penaltyData?.kicks
    ?.filter(kick => kick.result === 'goal')
    ?.map(kick => {
      const isHomeTeam = kick.teamId === homeTeamId;
      return {
        id: kick.id,
        playerId: kick.playerId,
        playerName: kick.player?.name || 'Unknown Player',
        teamName: isHomeTeam ? homeTeamName : awayTeamName,
        teamColor: isHomeTeam ? homeTeamColor : awayTeamColor,
        kickOrder: kick.kickOrder,
        isPenalty: true
      };
    })
    ?.sort((a, b) => a.kickOrder - b.kickOrder) || [];

  const hasRegularGoals = sortedGoals.length > 0;
  const hasPenaltyGoals = penaltyGoals.length > 0;

  if (!hasRegularGoals && !hasPenaltyGoals) {
    return (
      <div className="text-center text-sm text-gray-500 py-2">
        No goals were scored in this game
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasRegularGoals && (
        <div className="space-y-2">
          {sortedGoals.map((goal, index) => (
            <div key={goal.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0 border"
                style={{ 
                  backgroundColor: goal.teamColor,
                  borderColor: goal.teamColor?.toLowerCase() === '#ffffff' || goal.teamColor?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent'
                }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-500" />
                    <span className="font-medium truncate">
                      {goal.playerName || 'Unknown Player'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{goal.minute}'</span>
                  {goal.assistName && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs text-gray-600 truncate">
                        Assist: {goal.assistName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasPenaltyGoals && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              Penalties
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
          
          <div className="space-y-2">
            {penaltyGoals.map((penalty, index) => (
              <div key={penalty.id} className="flex items-center gap-3 p-2 bg-orange-50 rounded-md">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0 border"
                  style={{ 
                    backgroundColor: penalty.teamColor,
                    borderColor: penalty.teamColor?.toLowerCase() === '#ffffff' || penalty.teamColor?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent'
                  }}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded border">
                      P{penalty.kickOrder}
                    </span>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-gray-500" />
                      <span className="font-medium truncate">
                        {penalty.playerName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Penalty</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentGames({ matchdayId }: RecentGamesProps) {
  const { data: gamesData } = useGames(matchdayId, 'completed');
  const [expandedGames, setExpandedGames] = React.useState<Set<string>>(new Set());
  
  const games = gamesData || [];
  const recentGames = games.slice(0, 5);
  
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
  const { data: penaltyData } = usePenalties(game.id);
  const confirm = useConfirm();
  const deleteGameMutation = useDeleteGame();
  
  const handleDeleteGame = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const confirmed = await confirm({
        title: 'Delete Game',
        message: 'Are you sure you want to delete this game? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'default',
      });

      if (confirmed) {
        await deleteGameMutation.mutateAsync({
          gameId: game.id,
          matchdayId: game.matchdayId,
        });
      }
    } catch (error) {
      console.error('Failed to delete game', error);
    }
  };
  
  return (
    <div className="bg-muted/50 rounded-lg overflow-hidden">
      <div 
        className="cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center justify-between flex-1 mr-2">
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full border"
                style={{ 
                  backgroundColor: game.homeTeam?.colorHex,
                  borderColor: game.homeTeam?.colorHex?.toLowerCase() === '#ffffff' || game.homeTeam?.colorHex?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent'
                }}
              />
              <span className="text-sm font-medium">{game.homeTeam?.name}</span>
            </div>
            
            <div className="text-lg font-bold">
              {game.homeScore} - {game.awayScore}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{game.awayTeam?.name}</span>
              <div 
                className="w-4 h-4 rounded-full border"
                style={{ 
                  backgroundColor: game.awayTeam?.colorHex,
                  borderColor: game.awayTeam?.colorHex?.toLowerCase() === '#ffffff' || game.awayTeam?.colorHex?.toLowerCase() === '#fff' ? '#d1d5db' : 'transparent'
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteGame}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
              title="Delete game"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </div>
        
        {/* Penalty Score Row */}
        {penaltyData && penaltyData.status === 'completed' && (
          <div className="px-3 pb-2">
            <div className="h-px bg-orange-300 mb-2" />
            <div className="flex items-center justify-center space-x-4 text-xs text-orange-600">
              <span>{penaltyData.homeTeamScore}</span>
              <span className="font-medium">PENALTIES</span>
              <span>{penaltyData.awayTeamScore}</span>
            </div>
          </div>
        )}
      </div>
      
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
                penaltyData={penaltyData}
                homeTeamId={game.homeTeamId}
                awayTeamId={game.awayTeamId}
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
