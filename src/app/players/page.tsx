"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, useRestorePlayer } from "@/lib/hooks/use-players";
import { useGroupContext } from "@/lib/hooks/use-group-context";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, RotateCcw, Users, Check, Plus } from "lucide-react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface Player {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export default function PlayersPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [newPlayerName, setNewPlayerName] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const { activeGroup, isLoading: groupLoading } = useGroupContext();
  
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
  
  // Fetch players with filters
  const { data: playersData, isLoading, error } = usePlayers({
    query: searchQuery,
    isActive: true,
    page: 1,
    limit: 50,
  });
  
  const createMutation = useCreatePlayer();
  const updateMutation = useUpdatePlayer();
  const deleteMutation = useDeletePlayer();
  const restoreMutation = useRestorePlayer();
  
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    
    try {
      await createMutation.mutateAsync({ name: newPlayerName.trim() });
      setNewPlayerName("");
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };
  
  const handleStartEdit = (player: Player) => {
    setEditingId(player.id);
    setEditingName(player.name);
  };
  
  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    
    try {
      await updateMutation.mutateAsync({
        id,
        data: { name: editingName.trim() },
      });
      setEditingId(null);
      setEditingName("");
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };
  
  const handleDeletePlayer = async (id: string) => {
    if (confirm('Are you sure you want to delete this player?')) {
      await deleteMutation.mutateAsync(id);
    }
  };
  
  const handleRestorePlayer = async (id: string) => {
    await restoreMutation.mutateAsync(id);
  };
  
  // Show loading state while checking group
  if (groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if no active group
  if (!activeGroup) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <Users className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-semibold">No Group Selected</h2>
          <p className="text-muted-foreground">
            You need to join or create a group to view players. 
            Click on "Select Group" in the header to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Players</h1>
        <p className="text-muted-foreground">
          Manage your football players
        </p>
      </div>

      {/* Search */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Quick Add Player Form */}
      {user && (
        <form onSubmit={handleAddPlayer} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Enter player's full name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
          <Button
            type="submit"
            disabled={!newPlayerName.trim() || createMutation.isPending}
            className="h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </form>
      )}

      {/* Players List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading players...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load players</p>
        </div>
      ) : !playersData?.data.length ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No players found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playersData.data.map((player) => (
            <div
              key={player.id}
              className="rounded-lg border p-4 bg-card"
            >
              <div className="flex items-center justify-between gap-2">
                {editingId === player.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(player.id);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    className="flex-1 font-semibold rounded border border-input bg-transparent px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                ) : (
                  <h3 className="font-semibold">{player.name}</h3>
                )}
                {user && (
                  <div className="flex gap-1 shrink-0">
                    {editingId === player.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveEdit(player.id)}
                        disabled={!editingName.trim() || updateMutation.isPending}
                        aria-label={`Save ${player.name}`}
                        title="Save (Enter)"
                        className="h-9 w-9 p-0 text-green-600 hover:text-green-700"
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(player)}
                        aria-label={`Edit ${player.name}`}
                        title={`Edit ${player.name}`}
                        className="h-9 w-9 p-0"
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlayer(player.id)}
                      aria-label={`Delete ${player.name}`}
                      title={`Delete ${player.name}`}
                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Player count */}
      {playersData && (
        <div className="text-center text-sm text-muted-foreground">
          {playersData.pagination.total} players
        </div>
      )}
    </div>
  );
}


