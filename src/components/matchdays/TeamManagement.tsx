"use client";

import * as React from "react";
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent, 
  PointerSensor, 
  useSensor, 
  useSensors,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatchdayTeams, useInitializeTeams, useAssignPlayer, useUnassignPlayer } from "@/lib/hooks/use-teams";
import { usePlayers } from "@/lib/hooks/use-players";
import { TEAM_COLORS, type ColorToken } from "@/lib/teams";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface TeamManagementProps {
  matchdayId: string;
  maxPlayersPerTeam: number;
}

interface DragData {
  type: 'player';
  playerId: string;
  fromTeamId?: string;
  assignmentId?: string;
}

export function TeamManagement({ matchdayId, maxPlayersPerTeam }: TeamManagementProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const supabase = createClient();
  
  // Get current user
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // API hooks
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useMatchdayTeams(matchdayId);
  const { data: playersData, isLoading: playersLoading } = usePlayers({ 
    page: 1, 
    limit: 100, 
    isActive: true 
  });
  
  const initializeTeamsMutation = useInitializeTeams();
  const assignPlayerMutation = useAssignPlayer();
  const unassignPlayerMutation = useUnassignPlayer();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const teams = teamsData?.data || [];
  const players = playersData?.data || [];
  
  // Debug logging
  React.useEffect(() => {
    console.log('🔄 TeamManagement re-rendered with teams:', teams.length, 'teams');
    console.log('📊 Teams data:', teams);
  }, [teams]);
  
  // Get unassigned players
  const assignedPlayerIds = new Set(
    teams.flatMap(team => (team.assignments || []).map(assignment => assignment.playerId))
  );
  const unassignedPlayers = players.filter(player => !assignedPlayerIds.has(player.id));

  const handleInitializeTeams = async () => {
    if (!user) return;
    await initializeTeamsMutation.mutateAsync(matchdayId);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !user) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as { type: string; teamId?: string };

    if (dragData.type !== 'player') return;

    try {
      // If dropping to unassigned area
      if (dropData.type === 'unassigned') {
        if (dragData.assignmentId) {
          await unassignPlayerMutation.mutateAsync(dragData.assignmentId);
        }
        return;
      }

      // If dropping to a team
      if (dropData.type === 'team' && dropData.teamId) {
        // If moving from one team to another, first unassign
        if (dragData.fromTeamId && dragData.assignmentId && dragData.fromTeamId !== dropData.teamId) {
          await unassignPlayerMutation.mutateAsync(dragData.assignmentId);
        }

        // If not already on the target team, assign to new team
        if (dragData.fromTeamId !== dropData.teamId) {
          await assignPlayerMutation.mutateAsync({
            teamId: dropData.teamId,
            data: {
              playerId: dragData.playerId,
            },
          });
        }
      }
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Drag and drop error:', error);
    }
  };

  const handleUnassignPlayer = async (assignmentId: string) => {
    if (!user) return;
    
    // Prevent rapid clicking
    if (unassignPlayerMutation.isPending) {
      console.log('⏳ Unassign already in progress, ignoring click');
      return;
    }
    
    console.log('🚀 handleUnassignPlayer called with:', assignmentId);
    try {
      await unassignPlayerMutation.mutateAsync(assignmentId);
      console.log('✅ handleUnassignPlayer completed');
    } catch (error) {
      console.error('❌ handleUnassignPlayer failed:', error);
    }
  };

  const handleAssignPlayer = async (teamId: string, playerId: string) => {
    if (!user) return;
    
    // Prevent rapid clicking
    if (assignPlayerMutation.isPending) {
      console.log('⏳ Assign already in progress, ignoring click');
      return;
    }
    
    console.log('🚀 handleAssignPlayer called with:', { teamId, playerId });
    try {
      await assignPlayerMutation.mutateAsync({
        teamId,
        data: { playerId },
      });
      console.log('✅ handleAssignPlayer completed');
    } catch (error) {
      console.error('❌ handleAssignPlayer failed:', error);
    }
  };

  if (teamsLoading || playersLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-muted-foreground">Loading teams...</p>
      </div>
    );
  }

  if (teamsError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load teams</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // If no teams exist, show initialize button
  if (teams.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">No Teams Created</h3>
        <p className="text-muted-foreground mb-4">
          Initialize 3 teams to start assigning players
        </p>
        {user && (
          <Button 
            onClick={handleInitializeTeams}
            disabled={initializeTeamsMutation.isPending}
          >
            {initializeTeamsMutation.isPending ? 'Creating Teams...' : 'Initialize Teams'}
          </Button>
        )}
        {!user && (
          <p className="text-sm text-muted-foreground">Sign in to manage teams</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Management</h3>
          <p className="text-sm text-muted-foreground">
            Assign players to teams (max {maxPlayersPerTeam} per team)
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {unassignedPlayers.length} unassigned players
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-6">
          {/* Teams Grid */}
          <div className="flex-1">
            <div className="grid gap-6 lg:grid-cols-3">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  maxPlayers={maxPlayersPerTeam}
                  canEdit={!!user}
                  onUnassignPlayer={handleUnassignPlayer}
                  onAssignPlayer={handleAssignPlayer}
                  unassignedPlayers={unassignedPlayers}
                />
              ))}
            </div>
          </div>

          {/* Sticky Available Players */}
          <div className="w-80 sticky top-6 self-start">
            <UnassignedPlayersCard
              players={unassignedPlayers}
              canEdit={!!user}
            />
          </div>
        </div>
      </DndContext>
    </div>
  );
}

