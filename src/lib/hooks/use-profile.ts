"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ProfileSettings } from '@/lib/validations/user';

interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  gender: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileResponse {
  data: Profile;
  message?: string;
}

async function fetchProfile(): Promise<ProfileResponse> {
  const response = await fetch('/api/profile');

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load profile');
  }

  return response.json() as Promise<ProfileResponse>;
}

async function updateProfile(data: ProfileSettings): Promise<ProfileResponse> {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update profile');
  }

  return response.json() as Promise<ProfileResponse>;
}

export function useProfile(options?: { enabled?: boolean }) {
  return useQuery<ProfileResponse, Error>({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<ProfileResponse, Error, ProfileSettings>({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      toast.success(data.message || 'Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
