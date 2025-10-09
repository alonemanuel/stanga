import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types
export interface Game {
  id: string;
  matchdayId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  endReason: string | null;
  maxGoals: number | null;
  queuePosition: number;
  homeTeam?: {
    id: string;
    name: string;
    colorToken: string;
    colorHex: string;
  };
  awayTeam?: {
    id: string;
    name: string;
    colorToken: string;
    colorHex: string;
  };
  events?: GameEvent[];
}

export interface GameEvent {
  id: string;
  gameId: string;
  playerId: string | null;
  teamId: string;
  eventType: 'goal' | 'assist' | 'penalty_goal' | 'penalty_miss';
  minute: number | null;
  description: string | null;
  metadata: any;
  isActive: boolean;
  player?: {
    id: string;
    name: string;
  };
}

export interface PenaltyShootout {
  id: string;
  gameId: string;
  homeTeamScore: number;
  awayTeamScore: number;
  winnerTeamId: string | null;
  status: 'active' | 'completed';
  kicks?: PenaltyKick[];
}

export interface PenaltyKick {
  id: string;
  shootoutId: string;
  playerId: string;
  teamId: string;
  kickOrder: number;
  result: 'goal' | 'miss' | 'save';
  description: string | null;
  player?: {
    id: string;
    name: string;
  };
}

// API functions
async function fetchGames(matchdayId: string, status?: string): Promise<Game[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  
  const response = await fetch(`/api/matchdays/${matchdayId}/games?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch games');
  }
  const gamesResult = await response.json();
  return gamesResult.data;
}

async function fetchGame(gameId: string): Promise<Game> {
  const response = await fetch(`/api/games/${gameId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch game');
  }
  const gameResult = await response.json();
  return gameResult.data;
}

async function startGame(matchdayId: string, homeTeamId: string, awayTeamId: string, force = false): Promise<Game> {
  const response = await fetch(`/api/matchdays/${matchdayId}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ homeTeamId, awayTeamId, force }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    // Preserve the error details for client-side handling
    const errorObj = new Error(error.error || 'Failed to start game') as any;
    errorObj.code = error.code;
    errorObj.details = error.details;
    throw errorObj;
  }
  
  const startResult = await response.json();
  return startResult.data;
}

async function endGame(gameId: string, endReason: string, winnerTeamId?: string): Promise<Game> {
  const response = await fetch(`/api/games/${gameId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endReason, winnerTeamId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to end game');
  }
  
  const endResult = await response.json();
  return endResult.data;
}

async function deleteGame(gameId: string): Promise<void> {
  const response = await fetch(`/api/games/${gameId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete game');
  }
}


async function startPenalties(gameId: string): Promise<PenaltyShootout> {
  const response = await fetch(`/api/games/${gameId}/penalties`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start penalties');
  }
  
  const penaltyStartResult = await response.json();
  return penaltyStartResult.data;
}

async function fetchPenalties(gameId: string): Promise<PenaltyShootout | null> {
  const response = await fetch(`/api/games/${gameId}/penalties`);
  if (!response.ok) {
    // Return null for 404 (no penalty data) instead of throwing
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch penalties');
  }
  const penaltyResult = await response.json();
  return penaltyResult.data;
}

async function logPenaltyKick(gameId: string, playerId: string, teamId: string, result: 'goal' | 'miss' | 'save', description?: string) {
  const response = await fetch(`/api/games/${gameId}/penalties/kick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, teamId, result, description }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to log penalty kick');
  }
  
  const penaltyKickResult = await response.json();
  return penaltyKickResult.data;
}

// Hooks
export function useGames(matchdayId: string, status?: string) {
  return useQuery({
    queryKey: ['games', matchdayId, status],
    queryFn: () => fetchGames(matchdayId, status),
    enabled: !!matchdayId,
  });
}

export function useGame(gameId: string) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => fetchGame(gameId),
    enabled: !!gameId,
    refetchInterval: (query) => {
      // Refetch every 5 seconds if game is active
      return query.state.data?.status === 'active' ? 5000 : false;
    },
  });
}

