import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Goal {
  id: string;
  playerId: string;
  playerName: string;
  minute: number;
  assistId?: string;
  assistName?: string;
  teamId: string;
}

interface GameGoals {
  gameId: string;
  homeTeamGoals: Goal[];
  awayTeamGoals: Goal[];
}

// Fetch goals for a game
async function fetchGameGoals(gameId: string): Promise<GameGoals> {
  const response = await fetch(`/api/games/${gameId}/goals`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch goals');
  }
  
  const result = await response.json();
  return result.data;
}

// Add a new goal
async function addGoal(gameId: string, teamId: string, playerId: string, assistId?: string): Promise<Goal> {
  const response = await fetch(`/api/games/${gameId}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, playerId, assistId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add goal');
  }
  
  const result = await response.json();
  return result.data;
}

// Edit an existing goal
async function editGoal(goalId: string, playerId: string, assistId?: string): Promise<Goal> {
  const response = await fetch(`/api/goals/${goalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, assistId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to edit goal');
  }
  
  const result = await response.json();
  return result.data;
}

// Delete a goal
async function deleteGoal(goalId: string): Promise<void> {
  const response = await fetch(`/api/goals/${goalId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete goal');
  }
}

// Hook to fetch game goals
export function useGameGoals(gameId: string) {
  return useQuery({
    queryKey: ['game-goals', gameId],
    queryFn: () => fetchGameGoals(gameId),
    enabled: !!gameId,
  });
}

// Hook to add a goal
export function useAddGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gameId, teamId, playerId, assistId }: { 
      gameId: string; 
      teamId: string;
      playerId: string; 
      assistId?: string; 
    }) => addGoal(gameId, teamId, playerId, assistId),
    onSuccess: (data, variables) => {
      // Invalidate both the goals query and the game query
      queryClient.invalidateQueries({ queryKey: ['game-goals', variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      
      toast.success('Goal added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook to edit a goal
export function useEditGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ goalId, playerId, assistId }: { 
      goalId: string; 
      playerId: string; 
      assistId?: string; 
    }) => editGoal(goalId, playerId, assistId),
    onSuccess: (data) => {
      // We'll need to invalidate the goals for the game this goal belongs to
      // The API should return the gameId in the response
      queryClient.invalidateQueries({ queryKey: ['game-goals'] });
      queryClient.invalidateQueries({ queryKey: ['game'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      
      toast.success('Goal updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook to delete a goal
export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => {
      // Invalidate all goal-related queries
      queryClient.invalidateQueries({ queryKey: ['game-goals'] });
      queryClient.invalidateQueries({ queryKey: ['game'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      
      toast.success('Goal deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
