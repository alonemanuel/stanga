"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlayerForm } from "@/components/players/PlayerForm";
import { usePlayers, useDeletePlayer, useRestorePlayer } from "@/lib/hooks/use-players";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
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
  const [showForm, setShowForm] = React.useState(false);
  const [editingPlayer, setEditingPlayer] = React.useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDeleted, setShowDeleted] = React.useState(false);
  
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
    isActive: !showDeleted,
    page: 1,
    limit: 50,
  });
  
  const deleteMutation = useDeletePlayer();
  const restoreMutation = useRestorePlayer();
  
  const handleAddPlayer = () => {
    setEditingPlayer(null);
    setShowForm(true);
  };
  
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };
  
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPlayer(null);
  };
  
  const handleDeletePlayer = async (id: string) => {
    if (confirm('Are you sure you want to delete this player?')) {
      await deleteMutation.mutateAsync(id);
    }
  };
  
  const handleRestorePlayer = async (id: string) => {
    await restoreMutation.mutateAsync(id);
  };
  

  if (showForm) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">
            {editingPlayer ? 'Edit Player' : 'Add New Player'}
          </h1>
          <p className="text-muted-foreground">
            {editingPlayer ? 'Update player information' : 'Create a new player profile'}
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-6">
          <PlayerForm
            player={editingPlayer || undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Players</h1>
          <p className="text-muted-foreground">
            Manage your football players
          </p>
        </div>
        {user && (
          <Button onClick={handleAddPlayer}>
            Add Player
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded border-input"
            />
            Show deleted
          </label>
        </div>
      </div>

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
          <p className="text-muted-foreground">
            {showDeleted ? 'No deleted players found' : 'No players found'}
          </p>
          {!showDeleted && user && (
            <Button onClick={handleAddPlayer} className="mt-4">
              Add Your First Player
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playersData.data.map((player) => (
            <div
              key={player.id}
              className={`rounded-lg border p-4 ${
                player.deletedAt ? 'bg-muted/50 opacity-75' : 'bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{player.name}</h3>
                {user && (
                  <div className="flex gap-1 ml-2">
                    {!player.deletedAt ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlayer(player)}
                          aria-label={`Edit ${player.name}`}
                          title={`Edit ${player.name}`}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePlayer(player.id)}
                          aria-label={`Delete ${player.name}`}
                          title={`Delete ${player.name}`}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestorePlayer(player.id)}
                        aria-label={`Restore ${player.name}`}
                        title={`Restore ${player.name}`}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination info */}
      {playersData && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {playersData.data.length} of {playersData.pagination.total} players
        </div>
      )}
    </div>
  );
}


