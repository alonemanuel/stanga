"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlayerForm } from "@/components/players/PlayerForm";
import { usePlayers, useDeletePlayer, useRestorePlayer } from "@/lib/hooks/use-players";
import { useGroupContext } from "@/lib/hooks/use-group-context";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, RotateCcw, Users } from "lucide-react";
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
  
  const deleteMutation = useDeletePlayer();
  const restoreMutation = useRestorePlayer();
  
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
        <div className="bg-muted/50 border-2 border-dashed rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Add New Player</h3>
          <PlayerForm quickAdd />
        </div>
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
              {editingId === player.id ? (
                <PlayerForm
                  player={player}
                  onSuccess={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{player.name}</h3>
                  {user && (
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(player.id)}
                        aria-label={`Edit ${player.name}`}
                        title={`Edit ${player.name}`}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlayer(player.id)}
                        aria-label={`Delete ${player.name}`}
                        title={`Delete ${player.name}`}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
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


