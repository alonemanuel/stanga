'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useGroupContext } from '@/lib/hooks/use-group-context';
import { useGroups } from '@/lib/hooks/use-groups';
import { Group } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, LogIn, Settings, ArrowUpDown, Home, Users, BarChart3, Calendar } from 'lucide-react';
import { JoinGroupModal } from './JoinGroupModal';
import { CreateGroupModal } from './CreateGroupModal';

export function GroupSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeGroup, setActiveGroup, isLoading: contextLoading } = useGroupContext();
  const { fetchUserGroups } = useGroups();
  const [userGroups, setUserGroups] = useState<(Group & { role: string })[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const hasLoadedRef = React.useRef(false);

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

  // Get current user's role in active group
  const currentUserRole = userGroups.find(g => g.id === activeGroup?.id)?.role;

  return (
    <>
      <div className="relative">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2 font-semibold text-lg"
            aria-label="Group menu"
            aria-expanded={isOpen}
          >
            <span>{activeGroup?.name || 'Select Group'}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {activeGroup && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              title="Switch Group"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span className="hidden sm:inline">Switch</span>
            </Button>
          )}
        </div>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute left-0 top-full mt-2 w-72 bg-background border rounded-lg shadow-lg z-50 py-2">
              {/* Current Group Header */}
              {activeGroup && (
                <>
                  <div className="px-4 py-2 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activeGroup.name}</p>
                        <p className="text-xs text-muted-foreground">Current Group</p>
                      </div>
                      {currentUserRole === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsOpen(false);
                            router.push(`/groups/${activeGroup.id}/settings`);
                          }}
                          className="gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          Settings
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Switch Groups */}
              <div className="px-2 py-2">
                <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Switch Groups</p>
                {userGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-2">No groups yet</p>
                ) : (
                  userGroups
                    .filter(group => group.id !== activeGroup?.id)
                    .map((group) => (
                      <button
                        key={group.id}
                        onClick={() => handleGroupSelect(group)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
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

              {/* Group Actions */}
              <div className="border-t my-2" />
              <div className="px-2 space-y-1">
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

              {/* Navigation */}
              {activeGroup && (
                <>
                  <div className="border-t my-2" />
                  <div className="px-2 space-y-1">
                    <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Navigation</p>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`/groups/${activeGroup.id}`);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm ${
                        pathname === `/groups/${activeGroup.id}` ? 'bg-muted font-medium' : ''
                      }`}
                    >
                      <Home className="h-4 w-4" />
                      <span>Overview</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/matchdays');
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm ${
                        pathname === '/matchdays' || pathname === '/' ? 'bg-muted font-medium' : ''
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Matchdays</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/players');
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm ${
                        pathname === '/players' ? 'bg-muted font-medium' : ''
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Players</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/stats');
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm ${
                        pathname === '/stats' ? 'bg-muted font-medium' : ''
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Stats</span>
                    </button>
                  </div>
                </>
              )}
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
