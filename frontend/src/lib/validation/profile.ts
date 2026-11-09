import { z } from "zod";

export const profileRoleSchema = z.enum(["tenant", "landlord"]);

export const profileUpsertSchema = z.object({
  role: profileRoleSchema,
  displayName: z.string().trim().min(1).max(120),
  profilePhotoUrl: z.string().url().nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  permanentAddress: z.string().trim().max(500).nullable().optional(),
  age: z.number().int().min(16).max(120).nullable().optional(),
  gender: z.string().trim().max(80).nullable().optional(),
  studentOrEmploymentStatus: z.string().trim().max(160).nullable().optional(),
});

export const onboardingUpdateSchema = z.object({
  progress: z.record(z.string(), z.unknown()).default({}),
  completed: z.boolean().default(false),
});

export type ProfileUpsertInput = z.infer<typeof profileUpsertSchema>;
export type OnboardingUpdateInput = z.infer<typeof onboardingUpdateSchema>;