export function useStartGame() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ matchdayId, homeTeamId, awayTeamId, force = false }: { matchdayId: string; homeTeamId: string; awayTeamId: string; force?: boolean }) =>
      startGame(matchdayId, homeTeamId, awayTeamId, force),
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['games', variables.matchdayId] });
      
      // Snapshot previous value
      const previousGames = queryClient.getQueryData(['games', variables.matchdayId]);
      
      // Optimistically add a pending game (will be replaced by server response)
      queryClient.setQueryData(['games', variables.matchdayId], (old: any) => {
        if (!old) return old;
        // Add optimistic game entry
        const optimisticGame = {
          id: 'temp-' + Date.now(),
          matchdayId: variables.matchdayId,
          homeTeamId: variables.homeTeamId,
          awayTeamId: variables.awayTeamId,
          status: 'active' as const,
          homeScore: 0,
          awayScore: 0,
          startedAt: new Date().toISOString(),
        };
        return [...old, optimisticGame];
      });
      
      return { previousGames };
    },
    
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousGames) {
        queryClient.setQueryData(['games', variables.matchdayId], context.previousGames);
      }
      // Don't show toast for insufficient players error - let the component handle it
      if ((error as any).code !== 'INSUFFICIENT_PLAYERS') {
        toast.error(error.message);
      }
    },
    
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['games', data.matchdayId] });
      toast.success('Game started successfully!');
    },
  });
}

export function useEndGame() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gameId, endReason, winnerTeamId }: { gameId: string; endReason: string; winnerTeamId?: string }) =>
      endGame(gameId, endReason, winnerTeamId),
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['game', variables.gameId] });
      
      // Snapshot previous value
      const previousGame = queryClient.getQueryData(['game', variables.gameId]);
      
      // Optimistically update game status
      queryClient.setQueryData(['game', variables.gameId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          status: 'completed' as const,
          endedAt: new Date().toISOString(),
          endReason: variables.endReason,
          winnerTeamId: variables.winnerTeamId,
        };
      });
      
      return { previousGame };
    },
    
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousGame) {
        queryClient.setQueryData(['game', variables.gameId], context.previousGame);
      }
      toast.error(error.message);
    },
    
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game', data.id] });
      queryClient.invalidateQueries({ queryKey: ['games', data.matchdayId] });
      toast.success('Game ended successfully!');
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gameId, matchdayId }: { gameId: string; matchdayId: string }) =>
      deleteGame(gameId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['game', variables.gameId],
        exact: true 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['games', variables.matchdayId],
        exact: true 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['stats', 'matchday', variables.matchdayId],
        exact: true 
      });
      // Only invalidate overall stats (allow all group variations)
      queryClient.invalidateQueries({ 
        queryKey: ['stats', 'overall'],
        exact: false 
      });
      toast.success('Game deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}



export function useStartPenalties() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (gameId: string) => startPenalties(gameId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game', data.gameId] });
      queryClient.invalidateQueries({ queryKey: ['penalties', data.gameId] });
      toast.success('Penalty shootout started!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePenalties(gameId: string) {
  return useQuery({
    queryKey: ['penalties', gameId],
    queryFn: () => fetchPenalties(gameId),
    enabled: !!gameId,
  });
}

export function useLogPenaltyKick() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gameId, playerId, teamId, result, description }: { 
      gameId: string; 
      playerId: string; 
      teamId: string; 
      result: 'goal' | 'miss' | 'save'; 
      description?: string; 
    }) => logPenaltyKick(gameId, playerId, teamId, result, description),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['penalties', data.kick.gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', data.kick.gameId] });
      
      if (data.gameEnded) {
        toast.success(`Penalty ${data.kick.result}! Game ended.`);
      } else {
        toast.success(`Penalty ${data.kick.result}!`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
