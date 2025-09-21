"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { 
  TeamCreateInput, 
  TeamUpdateInput, 
  TeamAssignmentCreateInput,
  TeamQueryInput 
} from '@/lib/validations/team';

// Types for API responses
interface Team {
  id: string;
  matchdayId: string;
  name: string;
  colorToken: 'blue' | 'amber' | 'rose';
  colorHex: string;
  formationJson?: Record<string, any> | null;
  createdAt: string;
  createdBy?: string | null;
}

interface TeamAssignment {
  id: string;
  matchdayId: string;
  teamId: string;
  playerId: string;
  position?: string | null;
  positionOrder?: number | null;
  xPct?: number | null;
  yPct?: number | null;
  createdAt: string;
  createdBy?: string | null;
  deletedAt?: string | null;
  player: {
    id: string;
    name: string;
    nickname?: string | null;
    position?: string | null;
    skillLevel: number;
    isActive: boolean;
  };
}

interface TeamWithAssignments extends Team {
  assignments: TeamAssignment[];
  playerCount: number;
}

interface TeamsResponse {
  data: TeamWithAssignments[];
  message?: string;
}

interface TeamResponse {
  data: TeamWithAssignments;
  message?: string;
}

interface AssignmentResponse {
  data: TeamAssignment;
  message?: string;
}

// API functions
async function fetchMatchdayTeams(matchdayId: string): Promise<TeamsResponse> {
  console.log('🌐 Fetching teams for matchday:', matchdayId);
  const response = await fetch(`/api/matchdays/${matchdayId}/teams`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch teams');
  }
  
  const data = await response.json();
  console.log('📦 Teams data received:', data);
  return data;
}

async function initializeTeams(matchdayId: string): Promise<TeamsResponse> {
  const response = await fetch(`/api/matchdays/${matchdayId}/teams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to initialize teams');
  }
  
  return response.json();
}

async function updateTeam(teamId: string, data: TeamUpdateInput): Promise<TeamResponse> {
  const response = await fetch(`/api/teams/${teamId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update team');
  }
  
  return response.json();
}

async function assignPlayer(teamId: string, data: TeamAssignmentCreateInput): Promise<AssignmentResponse> {
  const response = await fetch(`/api/teams/${teamId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign player');
  }
  
  return response.json();
}

async function unassignPlayer(assignmentId: string): Promise<AssignmentResponse> {
  const response = await fetch(`/api/team-assignments/${assignmentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unassign player');
  }
  
  return response.json();
}

// React Query hooks
export function useMatchdayTeams(matchdayId: string) {
  return useQuery({
    queryKey: ['teams', 'matchday', matchdayId],
    queryFn: () => fetchMatchdayTeams(matchdayId),
    enabled: !!matchdayId,
    staleTime: 0, // Always consider data stale to allow immediate refetching after mutations
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes but always refetch when needed
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid unnecessary requests
    refetchOnMount: true, // Always refetch when component mounts
  });
}

export function useInitializeTeams() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: initializeTeams,
    onSuccess: (data, matchdayId) => {
      // Update the teams cache directly
      queryClient.setQueryData(['teams', 'matchday', matchdayId], data);
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['teams', 'matchday', matchdayId] });
      toast.success(data.message || 'Teams initialized successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: TeamUpdateInput }) => 
      updateTeam(teamId, data),
    onSuccess: (data) => {
      // Invalidate all teams queries to refresh
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success(data.message || 'Team updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAssignPlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: TeamAssignmentCreateInput }) => 
      assignPlayer(teamId, data),
    onMutate: async ({ teamId, data }) => {
      console.log('🔄 Assigning player - onMutate called', { teamId, data });
      
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['teams'] });
      
      // Snapshot the previous value for rollback
      const previousTeams = queryClient.getQueriesData({ queryKey: ['teams'] });
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['teams'] }, (oldData: any) => {
        if (!oldData?.data) return oldData;
        
        console.log('🔄 Optimistically adding player to team', { teamId, playerId: data.playerId });
        
        // Try to get player data from any players cache
        let playerInfo = null;
        
        // Get all queries that start with 'players'
        const allPlayersQueries = queryClient.getQueriesData({ queryKey: ['players'] });
        console.log('🔍 Available players queries:', allPlayersQueries.length, allPlayersQueries.map(([key]) => key));
        
        for (const [queryKey, queryData] of allPlayersQueries) {
          const playersData = queryData as any;
          console.log('🔍 Checking cache key:', queryKey, 'data structure:', playersData?.data ? `${playersData.data.length} players` : 'no data');
          
          if (playersData?.data && Array.isArray(playersData.data)) {
            playerInfo = playersData.data.find((p: any) => p.id === data.playerId);
            if (playerInfo) {
              console.log('🎯 Found player data in cache:', playerInfo, 'from key:', queryKey);
              break;
            }
          }
        }
        
        if (!playerInfo) {
          console.log('⚠️ Player data not found in any cache, using fallback');
        }
        
        const updatedTeams = oldData.data.map((team: any) => {
          if (team.id === teamId) {
            // Create a mock assignment for optimistic update with real player data if available
            const mockAssignment = {
              id: `temp-${Date.now()}`,
              playerId: data.playerId,
              teamId: teamId,
              player: playerInfo || {
                id: data.playerId,
                name: 'Loading...',
                skillLevel: 5,
              }
            };
            
            return {
              ...team,
              assignments: [...(team.assignments || []), mockAssignment],
              playerCount: (team.playerCount || 0) + 1,
            };
          }
          return team;
        });
        
        return { ...oldData, data: updatedTeams };
      });
      
      return { previousTeams };
    },
    onSuccess: (data, variables) => {
      console.log('✅ Assign player - onSuccess called', { data, variables });
      
      // Don't refetch immediately - let optimistic updates persist
      // The cache will naturally refresh on next mount/focus/interval
      console.log('🎯 Keeping optimistic updates, skipping immediate refetch');
      
      toast.success(data.message || 'Player assigned successfully');
    },
    onError: (error: Error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousTeams) {
        context.previousTeams.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message);
    },
    onSettled: (data, error) => {
      // Only refetch on error to ensure consistency, let optimistic updates persist on success
      if (error) {
        console.log('🔄 Refetching due to error');
        queryClient.refetchQueries({ 
          queryKey: ['teams', 'matchday'], 
          exact: false 
        });
      }
    },
  });
}

