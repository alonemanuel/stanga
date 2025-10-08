"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMatchday, useUpdateMatchday } from "@/lib/hooks/use-matchdays";
import { useMatchdayStats } from "@/lib/hooks/use-stats";
import { TeamManagement } from "@/components/matchdays/TeamManagement";
import { GameManagement } from "@/components/matchdays/GameManagement";
import { StandingsTable } from "@/components/stats/StandingsTable";
import { TopScorerTable } from "@/components/stats/TopScorerTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Hash, Pencil, Check } from "lucide-react";
import { useZodForm, Form } from "@/components/forms/Form";
import { TextField, NumberField } from "@/components/forms/fields";
import { MatchdayUpdateSchema } from "@/lib/validations/matchday";
import type { MatchdayUpdate } from "@/lib/validations/matchday";

interface MatchdayDetailPageProps {
  params: Promise<{
    id: string;
    tab?: string[];
  }>;
}

type TabType = 'overview' | 'teams' | 'games';

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  contentId: string;
  children: React.ReactNode;
  onEdit?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
}

function CollapsibleSection({ 
  title, 
  isExpanded, 
  onToggle, 
  contentId, 
  children,
  onEdit,
  isEditing = false,
  onSave
}: CollapsibleSectionProps) {
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
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                if (isEditing && onSave) {
                  onSave();
                } else {
                  onEdit();
                }
              }}
              aria-label={isEditing ? "Save changes" : "Edit section"}
            >
              {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          )}
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
      </div>
      
      <div
        id={contentId}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
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
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');
  const [matchdayId, setMatchdayId] = React.useState<string>('');
  const [isRulesExpanded, setIsRulesExpanded] = React.useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = React.useState(false);
  const [isEditingInfo, setIsEditingInfo] = React.useState(false);
  const [isEditingRules, setIsEditingRules] = React.useState(false);
  
  // Await params and set matchdayId/tab state based on URL
  React.useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setMatchdayId(resolvedParams.id);

      const [tabSegment] = resolvedParams.tab ?? [];
      const normalizedTab: TabType =
        tabSegment === 'teams' || tabSegment === 'games'
          ? tabSegment
          : 'overview';

      setActiveTab((previousTab) => (previousTab === normalizedTab ? previousTab : normalizedTab));
    };
    getParams();
  }, [params]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as TabType;
    setActiveTab(newTab);
    const newPath = newTab === 'overview' 
      ? `/matchdays/${matchdayId}`
      : `/matchdays/${matchdayId}/${newTab}`;
    router.push(newPath);
  };
  
  const { data: matchdayData, isLoading, error } = useMatchday(matchdayId);
  const { data: statsData, isLoading: statsLoading, error: statsError, isRefetching } = useMatchdayStats(matchdayId);
  const updateMutation = useUpdateMatchday();
  
  // Form for inline editing
  const infoMethods = useZodForm(MatchdayUpdateSchema, {
    defaultValues: matchdayData ? {
      scheduledAt: matchdayData.data.scheduledAt.slice(0, 16),
      location: matchdayData.data.location || "",
      teamSize: matchdayData.data.teamSize,
      numberOfTeams: matchdayData.data.numberOfTeams,
      rules: matchdayData.data.rules,
    } : undefined,
  });

  const rulesMethods = useZodForm(MatchdayUpdateSchema, {
    defaultValues: matchdayData ? {
      scheduledAt: matchdayData.data.scheduledAt.slice(0, 16),
      location: matchdayData.data.location || "",
      teamSize: matchdayData.data.teamSize,
      numberOfTeams: matchdayData.data.numberOfTeams,
      rules: matchdayData.data.rules,
    } : undefined,
  });

  // Update form values when matchday data loads
  React.useEffect(() => {
    if (matchdayData) {
      const values = {
        scheduledAt: matchdayData.data.scheduledAt.slice(0, 16),
        location: matchdayData.data.location || "",
        teamSize: matchdayData.data.teamSize,
        numberOfTeams: matchdayData.data.numberOfTeams,
        rules: matchdayData.data.rules,
      };
      infoMethods.reset(values);
      rulesMethods.reset(values);
    }
  }, [matchdayData, infoMethods, rulesMethods]);

  const handleSaveInfo = async () => {
    const values = infoMethods.getValues();
    try {
      await updateMutation.mutateAsync({
        id: matchdayId,
        data: values,
      });
      setIsEditingInfo(false);
    } catch (error) {
      console.error('Failed to update info:', error);
    }
  };

  const handleSaveRules = async () => {
    const values = rulesMethods.getValues();
    try {
      await updateMutation.mutateAsync({
        id: matchdayId,
        data: values,
      });
      setIsEditingRules(false);
    } catch (error) {
      console.error('Failed to update rules:', error);
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

  if (isLoading) {
    return (
      <div className="pb-20">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading matchday...</p>
        </div>
      </div>
    );
  }

  if (error || !matchdayData) {
    return (
      <div className="pb-20">
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 pb-20">
            {/* Basic Info */}
            <CollapsibleSection
              title="Matchday Information"
              isExpanded={isInfoExpanded}
              onToggle={() => setIsInfoExpanded(!isInfoExpanded)}
              contentId="matchday-info-content"
              onEdit={() => setIsEditingInfo(true)}
              isEditing={isEditingInfo}
              onSave={handleSaveInfo}
            >
              {isEditingInfo ? (
                <Form methods={infoMethods}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      name="scheduledAt"
                      label="Date & Time"
                      type="datetime-local"
                      required
                    />
                    <TextField
                      name="location"
                      label="Location"
                    />
                    <NumberField
                      name="teamSize"
                      label="Team Size"
                      required
                      min={1}
                    />
                    <NumberField
                      name="numberOfTeams"
                      label="Number of Teams"
                      required
                      min={2}
                    />
                  </div>
                </Form>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                      <p className="text-sm">{formatDate(matchday.scheduledAt)}</p>
                    </div>
                  </div>
                  {matchday.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <p className="text-sm">{matchday.location}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Team Size</label>
                      <p className="text-sm">{matchday.teamSize} players per team</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Number of Teams</label>
                      <p className="text-sm">{matchday.numberOfTeams} teams</p>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleSection>

            {/* Rules Snapshot */}
            <CollapsibleSection
              title="Game Rules"
              isExpanded={isRulesExpanded}
              onToggle={() => setIsRulesExpanded(!isRulesExpanded)}
              contentId="game-rules-content"
              onEdit={() => setIsEditingRules(true)}
              isEditing={isEditingRules}
              onSave={handleSaveRules}
            >
              {isEditingRules ? (
                <Form methods={rulesMethods}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <NumberField
                      name="rules.game_minutes"
                      label="Game Duration (minutes)"
                      required
                      min={1}
                    />
                    <NumberField
                      name="rules.extra_minutes"
                      label="Extra Time (minutes)"
                      required
                      min={0}
                    />
                    <NumberField
                      name="rules.max_goals_to_win"
                      label="Max Goals to Win"
                      required
                      min={1}
                    />
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-3">Points System</h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <NumberField
                        name="rules.points.loss"
                        label="Loss Points"
                        required
                        min={0}
                      />
                      <NumberField
                        name="rules.points.draw"
                        label="Draw Points"
                        required
                        min={0}
                      />
                      <NumberField
                        name="rules.points.penalty_bonus_win"
                        label="Penalty Win Points"
                        required
                        min={0}
                      />
                      <NumberField
                        name="rules.points.regulation_win"
                        label="Regulation Win Points"
                        required
                        min={0}
                      />
                    </div>
                  </div>
                </Form>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                </>
              )}
            </CollapsibleSection>

            {/* Stats Section - moved from stats tab */}
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-muted-foreground">Loading stats...</p>
              </div>
            ) : statsError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load statistics</p>
              </div>
            ) : statsData?.data ? (
              <>
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Matchday Statistics</h2>
                </div>
                
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Games</h3>
                    <p className="text-2xl font-bold">{statsData.data.summary.totalGames}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statsData.data.summary.completedGames} completed
                    </p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Goals</h3>
                    <p className="text-2xl font-bold">{statsData.data.summary.totalGoals}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Avg Goals/Game</h3>
                    <p className="text-2xl font-bold">{statsData.data.summary.averageGoalsPerGame.toFixed(1)}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Teams</h3>
                    <p className="text-2xl font-bold">{statsData.data.summary.totalTeams}</p>
                  </div>
                </div>

                {/* Standings Table */}
                <StandingsTable 
                  standings={statsData.data.standings} 
                  isLoading={statsLoading}
                  error={statsError ? String(statsError) : null}
                  isRefetching={isRefetching}
                />

                {/* Top Scorers */}
                <TopScorerTable 
                  topScorers={statsData.data.topScorers}
                  isLoading={statsLoading}
                  error={statsError ? String(statsError) : null}
                  limit={5}
                  isRefetching={isRefetching}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No statistics available yet</p>
              </div>
            )}
          </div>
        );
      case 'teams':
        return (
          <div className="pb-20">
            <TeamManagement 
              matchdayId={matchdayId}
              maxPlayersPerTeam={matchday.teamSize}
              numberOfTeams={matchday.numberOfTeams}
            />
          </div>
        );
      case 'games':
        return (
          <div className="pb-20">
            <GameManagement 
              matchdayId={matchdayId}
              maxPlayersPerTeam={matchday.teamSize}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>

      {/* Floating Bottom Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
          <TabsList className="bg-background/40 backdrop-blur-md supports-[backdrop-filter]:bg-background/30 border border-primary/20 shadow-lg rounded-full p-1.5 h-14 w-full max-w-md">
            <TabsTrigger value="overview" className="rounded-full px-6 h-11 text-base flex-1 data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:backdrop-blur-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="games" className="rounded-full px-6 h-11 text-base flex-1 data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:backdrop-blur-sm">
              Games
            </TabsTrigger>
            <TabsTrigger value="teams" className="rounded-full px-6 h-11 text-base flex-1 data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:backdrop-blur-sm">
              Teams
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
