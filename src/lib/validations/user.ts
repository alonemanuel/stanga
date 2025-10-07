import { z } from "zod";

export const UserProfileUpdateSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100, "Name is too long"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  dateOfBirth: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    const today = new Date();
    const minDate = new Date(1900, 0, 1);
    return date <= today && date >= minDate;
  }, "Please enter a valid date of birth"),
});

export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
