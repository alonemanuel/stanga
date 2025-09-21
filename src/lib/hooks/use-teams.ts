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
  const response = await fetch(`/api/matchdays/${matchdayId}/teams`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch teams');
  }
  
  return response.json();
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
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid unnecessary requests
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
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['teams'] });
      
      // Snapshot the previous value for rollback
      const previousTeams = queryClient.getQueriesData({ queryKey: ['teams'] });
      
      return { previousTeams };
    },
    onSuccess: (data, variables) => {
      // Invalidate teams queries to refresh with server data
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      // Also invalidate players queries in case they're affected
      queryClient.invalidateQueries({ queryKey: ['players'] });
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
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUnassignPlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: unassignPlayer,
    onMutate: async (assignmentId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['teams'] });
      
      // Snapshot the previous value for rollback
      const previousTeams = queryClient.getQueriesData({ queryKey: ['teams'] });
      
      return { previousTeams };
    },
    onSuccess: (data) => {
      // Invalidate teams queries to refresh with server data
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      // Also invalidate players queries in case they're affected
      queryClient.invalidateQueries({ queryKey: ['players'] });
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
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
