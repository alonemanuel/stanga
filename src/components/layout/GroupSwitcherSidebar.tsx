"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGroupContext } from "@/lib/hooks/use-group-context";
import { useGroups } from "@/lib/hooks/use-groups";
import { Group } from "@/lib/db/schema";
import { ChevronsUpDown, Plus, LogIn, Settings, Users } from "lucide-react";
import { JoinGroupModal } from "@/components/groups/JoinGroupModal";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function GroupSwitcherSidebar() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { activeGroup, setActiveGroup, isLoading: contextLoading } = useGroupContext();
  const { fetchUserGroups } = useGroups();
  const [userGroups, setUserGroups] = useState<(Group & { role: string })[]>([]);
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
      console.error("Failed to load groups:", error);
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
  };

  if (contextLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Users className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Get current user's role in active group
  const currentUserRole = userGroups.find((g) => g.id === activeGroup?.id)?.role;
  const memberCount = userGroups.length;

  if (!activeGroup) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => setShowJoinModal(true)}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Users className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Select Group</span>
                <span className="truncate text-xs text-muted-foreground">
                  Join or create
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

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

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Users className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{activeGroup.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {memberCount} {memberCount === 1 ? "group" : "groups"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Current Group
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2 p-2" disabled>
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Users className="size-4" />
                </div>
                <div className="font-medium">{activeGroup.name}</div>
              </DropdownMenuItem>

              {currentUserRole === "admin" && (
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => router.push(`/groups/${activeGroup.id}/settings`)}
                >
                  <Settings className="size-4" />
                  <span>Group Settings</span>
                </DropdownMenuItem>
              )}

              {userGroups.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Switch Groups
                  </DropdownMenuLabel>
                  {userGroups
                    .filter((group) => group.id !== activeGroup.id)
                    .map((group) => (
                      <DropdownMenuItem
                        key={group.id}
                        className="gap-2 p-2"
                        onClick={() => handleGroupSelect(group)}
                      >
                        <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                          <Users className="size-4" />
                        </div>
                        {group.name}
                        {group.role === "admin" && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            Admin
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setShowJoinModal(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <LogIn className="size-4" />
                </div>
                <span>Join Group</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <span>Create Group</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

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

