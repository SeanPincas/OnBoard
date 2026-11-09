import { z } from "zod";

export const conversationSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().nullable().optional(),
  tenantProfileId: z.string().uuid().nullable().optional(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const chatQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});
