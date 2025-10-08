'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Check, RefreshCw, MoreVertical, ShieldCheck, User } from 'lucide-react';
import { useGroupContext } from '@/lib/hooks/use-group-context';
import { useGroups } from '@/lib/hooks/use-groups';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Group, GroupMember } from '@/lib/db/schema';
import { useConfirm } from '@/lib/hooks/use-dialogs';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GroupSettingsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { activeGroup, setActiveGroup } = useGroupContext();
  const { updateGroup, regenerateInviteCode, fetchGroupMembers, updateMemberRole, removeMember } = useGroups();
  const confirm = useConfirm();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Array<{
    id: string;
    userId: string;
    role: string;
    email: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    createdAt: Date;
  }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // First, get current user
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;
        setCurrentUserId(userId);
        
        // Then load group and members data
        await loadData(userId);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load group data');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [id]);

  const loadData = async (userId: string | null = currentUserId) => {
    try {
      // Fetch group details
      const groupRes = await fetch(`/api/groups/${id}`);
      if (!groupRes.ok) throw new Error('Failed to fetch group');
      const groupData = await groupRes.json();
      setGroup(groupData);
      setEditName(groupData.name);
      setEditDescription(groupData.description || '');
      
      // Fetch members
      const membersData = await fetchGroupMembers(id) as any[];
      
      // Sort members: current user first, then by name
      const sortedMembers = [...membersData].sort((a: any, b: any) => {
        if (a.userId === userId) return -1;
        if (b.userId === userId) return 1;
        return (a.fullName || a.email).localeCompare(b.fullName || b.email);
      });
      
      setMembers(sortedMembers);
    } catch (error: any) {
      throw error;
    }
  };

  const handleCopyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      toast.success('Invite code copied to clipboard!');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!group) return;
    
    try {
      const newCode = await regenerateInviteCode(group.id);
      setGroup({ ...group, inviteCode: newCode });
      toast.success('New invite code generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate code');
    }
  };

  const handleSaveDetails = async () => {
    if (!group) return;
    
    try {
      const updated = await updateGroup(group.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setGroup(updated);
      setIsEditing(false);
      
      // Update active group if this is the current one
      if (activeGroup?.id === group.id) {
        setActiveGroup(updated);
      }
      
      toast.success('Group details updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update group');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    if (!group) return;
    
    try {
      await updateMemberRole(group.id, userId, newRole);
      await loadData(currentUserId); // Reload members
      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!group) return;
    
    try {
      const confirmed = await confirm({
        title: 'Remove Member',
        message: `Remove ${userName} from ${group.name}?`,
        confirmText: 'Remove',
        cancelText: 'Cancel',
        variant: 'default',
      });

      if (!confirmed) {
        return;
      }
      
      await removeMember(group.id, userId);
      await loadData(currentUserId); // Reload members
      toast.success(`${userName} removed from group`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member');
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Group Settings</h1>
        </div>
      </div>

      {/* Group Details */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Group Details</h2>
        
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Group Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-md resize-none"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleSaveDetails}>Save Changes</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <p className="font-medium">{group.name}</p>
            </div>
            {group.description && (
              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <p>{group.description}</p>
              </div>
            )}
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Details</Button>
          </div>
        )}
      </div>

      {/* Invite Code */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Invite Code</h2>
        <p className="text-sm text-muted-foreground">
          Share this code with others to let them join your group
        </p>
        
        <div className="flex items-center space-x-2">
          <div className={`flex-1 px-4 py-3 rounded-md font-mono text-xl tracking-wider transition-colors duration-300 ${
            isCopied ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-muted'
          }`}>
            {group.inviteCode}
          </div>
          <Button
            variant={isCopied ? "default" : "outline"}
            size="icon"
            onClick={handleCopyInviteCode}
            title={isCopied ? "Copied!" : "Copy code"}
            className={isCopied ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRegenerateCode}
            title="Generate new code"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Members */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Members ({members.length})</h2>
        
        <div className="space-y-2">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId;
            const isMenuOpen = openMenuId === member.userId;
            
            return (
              <div
                key={member.userId}
                className="flex items-center justify-between p-3 rounded-md border"
              >
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.fullName || member.email}
                        {isCurrentUser && <span className="text-muted-foreground ml-2">(You)</span>}
                      </p>
                      {member.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                
                {!isCurrentUser && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpenMenuId(isMenuOpen ? null : member.userId)}
                      title="Member actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    
                    {isMenuOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenMenuId(null)}
                        />
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-md shadow-lg z-50 py-1">
                          <button
                            onClick={() => {
                              handleRoleChange(
                                member.userId, 
                                member.role === 'admin' ? 'member' : 'admin'
                              );
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleRemoveMember(member.userId, member.fullName || member.email);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                          >
                            <User className="h-4 w-4" />
                            Remove from group
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
