import { z } from "zod";

export const reservationRequestSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid(),
  bedSpaceId: z.string().uuid().nullable().optional(),
  requestedOccupants: z.number().int().min(1).max(100).default(1),
  intendedMoveIn: z.string().date(),
  message: z.string().trim().max(4000).nullable().optional(),
});

export const reservationActionSchema = z.object({
  action: z.enum(["confirm", "decline", "cancel", "move_in"]),
});
