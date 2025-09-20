"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MatchdayCreate, MatchdayUpdate, MatchdayQuery } from '@/lib/validations/matchday';

// Types for API responses
interface Matchday {
  id: string;
  name: string;
  description?: string | null;
  scheduledAt: string;
  location?: string | null;
  maxPlayers: number;
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
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const response = await fetch(`/api/matchdays?${searchParams.toString()}`, {
    cache: 'force-cache',
    next: { tags: ['matchdays'] },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch matchdays');
  }
  
  return response.json();
}

async function fetchMatchday(id: string): Promise<MatchdayResponse> {
  const response = await fetch(`/api/matchdays/${id}`, {
    cache: 'force-cache',
    next: { tags: ['matchdays', `matchday-${id}`] },
  });
  
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
  return useQuery({
    queryKey: ['matchdays', params],
    queryFn: () => fetchMatchdays(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
  
  return useMutation({
    mutationFn: createMatchday,
    onSuccess: (data) => {
      // Invalidate and refetch matchdays list
      queryClient.invalidateQueries({ queryKey: ['matchdays'] });
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
  
  return useMutation({
    mutationFn: deleteMatchday,
    onSuccess: (data) => {
      // Invalidate matchdays list to refresh
      queryClient.invalidateQueries({ queryKey: ['matchdays'] });
      toast.success(data.message || 'Matchday deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
