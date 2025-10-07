import { z } from 'zod';

const GenderEnum = z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']);

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const ProfileSettingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters'),
  birthDate: z
    .preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z
        .string()
        .regex(isoDateRegex, 'Birth date must be a valid ISO date (YYYY-MM-DD)')
        .optional()
    ),
  gender: z
    .preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      GenderEnum.optional()
    ),
});

export type ProfileSettings = z.infer<typeof ProfileSettingsSchema>;
export type ProfileGender = z.infer<typeof GenderEnum>;

export const PROFILE_GENDER_OPTIONS: Array<{ value: ProfileGender; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
