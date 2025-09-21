"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

export function UserMenu() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="h-9 w-20 bg-muted animate-pulse rounded" />
    );
  }

  if (user) {
    const displayName = user.user_metadata?.full_name || 
                       user.email?.split('@')[0] || 
                       'User';
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Hello, {displayName}
        </span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Link href="/sign-in">
      <Button>Sign In</Button>
    </Link>
  );
}
