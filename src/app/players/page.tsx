"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlayerForm } from "@/components/players/PlayerForm";
import { usePlayers, useDeletePlayer, useRestorePlayer } from "@/lib/hooks/use-players";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Player {
  id: string;
  name: string;
  nickname?: string | null;
  position?: string | null;
  skillLevel: number;
  isActive: boolean;
  notes?: string | null;
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
  const [positionFilter, setPositionFilter] = React.useState("");
  
  const supabase = createClient();
  
  // Get current user
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase.auth]);
  
  // Fetch players with filters
  const { data: playersData, isLoading, error } = usePlayers({
    query: searchQuery,
    position: positionFilter || undefined,
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
  
  const getPositionBadgeColor = (position: string | null) => {
    switch (position) {
      case 'goalkeeper': return 'bg-yellow-100 text-yellow-800';
      case 'defender': return 'bg-blue-100 text-blue-800';
      case 'midfielder': return 'bg-green-100 text-green-800';
      case 'forward': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getSkillLevelColor = (level: number) => {
    if (level >= 8) return 'text-green-600 font-semibold';
    if (level >= 6) return 'text-blue-600';
    if (level >= 4) return 'text-yellow-600';
    return 'text-gray-600';
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
            player={editingPlayer}
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
        
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All positions</option>
          <option value="goalkeeper">Goalkeeper</option>
          <option value="defender">Defender</option>
          <option value="midfielder">Midfielder</option>
          <option value="forward">Forward</option>
        </select>
        
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
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{player.name}</h3>
                  {player.nickname && (
                    <p className="text-sm text-muted-foreground">
                      "{player.nickname}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-lg font-bold ${getSkillLevelColor(player.skillLevel)}`}>
                    {player.skillLevel}
                  </span>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
              </div>
              
              {player.position && (
                <div className="mb-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPositionBadgeColor(player.position)}`}>
                    {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
                  </span>
                </div>
              )}
              
              {player.notes && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {player.notes}
                </p>
              )}
              
              {user && (
                <div className="flex gap-2">
                  {!player.deletedAt ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPlayer(player)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlayer(player.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestorePlayer(player.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      Restore
                    </Button>
                  )}
                </div>
              )}
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


