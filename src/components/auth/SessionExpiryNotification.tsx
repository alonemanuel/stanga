"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useSessionManager } from "@/lib/session-manager";
import { toast } from "sonner";

interface SessionExpiryNotificationProps {
  onSessionExpired?: () => void;
}

export function SessionExpiryNotification({ onSessionExpired }: SessionExpiryNotificationProps) {
  const sessionManager = useSessionManager();
  const [showWarning, setShowWarning] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

  React.useEffect(() => {
    const checkSession = async () => {
      const sessionInfo = await sessionManager.getSessionInfo();
      
      if (sessionInfo.isExpired) {
        // Session expired
        setShowWarning(false);
        onSessionExpired?.();
        return;
      }

      const isNearExpiry = await sessionManager.isSessionNearExpiry();
      
      if (isNearExpiry && sessionInfo.timeUntilExpiry) {
        setShowWarning(true);
        setTimeLeft(Math.floor(sessionInfo.timeUntilExpiry / 1000)); // Convert to seconds
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkSession();

    // Check every 30 seconds when warning is shown
    const interval = setInterval(checkSession, 30000);

    return () => clearInterval(interval);
  }, [sessionManager, onSessionExpired]);

  // Update countdown every second when warning is shown
  React.useEffect(() => {
    if (!showWarning || timeLeft <= 0) return;

    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setShowWarning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [showWarning, timeLeft]);

  const handleExtendSession = async () => {
    const result = await sessionManager.refreshSession();
    
    if (result.success) {
      setShowWarning(false);
      toast.success("Session extended successfully");
    } else {
      toast.error("Failed to extend session. Please sign in again.");
      onSessionExpired?.();
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-yellow-800 text-xs font-bold">!</span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800">
            Session Expiring Soon
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            Your session will expire in {formatTime(timeLeft)}
          </p>
          
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleExtendSession}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Extend Session
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowWarning(false)}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
