"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSessionManager } from "@/lib/session-manager";
import { SessionExpiryNotification } from "./SessionExpiryNotification";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthGuard');
  }
  return context;
}

export function AuthGuard({ 
  children, 
  fallback = <AuthLoadingSpinner />, 
  redirectTo = "/sign-in" 
}: AuthGuardProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const supabase = createClient();
  const sessionManager = useSessionManager();

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
        console.log('Auth state change:', event, session?.user?.email || 'no user');
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle sign out - redirect immediately
        if (event === 'SIGNED_OUT' || !session) {
          console.log('User signed out, redirecting...');
          router.push(redirectTo);
          router.refresh(); // Force a hard refresh
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, router, redirectTo]);

  // Redirect to sign-in if no user and not loading
  React.useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  const signOut = React.useCallback(async () => {
    try {
      console.log('Signing out...');
      setLoading(true);
      setUser(null); // Clear user immediately
      await sessionManager.signOut();
      router.push(redirectTo);
      router.refresh(); // Force a hard refresh
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  }, [sessionManager, router, redirectTo]);

  const handleSessionExpired = React.useCallback(() => {
    setUser(null);
    router.push(redirectTo);
  }, [router, redirectTo]);

  const contextValue = React.useMemo(() => ({
    user,
    loading,
    signOut
  }), [user, loading, signOut]);

  // Show loading state
  if (loading) {
    return <>{fallback}</>;
  }

  // Show nothing if no user (will redirect)
  if (!user) {
    return null;
  }

  // Render children with auth context and session management
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <SessionExpiryNotification onSessionExpired={handleSessionExpired} />
    </AuthContext.Provider>
  );
}

function AuthLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Higher-order component for page-level protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { redirectTo?: string; fallback?: React.ReactNode }
) {
  const AuthenticatedComponent = (props: P) => {
    return (
      <AuthGuard redirectTo={options?.redirectTo} fallback={options?.fallback}>
        <Component {...props} />
      </AuthGuard>
    );
  };

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}
