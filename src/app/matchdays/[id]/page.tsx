"use client";

import * as React from "react";
import { useMatchday, useUpdateMatchday } from "@/lib/hooks/use-matchdays";
import { MatchdayForm } from "@/components/matchdays/MatchdayForm";
import { TeamManagement } from "@/components/matchdays/TeamManagement";
import { GameManagement } from "@/components/matchdays/GameManagement";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getMatchdayDisplayName } from "@/lib/matchday-display";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface MatchdayDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

type TabType = 'overview' | 'teams' | 'games' | 'stats' | 'activity';

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  contentId: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isExpanded, onToggle, contentId, children }: CollapsibleSectionProps) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      
      <div
        id={contentId}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isExpanded}
      >
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MatchdayDetailPage({ params }: MatchdayDetailPageProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');
  const [isEditing, setIsEditing] = React.useState(false);
  const [matchdayId, setMatchdayId] = React.useState<string>('');
  const [isRulesExpanded, setIsRulesExpanded] = React.useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = React.useState(false);
  
  const supabase = createClient();
  
  // Await params and set matchdayId
  React.useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setMatchdayId(resolvedParams.id);
    };
    getParams();
  }, [params]);
  
  const { data: matchdayData, isLoading, error } = useMatchday(matchdayId);
  const updateMutation = useUpdateMatchday();
  
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

  const handleEditSuccess = () => {
    setIsEditing(false);
  };

  const handleStartMatchday = async () => {
    if (!matchdayData) return;
    
    try {
      await updateMutation.mutateAsync({
        id: matchdayId,
        data: { status: 'active' }
      });
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading matchday...</p>
        </div>
      </div>
    );
  }

  if (error || !matchdayData) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load matchday</p>
          <Button 
            onClick={() => window.location.href = '/matchdays'} 
            className="mt-4"
          >
            Back to Matchdays
          </Button>
        </div>
      </div>
    );
  }

  const matchday = matchdayData.data;

  // Show edit form if editing
  if (isEditing) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(false)}
            >
              ← Back
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">Edit Matchday</h1>
          <p className="text-muted-foreground">
            Update matchday information and rules
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-6">
          <MatchdayForm
            matchday={{
              id: matchday.id,
              scheduledAt: matchday.scheduledAt,
              location: matchday.location,
              maxPlayers: matchday.maxPlayers,
              rules: matchday.rules,
            }}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'teams', label: 'Teams' },
    { id: 'games', label: 'Games' },
    { id: 'stats', label: 'Stats', disabled: true },
    { id: 'activity', label: 'Activity', disabled: true },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Basic Info */}
            <CollapsibleSection
              title="Matchday Information"
              isExpanded={isInfoExpanded}
              onToggle={() => setIsInfoExpanded(!isInfoExpanded)}
              contentId="matchday-info-content"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="text-sm">{formatDate(matchday.scheduledAt)}</p>
                </div>
                {matchday.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-sm">{matchday.location}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Players</label>
                  <p className="text-sm">{matchday.maxPlayers}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(matchday.status)}`}>
                    {matchday.status.charAt(0).toUpperCase() + matchday.status.slice(1)}
                  </span>
                </div>
              </div>
            </CollapsibleSection>

            {/* Rules Snapshot */}
            <CollapsibleSection
              title="Game Rules"
              isExpanded={isRulesExpanded}
              onToggle={() => setIsRulesExpanded(!isRulesExpanded)}
              contentId="game-rules-content"
            >
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Team Size</label>
                  <p className="text-sm">{matchday.rules.team_size} players</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Game Duration</label>
                  <p className="text-sm">{matchday.rules.game_minutes} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Extra Time</label>
                  <p className="text-sm">{matchday.rules.extra_minutes} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Goals to Win</label>
                  <p className="text-sm">{matchday.rules.max_goals_to_win} goals</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Penalties on Tie</label>
                  <p className="text-sm">{matchday.rules.penalties_on_tie ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Penalty Win Weight</label>
                  <p className="text-sm">{matchday.rules.penalty_win_weight}</p>
                </div>
              </div>
              
              {/* Points System */}
              <div className="mt-6">
                <h4 className="text-md font-medium mb-3">Points System</h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Loss</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.loss}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Draw</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.draw}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Penalty Win</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.penalty_bonus_win}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <label className="text-xs font-medium text-muted-foreground">Regulation Win</label>
                    <p className="text-lg font-semibold">{matchday.rules.points.regulation_win}</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        );
      case 'teams':
        return (
          <TeamManagement 
            matchdayId={matchdayId}
            maxPlayersPerTeam={matchday.rules.team_size}
          />
        );
      case 'games':
        return (
          <GameManagement 
            matchdayId={matchdayId}
            maxPlayersPerTeam={matchday.rules.team_size}
          />
        );
      case 'stats':
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Statistics coming soon...</p>
          </div>
        );
      case 'activity':
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Activity log coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/matchdays'}
            >
              ← Back
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">{getMatchdayDisplayName(matchday.scheduledAt, matchday.location)}</h1>
          <p className="text-muted-foreground">
            {formatDate(matchday.scheduledAt)}
          </p>
        </div>
        {user && matchday.status === 'upcoming' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Matchday
            </Button>
            <Button onClick={handleStartMatchday} loading={updateMutation.isPending}>
              Start Matchday
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : tab.disabled
                  ? 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
              }`}
              disabled={tab.disabled}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
}