// Team Card Component
interface TeamCardProps {
  team: {
    id: string;
    name: string;
    colorToken: ColorToken;
    colorHex: string;
    assignments: Array<{
      id: string;
      playerId: string;
      player: {
        id: string;
        name: string;
      };
    }>;
    playerCount: number;
  };
  maxPlayers: number;
  canEdit: boolean;
  onUnassignPlayer: (assignmentId: string) => void;
  onAssignPlayer: (teamId: string, playerId: string) => void;
  unassignedPlayers: Array<{
    id: string;
    name: string;
  }>;
}

function TeamCard({ team, maxPlayers, canEdit, onUnassignPlayer, onAssignPlayer, unassignedPlayers }: TeamCardProps) {
  const colorInfo = TEAM_COLORS[team.colorToken];
  const isTeamFull = team.playerCount >= maxPlayers;
  
  const { setNodeRef, isOver } = useDroppable({
    id: `team-${team.id}`,
    data: {
      type: 'team',
      teamId: team.id,
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-card border rounded-lg p-4 transition-colors ${
        isOver && !isTeamFull ? 'border-primary bg-primary/5' : ''
      }`}
    >
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.colorHex }}
          />
          <h4 className="font-semibold">{team.name}</h4>
        </div>
        <Badge variant={isTeamFull ? "destructive" : "secondary"}>
          {team.playerCount}/{maxPlayers}
        </Badge>
      </div>

      {/* Assigned Players */}
      <div className="space-y-2 mb-4">
        {(team.assignments || []).map((assignment) => (
          <PlayerChip
            key={assignment.id}
            player={assignment.player}
            assignmentId={assignment.id}
            teamId={team.id}
            canEdit={canEdit}
            onUnassign={() => onUnassignPlayer(assignment.id)}
          />
        ))}
        
        {(team.assignments || []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No players assigned
          </p>
        )}
      </div>

      {/* Team Full Warning */}
      {isTeamFull && (
        <div className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-950 p-2 rounded">
          Team is full ({maxPlayers} players)
        </div>
      )}

      {/* Fallback Assignment Controls */}
      {canEdit && !isTeamFull && unassignedPlayers.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">Quick assign:</p>
          <div className="flex flex-wrap gap-1">
            {unassignedPlayers.slice(0, 3).map((player) => (
              <Button
                key={player.id}
                variant="outline"
                size="sm"
                className="text-xs h-6"
                onClick={() => onAssignPlayer(team.id, player.id)}
              >
                + {player.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Player Chip Component
interface PlayerChipProps {
  player: {
    id: string;
    name: string;
  };
  assignmentId?: string;
  teamId?: string;
  canEdit: boolean;
  onUnassign?: () => void;
}

function PlayerChip({ player, assignmentId, teamId, canEdit, onUnassign }: PlayerChipProps) {
  const displayName = player.name;
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.id}-${assignmentId || 'unassigned'}`,
    data: {
      type: 'player',
      playerId: player.id,
      fromTeamId: teamId,
      assignmentId: assignmentId,
    },
    disabled: !canEdit,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-2 bg-muted rounded border transition-opacity ${
        canEdit ? 'cursor-move' : 'cursor-default'
      } ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{displayName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {canEdit && onUnassign && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={onUnassign}
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}

// Unassigned Players Card
interface UnassignedPlayersCardProps {
  players: Array<{
    id: string;
    name: string;
  }>;
  canEdit: boolean;
}

function UnassignedPlayersCard({ players, canEdit }: UnassignedPlayersCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-players',
    data: {
      type: 'unassigned',
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-card border rounded-lg p-4 transition-colors ${
        isOver ? 'border-muted-foreground bg-muted/5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Available Players</h4>
        <Badge variant="secondary">{players.length}</Badge>
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            canEdit={canEdit}
          />
        ))}
        
        {players.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            All players assigned
          </p>
        )}
      </div>
    </div>
  );
}
