"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGroupContext } from './use-group-context';
import type { MatchdayCreate, MatchdayUpdate, MatchdayQuery } from '@/lib/validations/matchday';

// Types for API responses
interface Matchday {
  id: string;
  name: string;
  description?: string | null;
  scheduledAt: string;
  location?: string | null;
  teamSize: number;
  numberOfTeams: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  rules: any; // RulesSnapshot type
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface MatchdaysResponse {
  data: Matchday[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface MatchdayResponse {
  data: Matchday;
  message?: string;
}

// API functions
async function fetchMatchdays(params: MatchdayQuery): Promise<MatchdaysResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const response = await fetch(`/api/matchdays?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch matchdays');
  }
  
  return response.json();
}

async function fetchMatchday(id: string): Promise<MatchdayResponse> {
  const response = await fetch(`/api/matchdays/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch matchday');
  }
  
  return response.json();
}

async function createMatchday(data: MatchdayCreate): Promise<MatchdayResponse> {
  const response = await fetch('/api/matchdays', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create matchday');
  }
  
  return response.json();
}

async function updateMatchday(id: string, data: MatchdayUpdate): Promise<MatchdayResponse> {
  const response = await fetch(`/api/matchdays/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update matchday');
  }
  
  return response.json();
}

async function deleteMatchday(id: string): Promise<MatchdayResponse> {
  const response = await fetch(`/api/matchdays/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete matchday');
  }
  
  return response.json();
}

// React Query hooks
export function useMatchdays(params: MatchdayQuery = { page: 1, limit: 20, isPublic: true }) {
  const { activeGroup } = useGroupContext();
  
  // Add groupId to params if active group exists
  const queryParams = activeGroup 
    ? { ...params, groupId: activeGroup.id }
    : params;
  
  return useQuery({
    queryKey: ['matchdays', queryParams],
    queryFn: () => fetchMatchdays(queryParams),
    enabled: !!activeGroup, // Only fetch when there's an active group
    staleTime: 60_000, // 1 minute for matchday list (optimized for performance)
  });
}

export function useMatchday(id: string) {
  return useQuery({
    queryKey: ['matchday', id],
    queryFn: () => fetchMatchday(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateMatchday() {
  const queryClient = useQueryClient();
  const { activeGroup } = useGroupContext();
  
  return useMutation({
    mutationFn: (data: MatchdayCreate) => {
      // Inject groupId into the matchday data
      const dataWithGroup = activeGroup 
        ? { ...data, groupId: activeGroup.id }
        : data;
      return createMatchday(dataWithGroup);
    },
    onSuccess: (data) => {
      // Only invalidate matchdays for the specific group
      const groupId = activeGroup?.id;
      if (groupId) {
        queryClient.invalidateQueries({ 
          queryKey: ['matchdays', { groupId }],
        });
      }
      toast.success(data.message || 'Matchday created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMatchday() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MatchdayUpdate }) => 
      updateMatchday(id, data),
    onSuccess: (data, variables) => {
      // Update the specific matchday in cache
      queryClient.setQueryData(['matchday', variables.id], data);
      // Invalidate matchdays list to refresh
      queryClient.invalidateQueries({ queryKey: ['matchdays'] });
      toast.success(data.message || 'Matchday updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMatchday() {
  const queryClient = useQueryClient();
  const { activeGroup } = useGroupContext();
  
  return useMutation({
    mutationFn: deleteMatchday,
    onSuccess: (data, deletedId) => {
      // Remove specific matchday
      queryClient.removeQueries({ 
        queryKey: ['matchday', deletedId],
        exact: true 
      });
      
      // Only invalidate matchdays list for current group
      const groupId = activeGroup?.id;
      if (groupId) {
        queryClient.invalidateQueries({ 
          queryKey: ['matchdays', { groupId }],
        });
      }
      
      toast.success(data.message || 'Matchday deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
