"use client";

import * as React from "react";
import { Form, useZodForm } from "@/components/forms/Form";
import { TextField, SelectField, SubmitButton } from "@/components/forms/fields";
import { UserProfileUpdateSchema, GENDER_OPTIONS, type UserProfileUpdate } from "@/lib/validations/user";
import { useAuth } from "@/components/auth/AuthGuard";
import { toast } from "sonner";

interface ProfileFormProps {
  initialData?: {
    fullName?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
  };
  onSubmit?: (data: UserProfileUpdate) => Promise<void>;
}

export function ProfileForm({ initialData, onSubmit }: ProfileFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Format date for input field (convert from timestamp to YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const methods = useZodForm(UserProfileUpdateSchema, {
    defaultValues: {
      fullName: initialData?.fullName || user?.user_metadata?.full_name || '',
      gender: (initialData?.gender as "male" | "female" | "other" | "prefer_not_to_say" | undefined) || undefined,
      dateOfBirth: formatDateForInput(initialData?.dateOfBirth || ''),
    },
  });

  const handleSubmit = async (data: UserProfileUpdate) => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Form methods={methods} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <TextField
            name="fullName"
            label="Full Name"
            placeholder="Enter your full name"
            required
          />

          <SelectField
            name="gender"
            label="Gender"
            placeholder="Select your gender"
            options={GENDER_OPTIONS}
          />

          <TextField
            name="dateOfBirth"
            label="Date of Birth"
            type="date"
            placeholder="Select your date of birth"
          />
        </div>

        <div className="flex gap-3">
          <SubmitButton 
            className="flex-1" 
            pendingLabel="Updating..."
            disabled={isSubmitting}
          >
            Update Profile
          </SubmitButton>
        </div>
      </Form>
    </div>
  );
}