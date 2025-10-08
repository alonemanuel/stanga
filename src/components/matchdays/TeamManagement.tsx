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
import { useMatchdayTeams, useCreateTeam, useAssignPlayer, useUnassignPlayer, useUpdateTeam, useDeleteTeam } from "@/lib/hooks/use-teams";
import { usePlayers } from "@/lib/hooks/use-players";
import { TEAM_COLORS, type ColorToken } from "@/lib/teams";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface TeamManagementProps {
  matchdayId: string;
  maxPlayersPerTeam: number;
  numberOfTeams: number;
}

interface DragData {
  type: 'player';
  playerId: string;
  fromTeamId?: string;
  assignmentId?: string;
}

export function TeamManagement({ matchdayId, maxPlayersPerTeam, numberOfTeams }: TeamManagementProps) {
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
  
  const createTeamMutation = useCreateTeam();
  const assignPlayerMutation = useAssignPlayer();
  const unassignPlayerMutation = useUnassignPlayer();
  const deleteTeamMutation = useDeleteTeam();

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

  // Get colors that are already in use
  const usedColors = new Set(teams.map(t => t.colorToken));

  // Get available colors (not used by any team)
  const availableColors = Object.keys(TEAM_COLORS).filter(
    (token) => !usedColors.has(token as ColorToken)
  ) as ColorToken[];

  const handleCreateTeam = async () => {
    if (!user || availableColors.length === 0) return;
    
    // Use the first available color (or could randomize)
    const colorToUse = availableColors[0];
    
    await createTeamMutation.mutateAsync({
      matchdayId,
      data: {
        colorToken: colorToUse,
        name: TEAM_COLORS[colorToUse].name,
      }
    });
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

  const handleDeleteTeam = async (teamId: string, hasPlayers: boolean) => {
    if (!user) return;

    if (hasPlayers) {
      const confirmed = window.confirm(
        'This team has players assigned. Are you sure you want to delete it? All player assignments will be removed.'
      );
      if (!confirmed) return;
    }

    await deleteTeamMutation.mutateAsync(teamId);
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

  // If no teams exist, show empty state with create button
  if (teams.length === 0) {
    if (!user) {
      return (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">Team Management</h3>
          <p className="text-sm text-muted-foreground">Sign in to manage teams</p>
        </div>
      );
    }
    
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first team to get started. You can change the color by clicking on it after creation.
        </p>
        
        <Button 
          onClick={handleCreateTeam}
          disabled={createTeamMutation.isPending || availableColors.length === 0}
        >
          {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
        </Button>
        
        {availableColors.length === 0 && (
          <p className="text-sm text-muted-foreground mt-4">No colors available</p>
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
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {unassignedPlayers.length} unassigned players
          </div>
          {user && availableColors.length > 0 && (
            <Button 
              size="sm" 
              onClick={handleCreateTeam}
              disabled={createTeamMutation.isPending}
            >
              {createTeamMutation.isPending ? 'Creating...' : '+ Add Team'}
            </Button>
          )}
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
                  onDeleteTeam={handleDeleteTeam}
                  unassignedPlayers={unassignedPlayers}
                  allTeams={teams}
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
  onDeleteTeam: (teamId: string, hasPlayers: boolean) => void;
  unassignedPlayers: Array<{
    id: string;
    name: string;
  }>;
  allTeams: Array<{
    id: string;
    colorToken: ColorToken;
  }>;
}

function TeamCard({ team, maxPlayers, canEdit, onUnassignPlayer, onAssignPlayer, onDeleteTeam, unassignedPlayers, allTeams }: TeamCardProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const colorPickerRef = React.useRef<HTMLDivElement>(null);
  const colorInfo = TEAM_COLORS[team.colorToken];
  const isTeamFull = team.playerCount >= maxPlayers;
  const updateTeamMutation = useUpdateTeam();
  const hasPlayers = (team.assignments || []).length > 0;

  // Close color picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  // Get colors that are already in use by other teams
  const usedColors = new Set(
    allTeams.filter(t => t.id !== team.id).map(t => t.colorToken)
  );

  // Get available colors (not used by other teams)
  const availableColors = Object.entries(TEAM_COLORS).filter(
    ([token]) => !usedColors.has(token as ColorToken)
  );

  const handleColorChange = async (newColorToken: ColorToken) => {
    const newColorInfo = TEAM_COLORS[newColorToken];
    try {
      await updateTeamMutation.mutateAsync({
        teamId: team.id,
        data: {
          colorToken: newColorToken,
          name: newColorInfo.name, // Automatically update name to match color
        }
      });
      setShowColorPicker(false);
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };
  
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
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <div 
              className={`w-4 h-4 rounded-full border ${canEdit ? 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all' : ''}`}
              style={{ 
                backgroundColor: team.colorHex,
                borderColor: team.colorToken === 'white' ? '#e5e7eb' : team.colorHex
              }}
              onClick={() => canEdit && setShowColorPicker(!showColorPicker)}
              title={canEdit ? "Click to change team color" : "Team color"}
            />
            
            {/* Color Picker Dropdown */}
            {showColorPicker && canEdit && (
              <div 
                ref={colorPickerRef}
                className="absolute top-6 left-0 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 min-w-[160px]"
              >
                <div className="text-xs font-medium mb-3 text-muted-foreground">Choose Color:</div>
                <div className="grid grid-cols-3 gap-2">
                  {availableColors.map(([token, colorInfo]) => (
                    <button
                      key={token}
                      className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                        team.colorToken === token 
                          ? 'border-primary ring-2 ring-primary ring-offset-1' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: colorInfo.hex,
                        borderColor: team.colorToken === token ? undefined : (token === 'white' ? '#e5e7eb' : '#d1d5db')
                      }}
                      onClick={() => handleColorChange(token as ColorToken)}
                      title={colorInfo.name}
                      disabled={updateTeamMutation.isPending}
                    />
                  ))}
                  {/* Show current color even if it would normally be filtered out */}
                  {usedColors.has(team.colorToken) && (
                    <button
                      className="w-10 h-10 rounded-full border-2 border-primary ring-2 ring-primary ring-offset-1"
                      style={{ backgroundColor: TEAM_COLORS[team.colorToken].hex }}
                      title={`${TEAM_COLORS[team.colorToken].name} (Current)`}
                      disabled={true}
                    />
                  )}
                </div>
                {availableColors.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No other colors available
                  </div>
                )}
                <button
                  className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowColorPicker(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <h4 className="font-semibold">{team.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isTeamFull ? "destructive" : "secondary"}>
            {team.playerCount}/{maxPlayers}
          </Badge>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteTeam(team.id, hasPlayers)}
              title="Delete team"
            >
              ×
            </Button>
          )}
        </div>
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
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium sm:flex hidden">
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
