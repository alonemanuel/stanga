"use client";

import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface SessionInfo {
  user: User | null;
  session: Session | null;
  isExpired: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number | null; // in milliseconds
}

export class SessionManager {
  private static instance: SessionManager;
  private supabase = createClient();
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // Check every minute
  private readonly EXPIRY_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
  
  private constructor() {
    this.startSessionMonitoring();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Get current session information
   */
  public async getSessionInfo(): Promise<SessionInfo> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return {
          user: null,
          session: null,
          isExpired: true,
          expiresAt: null,
          timeUntilExpiry: null
        };
      }

      if (!session) {
        return {
          user: null,
          session: null,
          isExpired: true,
          expiresAt: null,
          timeUntilExpiry: null
        };
      }

      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const isExpired = timeUntilExpiry <= 0;

      return {
        user: session.user,
        session,
        isExpired,
        expiresAt,
        timeUntilExpiry: isExpired ? null : timeUntilExpiry
      };
    } catch (error) {
      console.error('Error in getSessionInfo:', error);
      return {
        user: null,
        session: null,
        isExpired: true,
        expiresAt: null,
        timeUntilExpiry: null
      };
    }
  }

  /**
   * Check if session is about to expire (within warning time)
   */
  public async isSessionNearExpiry(): Promise<boolean> {
    const sessionInfo = await this.getSessionInfo();
    if (!sessionInfo.timeUntilExpiry) return false;
    
    return sessionInfo.timeUntilExpiry <= this.EXPIRY_WARNING_TIME;
  }

  /**
   * Refresh the current session
   */
  public async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return { success: false, error: error.message };
      }

      if (!data.session) {
        return { success: false, error: 'No session returned after refresh' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in refreshSession:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sign out and clean up
   */
  public async signOut(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      this.stopSessionMonitoring();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  /**
   * Start monitoring session expiration
   */
  private startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.sessionCheckInterval = setInterval(async () => {
      const sessionInfo = await this.getSessionInfo();
      
      if (sessionInfo.isExpired) {
        // Session has expired, trigger sign out
        console.warn('Session expired, signing out...');
        await this.signOut();
        // Redirect will be handled by auth components
        return;
      }

      if (sessionInfo.timeUntilExpiry && sessionInfo.timeUntilExpiry <= this.EXPIRY_WARNING_TIME) {
        // Session is about to expire, try to refresh
        console.log('Session near expiry, attempting refresh...');
        const refreshResult = await this.refreshSession();
        
        if (!refreshResult.success) {
          console.warn('Failed to refresh session:', refreshResult.error);
          // Let the session expire naturally and handle it on next check
        }
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop session monitoring
   */
  private stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Clean up when component unmounts
   */
  public destroy(): void {
    this.stopSessionMonitoring();
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

// Hook for React components
export function useSessionManager() {
  return sessionManager;
}
