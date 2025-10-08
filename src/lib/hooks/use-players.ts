"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGroupContext } from './use-group-context';
import type { PlayerCreate, PlayerUpdate, PlayerQuery } from '@/lib/validations/player';

// Types for API responses
interface Player {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface PlayersResponse {
  data: Player[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface PlayerResponse {
  data: Player;
  message?: string;
}

// API functions
async function fetchPlayers(params: PlayerQuery): Promise<PlayersResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const response = await fetch(`/api/players?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch players');
  }
  
  return response.json();
}

async function fetchPlayer(id: string): Promise<PlayerResponse> {
  const response = await fetch(`/api/players/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch player');
  }
  
  return response.json();
}

async function createPlayer(data: PlayerCreate): Promise<PlayerResponse> {
  const response = await fetch('/api/players', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create player');
  }
  
  return response.json();
}

async function updatePlayer(id: string, data: PlayerUpdate): Promise<PlayerResponse> {
  const response = await fetch(`/api/players/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update player');
  }
  
  return response.json();
}

async function deletePlayer(id: string): Promise<PlayerResponse> {
  const response = await fetch(`/api/players/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete player');
  }
  
  return response.json();
}

async function restorePlayer(id: string): Promise<PlayerResponse> {
  const response = await fetch(`/api/players/${id}/restore`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to restore player');
  }
  
  return response.json();
}

// React Query hooks
export function usePlayers(params: PlayerQuery = { page: 1, limit: 20, isActive: true }) {
  const { activeGroup } = useGroupContext();
  
  // Add groupId to params if active group exists
  const queryParams = activeGroup 
    ? { ...params, groupId: activeGroup.id }
    : params;
  
  return useQuery({
    queryKey: ['players', queryParams],
    queryFn: () => fetchPlayers(queryParams),
    enabled: !!activeGroup, // Only fetch when there's an active group
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => fetchPlayer(id),
    enabled: !!id,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  const { activeGroup } = useGroupContext();
  
  return useMutation({
    mutationFn: (data: PlayerCreate) => {
      // Inject groupId into the player data
      const dataWithGroup = activeGroup 
        ? { ...data, groupId: activeGroup.id }
        : data;
      return createPlayer(dataWithGroup);
    },
    onSuccess: (data) => {
      // Invalidate and refetch players list
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success(data.message || 'Player created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlayerUpdate }) => 
      updatePlayer(id, data),
    onSuccess: (data, variables) => {
      // Update the specific player in cache
      queryClient.setQueryData(['player', variables.id], data);
      // Invalidate players list to refresh
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success(data.message || 'Player updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePlayer,
    onSuccess: (data) => {
      // Invalidate players list to refresh
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success(data.message || 'Player deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRestorePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: restorePlayer,
    onSuccess: (data) => {
      // Invalidate players list to refresh
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success(data.message || 'Player restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
