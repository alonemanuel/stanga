'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, RefreshCw, Trash2, Crown, User } from 'lucide-react';
import { useGroupContext } from '@/lib/hooks/use-group-context';
import { useGroups } from '@/lib/hooks/use-groups';
import { toast } from 'sonner';
import type { Group, GroupMember } from '@/lib/db/schema';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GroupSettingsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { activeGroup, setActiveGroup } = useGroupContext();
  const { updateGroup, regenerateInviteCode, fetchGroupMembers, updateMemberRole, removeMember } = useGroups();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch group details
      const groupRes = await fetch(`/api/groups/${id}`);
      if (!groupRes.ok) throw new Error('Failed to fetch group');
      const groupData = await groupRes.json();
      setGroup(groupData);
      setEditName(groupData.name);
      setEditDescription(groupData.description || '');
      
      // Fetch members
      const membersData = await fetchGroupMembers(id);
      setMembers(membersData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load group data');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      toast.success('Invite code copied to clipboard!');
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
      await loadData(); // Reload members
      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!group) return;
    
    if (!confirm(`Remove ${userName} from ${group.name}?`)) {
      return;
    }
    
    try {
      await removeMember(group.id, userId);
      await loadData(); // Reload members
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
          <div className="flex-1 px-4 py-3 bg-muted rounded-md font-mono text-xl tracking-wider">
            {group.inviteCode}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyInviteCode}
            title="Copy code"
          >
            <Copy className="h-4 w-4" />
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
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-3 rounded-md border"
            >
              <div className="flex items-center space-x-3">
                {member.role === 'admin' ? (
                  <Crown className="h-5 w-5 text-yellow-500" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">{member.fullName || member.email}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {member.role === 'admin' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoleChange(member.userId, 'member')}
                  >
                    Demote to Member
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoleChange(member.userId, 'admin')}
                  >
                    Promote to Admin
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMember(member.userId, member.fullName || member.email)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