export function useUnassignPlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: unassignPlayer,
    onMutate: async (assignmentId) => {
      console.log('🔄 Unassigning player - onMutate called', { assignmentId });
      
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['teams'] });
      
      // Snapshot the previous value for rollback
      const previousTeams = queryClient.getQueriesData({ queryKey: ['teams'] });
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['teams'] }, (oldData: any) => {
        if (!oldData?.data) return oldData;
        
        console.log('🔄 Optimistically removing player assignment', { assignmentId });
        
        const updatedTeams = oldData.data.map((team: any) => {
          if (team.assignments && team.assignments.length > 0) {
            const filteredAssignments = team.assignments.filter((assignment: any) => assignment.id !== assignmentId);
            
            if (filteredAssignments.length !== team.assignments.length) {
              // Assignment was removed from this team
              return {
                ...team,
                assignments: filteredAssignments,
                playerCount: Math.max(0, (team.playerCount || 0) - 1),
              };
            }
          }
          return team;
        });
        
        return { ...oldData, data: updatedTeams };
      });
      
      return { previousTeams };
    },
    onSuccess: (data) => {
      console.log('✅ Unassign player - onSuccess called', { data });
      
      // Don't refetch immediately - let optimistic updates persist
      // The cache will naturally refresh on next mount/focus/interval
      console.log('🎯 Keeping optimistic updates, skipping immediate refetch');
      
      toast.success(data.message || 'Player unassigned successfully');
    },
    onError: (error: Error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousTeams) {
        context.previousTeams.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message);
    },
    onSettled: (data, error) => {
      // Only refetch on error to ensure consistency, let optimistic updates persist on success
      if (error) {
        console.log('🔄 Refetching due to error');
        queryClient.refetchQueries({ 
          queryKey: ['teams', 'matchday'], 
          exact: false 
        });
      }
    },
  });
}
