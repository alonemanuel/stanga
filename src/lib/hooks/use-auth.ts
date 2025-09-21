"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface UseAuthOptions {
  redirectTo?: string;
  required?: boolean;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { redirectTo = "/sign-in", required = false } = options;
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const supabase = createClient();

  React.useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          setUser(null);
        } else {
          setUser(user);
        }
      } catch (error) {
        console.error('Error in getUser:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle sign out
        if (event === 'SIGNED_OUT' && required) {
          router.push(redirectTo);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, router, redirectTo, required]);

  // Redirect if auth is required but user is not authenticated
  React.useEffect(() => {
    if (required && !loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo, required]);

  const signOut = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
      router.push(redirectTo);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [supabase.auth, router, redirectTo]);

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user
  };
}
