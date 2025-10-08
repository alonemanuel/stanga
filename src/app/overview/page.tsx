"use client";

import Link from "next/link";
import { useGroupContext } from "@/lib/hooks/use-group-context";
import { useMatchdays } from "@/lib/hooks/use-matchdays";
import { usePlayers } from "@/lib/hooks/use-players";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, BarChart3, Plus } from "lucide-react";
import { format } from "date-fns";

export default function OverviewPage() {
  const { activeGroup, isLoading: groupLoading } = useGroupContext();
  const { data: matchdaysData, isLoading: matchdaysLoading } = useMatchdays({
    page: 1,
    limit: 5,
    status: "upcoming",
    isPublic: true,
  });
  const { data: playersData, isLoading: playersLoading } = usePlayers({
    page: 1,
    limit: 100,
    isActive: true,
  });

  const matchdays = matchdaysData?.data || [];
  const players = playersData?.data || [];
  const upcomingMatchdays = matchdays.filter(
    (m) => m.status === "upcoming" || m.status === "active"
  );

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Welcome to Stanga</h1>
          <p className="text-muted-foreground">
            Please select or create a group to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Welcome to {activeGroup.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playersLoading ? "..." : players.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active players in your group
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Matchdays
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {matchdaysLoading ? "..." : upcomingMatchdays.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Scheduled matchdays
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {matchdaysData?.pagination.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total matchdays created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Matchdays Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming Matchdays</CardTitle>
            <Button asChild size="sm">
              <Link href="/matchdays">
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {matchdaysLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : upcomingMatchdays.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No upcoming matchdays scheduled
              </p>
              <Button asChild>
                <Link href="/matchdays">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Matchday
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatchdays.slice(0, 3).map((matchday) => (
                <Link
                  key={matchday.id}
                  href={`/matchdays/${matchday.id}`}
                  className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{matchday.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(matchday.scheduledAt), "EEEE, MMMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium capitalize">
                        {matchday.status}
                      </div>
                      {matchday.location && (
                        <div className="text-xs text-muted-foreground">
                          {matchday.location}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild variant="outline" className="h-20">
              <Link href="/matchdays" className="flex flex-col">
                <Calendar className="h-6 w-6 mb-2" />
                <span>Manage Matchdays</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20">
              <Link href="/players" className="flex flex-col">
                <Users className="h-6 w-6 mb-2" />
                <span>Manage Players</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

