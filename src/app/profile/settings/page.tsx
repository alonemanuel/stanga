"use client";

import * as React from 'react';
import { useEffect } from 'react';
import { Form, useZodForm } from '@/components/forms/Form';
import { SelectField, SubmitButton, TextField } from '@/components/forms/fields';
import { useProfile, useUpdateProfile } from '@/lib/hooks/use-profile';
import {
  PROFILE_GENDER_OPTIONS,
  ProfileSettingsSchema,
  type ProfileSettings,
} from '@/lib/validations/user';

export default function ProfileSettingsPage() {
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();

  const methods = useZodForm(ProfileSettingsSchema, {
    defaultValues: {
      displayName: '',
      birthDate: undefined,
      gender: undefined,
    },
  });

  const profile = profileQuery.data?.data;

  useEffect(() => {
    if (profile) {
      methods.reset({
        displayName:
          profile.displayName ||
          profile.fullName ||
          profile.email?.split?.('@')?.[0] ||
          '',
        birthDate: profile.birthDate ?? undefined,
        gender: (profile.gender ?? undefined) as ProfileSettings['gender'],
      });
    }
  }, [profile, methods]);

  const handleSubmit = async (values: ProfileSettings) => {
    try {
      await updateProfile.mutateAsync(values);
    } catch {
      // Errors are surfaced via the mutation hook's toast handlers
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage how your profile information appears across the app.
        </p>
      </div>

      <Form methods={methods} onSubmit={handleSubmit} className="space-y-6">
        <fieldset
          className="space-y-6"
          disabled={profileQuery.isLoading || updateProfile.isPending}
        >
          <TextField
            name="displayName"
            label="Display Name"
            placeholder="e.g. Alex Morgan"
            required
          />

          <TextField
            name="birthDate"
            label="Birth Date"
            type="date"
          />

          <SelectField
            name="gender"
            label="Gender"
            placeholder="Select gender (optional)"
            options={PROFILE_GENDER_OPTIONS}
          />

          <SubmitButton pendingLabel="Saving...">
            Save changes
          </SubmitButton>
        </fieldset>
      </Form>
    </div>
  );
}
