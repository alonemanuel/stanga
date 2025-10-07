'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroupContext } from '@/lib/hooks/use-group-context';
import { useGroups } from '@/lib/hooks/use-groups';
import { Group } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, LogIn } from 'lucide-react';
import { JoinGroupModal } from './JoinGroupModal';
import { CreateGroupModal } from './CreateGroupModal';

export function GroupSwitcher() {
  const { activeGroup, setActiveGroup, isLoading: contextLoading } = useGroupContext();
  const { fetchUserGroups } = useGroups();
  const [userGroups, setUserGroups] = useState<(Group & { role: string })[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const hasLoadedRef = React.useRef(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const activeMembership = userGroups.find((group) => group.id === activeGroup?.id);

  const loadGroups = async () => {
    try {
      const groups = await fetchUserGroups();
      setUserGroups(groups as any);
      
      // Only set first group as active on initial load if no group is saved
      if (!activeGroup && groups.length > 0 && !hasLoadedRef.current) {
        setActiveGroup(groups[0]);
      }
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  // Load groups only after context has finished loading (cookie check complete)
  useEffect(() => {
    if (!contextLoading) {
      loadGroups();
    }
  }, [contextLoading]);

  const handleGroupCreated = async () => {
    await loadGroups();
    setShowCreateModal(false);
  };

  const handleGroupJoined = async () => {
    await loadGroups();
    setShowJoinModal(false);
  };

  const handleGroupSelect = (group: Group) => {
    setActiveGroup(group);
    setIsOpen(false);
  };

  if (contextLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Button
          ref={triggerRef}
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 font-semibold text-lg"
          aria-label="Select group"
          aria-expanded={isOpen}
        >
          <span>{activeGroup?.name || 'Select Group'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute left-0 top-full mt-2 w-64 bg-background border rounded-lg shadow-lg z-50 py-2">
              {/* User's Groups */}
              <div className="px-2">
                <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Your Groups</p>
                {userGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-2">No groups yet</p>
                ) : (
                  userGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupSelect(group)}
                      className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors ${
                        activeGroup?.id === group.id ? 'bg-muted font-medium' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{group.name}</span>
                        {group.role === 'admin' && (
                          <span className="text-xs text-muted-foreground">Admin</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Divider */}
              <div className="border-t my-2" />

              {/* Actions */}
              <div className="px-2 space-y-1">
                {activeMembership?.role === 'admin' && activeGroup && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      triggerRef.current?.focus();
                      setTimeout(() => {
                        router.push(`/groups/${activeGroup.id}/settings`);
                      }, 0);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    <span>Group Settings</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowJoinModal(true);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Join Group</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Group</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={handleGroupJoined}
      />
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleGroupCreated}
      />
    </>
  );
}
