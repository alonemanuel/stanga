"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { 
  TeamCreateInput, 
  TeamUpdateInput, 
  TeamAssignmentCreateInput,
  TeamQueryInput 
} from '@/lib/validations/team';
import type { ColorToken } from '@/lib/teams';

// Types for API responses
interface Team {
  id: string;
  matchdayId: string;
  name: string;
  colorToken: ColorToken;
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

async function createTeam(matchdayId: string, data: TeamCreateInput): Promise<TeamResponse> {
  const response = await fetch('/api/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      matchdayId,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create team');
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

async function deleteTeam(teamId: string): Promise<TeamResponse> {
  const response = await fetch(`/api/teams/${teamId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete team');
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

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ matchdayId, data }: { matchdayId: string; data: TeamCreateInput }) => 
      createTeam(matchdayId, data),
    onMutate: async ({ matchdayId, data }) => {
      console.log('🔄 Creating team - onMutate called', { matchdayId, data });
      
      // Cancel any outgoing refetches to prevent conflicts
      await queryClient.cancelQueries({ queryKey: ['teams', 'matchday', matchdayId] });
      
      // Snapshot the previous value for rollback
      const previousTeams = queryClient.getQueryData(['teams', 'matchday', matchdayId]);
      
      // Optimistically update the cache
      queryClient.setQueryData(['teams', 'matchday', matchdayId], (oldData: any) => {
        if (!oldData) return oldData;
        
        console.log('🔄 Optimistically adding team to cache');
        
        // Get TEAM_COLORS for proper hex resolution
        const TEAM_COLORS_MAP: Record<string, { hex: string }> = {
          black: { hex: '#000000' },
          white: { hex: '#ffffff' },
          red: { hex: '#ef4444' },
          green: { hex: '#10b981' },
          orange: { hex: '#f97316' },
          yellow: { hex: '#eab308' },
          blue: { hex: '#3b82f6' },
        };
        
        // Create a temporary team object
        const tempTeam = {
          id: `temp-${Date.now()}`,
          matchdayId,
          name: data.name,
          colorToken: data.colorToken,
          colorHex: TEAM_COLORS_MAP[data.colorToken]?.hex || '#64748b',
          formationJson: null,
          assignments: [],
          playerCount: 0,
          createdAt: new Date().toISOString(),
        };
        
        return {
          ...oldData,
          data: [...(oldData.data || []), tempTeam],
        };
      });
      
      return { previousTeams };
    },
    onSuccess: (response, { matchdayId }) => {
      console.log('✅ Create team - onSuccess called', { response });
      // Invalidate to get the real data from server
      queryClient.invalidateQueries({ queryKey: ['teams', 'matchday', matchdayId] });
      toast.success(response.message || 'Team created successfully');
    },
    onError: (error: Error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousTeams) {
        queryClient.setQueryData(
          ['teams', 'matchday', variables.matchdayId], 
          context.previousTeams
        );
      }
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
    // Prevent concurrent mutations on the same resource
    mutationKey: ['assign-player'],
    onMutate: async ({ teamId, data }) => {
      console.log('🔄 Assigning player - onMutate called', { teamId, data });
      
      // Cancel any outgoing refetches to prevent conflicts
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
            // Check if player is already assigned to this team
            const existingAssignment = team.assignments?.find((a: any) => a.playerId === data.playerId);
            if (existingAssignment) {
              console.log('⚠️ Player already assigned to team, skipping optimistic update');
              return team;
            }
            
            // Create a mock assignment for optimistic update with real player data if available
            const mockAssignment = {
              id: `temp-${Date.now()}-${data.playerId}`, // Include playerId for uniqueness
              playerId: data.playerId,
              teamId: teamId,
              player: playerInfo || {
                id: data.playerId,
                name: 'Loading...',
                isActive: true,
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
    // Prevent concurrent mutations on the same resource
    mutationKey: ['unassign-player'],
    onMutate: async (assignmentId) => {
      console.log('🔄 Unassigning player - onMutate called', { assignmentId });
      
      // Cancel any outgoing refetches to prevent conflicts
      await queryClient.cancelQueries({ queryKey: ['teams'] });
      
      // Snapshot the previous value for rollback
      const previousTeams = queryClient.getQueriesData({ queryKey: ['teams'] });
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['teams'] }, (oldData: any) => {
        if (!oldData?.data) return oldData;
        
        console.log('🔄 Optimistically removing player assignment', { assignmentId });
        
        const updatedTeams = oldData.data.map((team: any) => {
          if (team.assignments && team.assignments.length > 0) {
            const originalLength = team.assignments.length;
            const filteredAssignments = team.assignments.filter((assignment: any) => {
              // Handle both real assignment IDs and temporary optimistic IDs
              return assignment.id !== assignmentId;
            });
            
            if (filteredAssignments.length !== originalLength) {
              // Assignment was removed from this team
              console.log('🔄 Optimistically removed assignment from team:', team.name);
              return {
                ...team,
                assignments: filteredAssignments,
                playerCount: Math.max(0, filteredAssignments.length), // Use actual count for accuracy
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

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTeam,
    onMutate: async (teamId) => {
      console.log('🔄 Deleting team - onMutate called', { teamId });
      
      // Cancel any outgoing refetches to prevent conflicts
      await queryClient.cancelQueries({ queryKey: ['teams'] });
      
      // Snapshot the previous value for rollback
      const previousTeams = queryClient.getQueriesData({ queryKey: ['teams'] });
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['teams'] }, (oldData: any) => {
        if (!oldData?.data) return oldData;
        
        console.log('🔄 Optimistically removing team from cache');
        
        return {
          ...oldData,
          data: oldData.data.filter((team: any) => team.id !== teamId),
        };
      });
      
      return { previousTeams };
    },
    onSuccess: (data) => {
      console.log('✅ Delete team - onSuccess called', { data });
      toast.success(data.message || 'Team deleted successfully');
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
      // Only refetch on error to ensure consistency
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
