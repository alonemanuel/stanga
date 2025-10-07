"use client";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserProfileUpdate } from "@/lib/validations/user";

export default function ProfilePage() {
  const { profile, loading, error, updateProfile } = useProfile();

  const handleProfileUpdate = async (data: UserProfileUpdate) => {
    await updateProfile(data);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-semibold mb-6">Profile</h1>
          <div className="space-y-4">
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-semibold mb-6">Profile</h1>
          <div className="p-4 border border-red-200 bg-red-50 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-2">Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Update your personal information and preferences.
        </p>
        
        <ProfileForm
          initialData={profile ? {
            fullName: profile.fullName,
            gender: profile.gender,
            dateOfBirth: profile.dateOfBirth,
          } : undefined}
          onSubmit={handleProfileUpdate}
        />
      </div>
    </div>
  );
}


