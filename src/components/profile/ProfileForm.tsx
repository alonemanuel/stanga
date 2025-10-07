"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { TextField, SelectField } from "@/components/forms/fields";
import { useZodForm, Form } from "@/components/forms/Form";
import { UserProfileUpdateSchema, type UserProfileUpdate } from "@/lib/validations/user";
import { useUpdateUserProfile } from "@/lib/hooks/use-user-profile";

interface ProfileFormProps {
  profile: {
    fullName: string | null;
    gender: string | null;
    dateOfBirth: string | null;
  };
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const updateMutation = useUpdateUserProfile();

  // Format date for input[type="date"]
  const formattedDate = profile.dateOfBirth
    ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
    : "";

  const methods = useZodForm(UserProfileUpdateSchema, {
    defaultValues: {
      fullName: profile.fullName || "",
      gender: (profile.gender as "male" | "female" | "other" | "prefer_not_to_say" | undefined) || undefined,
      dateOfBirth: formattedDate || undefined,
    },
  });

  const onSubmit = async (data: UserProfileUpdate) => {
    await updateMutation.mutateAsync(data);
  };

  const isLoading = updateMutation.isPending;

  return (
    <Form methods={methods} onSubmit={onSubmit} className="space-y-6">
      <TextField
        name="fullName"
        label="Full Name"
        placeholder="Enter your full name"
        required
      />

      <SelectField
        name="gender"
        label="Gender"
        placeholder="Select gender (optional)"
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "other", label: "Other" },
          { value: "prefer_not_to_say", label: "Prefer not to say" },
        ]}
      />

      <TextField
        name="dateOfBirth"
        label="Date of Birth"
        type="date"
        placeholder="Select your date of birth"
      />

      <div className="flex justify-end pt-4">
        <Button type="submit" loading={isLoading}>
          Save Changes
        </Button>
      </div>
    </Form>
  );
}
