'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Group } from '@/lib/db/schema';
import Cookies from 'js-cookie';

interface GroupContextType {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  isLoading: boolean;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

const ACTIVE_GROUP_COOKIE = 'stanga_active_group';

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load active group from cookie on mount
  useEffect(() => {
    const savedGroupJson = Cookies.get(ACTIVE_GROUP_COOKIE);
    if (savedGroupJson) {
      try {
        const savedGroup = JSON.parse(savedGroupJson);
        setActiveGroupState(savedGroup);
      } catch (error) {
        console.error('Failed to parse saved group:', error);
        Cookies.remove(ACTIVE_GROUP_COOKIE);
      }
    }
    setIsLoading(false);
  }, []);

  // Sync active group across tabs using storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_GROUP_COOKIE && e.newValue) {
        try {
          const newGroup = JSON.parse(e.newValue);
          setActiveGroupState(newGroup);
        } catch (error) {
          console.error('Failed to sync group from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setActiveGroup = useCallback((group: Group | null) => {
    setActiveGroupState(group);
    if (group) {
      // Save to cookie (30 days expiry)
      Cookies.set(ACTIVE_GROUP_COOKIE, JSON.stringify(group), { expires: 30 });
      // Also save to localStorage for cross-tab sync
      localStorage.setItem(ACTIVE_GROUP_COOKIE, JSON.stringify(group));
    } else {
      Cookies.remove(ACTIVE_GROUP_COOKIE);
      localStorage.removeItem(ACTIVE_GROUP_COOKIE);
    }
  }, []);

  return (
    <GroupContext.Provider value={{ activeGroup, setActiveGroup, isLoading }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroupContext must be used within a GroupProvider');
  }
  return context;
}
