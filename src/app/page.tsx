"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { MatchdayForm } from "@/components/matchdays/MatchdayForm";
import { useMatchdays, useDeleteMatchday } from "@/lib/hooks/use-matchdays";
import { useGroupContext } from "@/lib/hooks/use-group-context";
import { createClient } from "@/lib/supabase/client";
import { getMatchdayDisplayName } from "@/lib/matchday-display";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { CalendarDays, Clock, MapPin, Users, UserPlus, PlusCircle } from "lucide-react";
import { JoinGroupModal } from "@/components/groups/JoinGroupModal";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";

interface Matchday {
  id: string;
  scheduledAt: string;
  location?: string | null;
  teamSize: number;
  numberOfTeams: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  rules: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export default function HomePage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<'upcoming' | 'past'>('upcoming');
  const [showForm, setShowForm] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
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
  
  // Fetch matchdays with filters
  const { data: matchdaysData, isLoading, error } = useMatchdays({
    status: statusFilter,
    isPublic: true,
    page: 1,
    limit: 50,
  });
  
  const deleteMutation = useDeleteMatchday();
  
  const handleDeleteMatchday = async (id: string) => {
    if (confirm('Are you sure you want to delete this matchday?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      <>
        <div className="flex items-center justify-center min-h-screen pb-20">
          <div className="text-center space-y-6 max-w-md mx-auto p-6">
            <Users className="h-20 w-20 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Welcome to Stanga</h2>
              <p className="text-muted-foreground text-lg">
                Join a group to start tracking your football matchdays, players, and stats
              </p>
            </div>
            
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                size="lg" 
                onClick={() => setShowJoinModal(true)}
                className="w-full"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Join a Group
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setShowCreateModal(true)}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Create New Group
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground pt-4">
              Already have an invite code? Click "Join a Group" to enter it.
            </p>
          </div>
        </div>
        
        <JoinGroupModal 
          isOpen={showJoinModal} 
          onClose={() => setShowJoinModal(false)} 
        />
        <CreateGroupModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
        />
      </>
    );
  }

  if (showForm) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Create New Matchday</h1>
          <p className="text-muted-foreground">
            Set up a new football matchday with custom rules
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-6">
          <MatchdayForm
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
          <h1 className="text-2xl font-semibold">Home</h1>
          <p className="text-muted-foreground">
            View and manage football matchdays
          </p>
        </div>
        <div className="flex gap-2">
          {user && activeGroup && (
            <Button onClick={() => setShowForm(true)}>
              Create Matchday
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex rounded-lg border p-1">
          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'upcoming'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setStatusFilter('past')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'past'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {/* Matchdays List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading matchdays...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load matchdays</p>
        </div>
      ) : !matchdaysData?.data.length ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {statusFilter === 'upcoming' ? 'No upcoming matchdays found' : 'No past matchdays found'}
          </p>
          {statusFilter === 'upcoming' && user && activeGroup && (
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Create Your First Matchday
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matchdaysData.data.map((matchday) => (
            <div
              key={matchday.id}
              className="rounded-lg border p-4 bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = `/matchdays/${matchday.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{getMatchdayDisplayName(matchday.scheduledAt, matchday.location)}</h3>
                </div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(matchday.status)}`}>
                  {matchday.status.charAt(0).toUpperCase() + matchday.status.slice(1)}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{formatDate(matchday.scheduledAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{formatTime(matchday.scheduledAt)}</span>
                </div>
                {matchday.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{matchday.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{matchday.numberOfTeams} teams of {matchday.teamSize}</span>
                </div>
              </div>
              
              {user && (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/matchdays/${matchday.id}`}
                  >
                    View Details
                  </Button>
                  {matchday.status === 'upcoming' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMatchday(matchday.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination info */}
      {matchdaysData && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {matchdaysData.data.length} of {matchdaysData.pagination.total} matchdays
        </div>
      )}
    </div>
  );
}