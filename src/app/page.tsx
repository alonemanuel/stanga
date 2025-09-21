"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function DashboardPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <div className="h-9 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            {user ? `Welcome back, ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}!` : 'Welcome to Stanga'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Next Matchday</h3>
          <p className="text-sm text-muted-foreground">No upcoming matchdays</p>
          {user ? (
            <Link href="/matchdays">
              <Button variant="outline" size="sm" className="mt-2">
                Create Matchday
              </Button>
            </Link>
          ) : (
            <Link href="/sign-in">
              <Button variant="outline" size="sm" className="mt-2">
                Sign in to create
              </Button>
            </Link>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Recent Results</h3>
          <p className="text-sm text-muted-foreground">No recent games</p>
          {user && (
            <Link href="/matchdays">
              <Button variant="outline" size="sm" className="mt-2">
                View All Games
              </Button>
            </Link>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Top Scorers</h3>
          <p className="text-sm text-muted-foreground">No stats available</p>
          {user && (
            <Link href="/stats">
              <Button variant="outline" size="sm" className="mt-2">
                View Stats
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!user ? (
        <div className="rounded-lg border p-6 text-center">
          <h2 className="text-lg font-medium mb-2">Get Started</h2>
          <p className="text-muted-foreground mb-4">
            Sign in to start organizing your football matches
          </p>
          <Link href="/sign-in">
            <Button size="lg">Sign In to Continue</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border p-6 text-center">
          <h2 className="text-lg font-medium mb-2">Ready to Play!</h2>
          <p className="text-muted-foreground mb-4">
            Start organizing your next football match
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/matchdays">
              <Button size="lg">Create Matchday</Button>
            </Link>
            <Link href="/players">
              <Button variant="outline" size="lg">Manage Players</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}