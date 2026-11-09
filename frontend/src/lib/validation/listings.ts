import { z } from "zod";

const optionalNumber = z.coerce.number().finite();

export const listingSearchQuerySchema = z.object({
  city: z.enum(["manila_city", "cebu_city"]).optional(),
  search: z.string().trim().max(160).optional(),
  minRent: optionalNumber.min(0).optional(),
  maxRent: optionalNumber.min(0).optional(),
  roomType: z.enum(["private", "shared"]).optional(),
  includeUnavailable: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  latitude: optionalNumber.min(-90).max(90).optional(),
  longitude: optionalNumber.min(-180).max(180).optional(),
  radiusMeters: optionalNumber.min(50).max(50000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
}).superRefine((value, context) => {
  const hasLatitude = value.latitude !== undefined;
  const hasLongitude = value.longitude !== undefined;
  const hasRadius = value.radiusMeters !== undefined;
  if (hasLatitude !== hasLongitude || hasLatitude !== hasRadius) {
    context.addIssue({ code: "custom", path: ["latitude"], message: "Latitude, longitude, and radiusMeters must be provided together" });
  }
  if (value.minRent !== undefined && value.maxRent !== undefined && value.minRent > value.maxRent) {
    context.addIssue({ code: "custom", path: ["minRent"], message: "minRent cannot exceed maxRent" });
  }
});
