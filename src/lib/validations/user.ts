import { z } from 'zod';

// Profile update schema
export const UserProfileUpdateSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
    errorMap: () => ({ message: 'Please select a valid gender option' })
  }).optional(),
  dateOfBirth: z.string()
    .refine((date) => {
      if (!date) return true; // Allow empty date
      const parsedDate = new Date(date);
      const now = new Date();
      const minDate = new Date(now.getFullYear() - 120, 0, 1); // 120 years ago
      const maxDate = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate()); // Must be at least 13 years old
      
      return parsedDate >= minDate && parsedDate <= maxDate;
    }, {
      message: 'Please enter a valid date of birth (must be at least 13 years old)'
    })
    .optional(),
});

// Types
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;

// Gender options for select field
export const GENDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];