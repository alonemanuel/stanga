"use client";

import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useUserProfile();

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-muted rounded"></div>
          <div className="h-4 w-48 bg-muted rounded"></div>
          <div className="space-y-3 pt-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-destructive">Error</h1>
        <p className="text-sm text-muted-foreground">
          Failed to load profile. Please try again.
        </p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information
        </p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}


