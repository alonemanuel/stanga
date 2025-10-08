'use client';

import { useState, useCallback } from 'react';
import { Group, GroupMember } from '@/lib/db/schema';

export function useGroups() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserGroups = useCallback(async (): Promise<Group[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      const data = await response.json();
      return data.groups || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch groups';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGroup = useCallback(async (data: {
    name: string;
    description?: string;
  }): Promise<Group> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create group');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create group';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinGroup = useCallback(async (inviteCode: string): Promise<Group> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join group');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join group';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateGroup = useCallback(async (
    groupId: string,
    data: Partial<Pick<Group, 'name' | 'description' | 'avatarUrl'>>
  ): Promise<Group> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update group');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update group';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const regenerateInviteCode = useCallback(async (groupId: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/regenerate-code`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate invite code');
      }
      
      const data = await response.json();
      return data.inviteCode;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate invite code';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGroupMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch group members');
      }
      const data = await response.json();
      return data.members || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch members';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateMemberRole = useCallback(async (
    groupId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update member role');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update member role';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeMember = useCallback(async (groupId: string, userId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    fetchUserGroups,
    createGroup,
    joinGroup,
    updateGroup,
    regenerateInviteCode,
    fetchGroupMembers,
    updateMemberRole,
    removeMember,
  };
}
