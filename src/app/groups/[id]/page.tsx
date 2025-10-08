'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Trophy, Settings, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useGroupContext } from '@/lib/hooks/use-group-context';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Group } from '@/lib/db/schema';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface GroupStats {
  totalMembers: number;
  totalMatchdays: number;
  totalGames: number;
  totalGoals: number;
}

export default function GroupOverviewPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { activeGroup } = useGroupContext();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const loadGroupData = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Fetch group details
        const groupRes = await fetch(`/api/groups/${id}`);
        if (!groupRes.ok) throw new Error('Failed to fetch group');
        const groupData = await groupRes.json();
        setGroup(groupData);

        // Fetch user's role in this group
        if (userId) {
          const roleRes = await fetch(`/api/groups/${id}/members/${userId}`);
          if (roleRes.ok) {
            const roleData = await roleRes.json();
            setCurrentUserRole(roleData.role);
          }
        }

        // Fetch group statistics
        const statsRes = await fetch(`/api/stats/overall?groupId=${id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          
          // Calculate stats from the response
          const totalMembers = statsData.teams?.length || 0;
          const totalMatchdays = statsData.matchdays?.length || 0;
          const totalGames = statsData.games?.length || 0;
          const totalGoals = statsData.goals?.length || 0;

          setStats({
            totalMembers,
            totalMatchdays,
            totalGames,
            totalGoals
          });
        }
      } catch (error: any) {
        console.error('Failed to load group data:', error);
        toast.error(error.message || 'Failed to load group data');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroupData();
  }, [id]);

  const handleCopyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      toast.success('Invite code copied to clipboard!');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>
        
        {currentUserRole === 'admin' && (
          <Button
            onClick={() => router.push(`/groups/${id}/settings`)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <div className="text-xl font-bold">{stats?.totalMembers || 0}</div>
          <div className="text-xs text-muted-foreground">Members</div>
        </div>
        
        <div className="border rounded-lg p-3 text-center">
          <Calendar className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <div className="text-xl font-bold">{stats?.totalMatchdays || 0}</div>
          <div className="text-xs text-muted-foreground">Matchdays</div>
        </div>
        
        <div className="border rounded-lg p-3 text-center">
          <Trophy className="h-5 w-5 mx-auto mb-1 text-purple-500" />
          <div className="text-xl font-bold">{stats?.totalGames || 0}</div>
          <div className="text-xs text-muted-foreground">Games</div>
        </div>
        
        <div className="border rounded-lg p-3 text-center">
          <div className="text-lg mx-auto mb-1 text-orange-500">⚽</div>
          <div className="text-xl font-bold">{stats?.totalGoals || 0}</div>
          <div className="text-xs text-muted-foreground">Goals</div>
        </div>
      </div>

      {/* Group Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Rules */}
        <div className="border rounded-lg p-6 space-y-4">
          <button
            onClick={() => setIsRulesExpanded(!isRulesExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-xl font-semibold">Group Rules</h2>
            {isRulesExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          
          {isRulesExpanded && (
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-primary">1.</span>
                <span>All players must be assigned to teams before each matchday</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-primary">2.</span>
                <span>Games are played with the assigned teams for that matchday</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-primary">3.</span>
                <span>Goals and penalties are tracked for each game</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-primary">4.</span>
                <span>Statistics are calculated based on all completed games</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-primary">5.</span>
                <span>Only group admins can manage group settings and members</span>
              </div>
            </div>
          )}
        </div>

        {/* Invite Section */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Invite Others</h2>
          <p className="text-sm text-muted-foreground">
            Share this invite code with others to let them join your group
          </p>
          
          <div className="flex items-center space-x-2">
            <div className={`flex-1 px-4 py-3 rounded-md font-mono text-lg tracking-wider transition-colors duration-300 ${
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
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button
            onClick={() => router.push('/players')}
            variant="outline"
            className="justify-start gap-2"
          >
            <Users className="h-4 w-4" />
            Manage Players
          </Button>
          
          <Button
            onClick={() => router.push('/stats')}
            variant="outline"
            className="justify-start gap-2"
          >
            <Trophy className="h-4 w-4" />
            View Statistics
          </Button>
          
          <Button
            onClick={() => router.push('/matchdays')}
            variant="outline"
            className="justify-start gap-2"
          >
            <Calendar className="h-4 w-4" />
            View Matchdays
          </Button>
        </div>
      </div>
    </div>
  );
}
