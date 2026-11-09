import { z } from "zod";

export const citySchema = z.enum(["manila_city", "cebu_city"]);
export const publicationStatusSchema = z.enum(["draft", "published", "archived"]);
export const roomTypeSchema = z.enum(["private", "shared"]);
export const rentalBasisSchema = z.enum(["per_room", "per_person", "per_bed_space"]);

export const propertyInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  city: citySchema,
  address: z.string().trim().min(5).max(300),
  landmark: z.string().trim().max(200).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  amenities: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  houseRules: z.record(z.string(), z.unknown()).default({}),
  occupancyRestriction: z.enum(["any_gender", "female_only", "male_only"]).default("any_gender"),
});

export const roomInputSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(5000).nullable().optional(),
    roomNumber: z.string().trim().max(40).nullable().optional(),
    roomType: roomTypeSchema,
    rentalBasis: rentalBasisSchema,
    monthlyRent: z.number().min(0),
    securityDeposit: z.number().min(0).default(0),
    advancePayment: z.number().min(0).default(0),
    utilityFee: z.number().min(0).default(0),
    capacity: z.number().int().min(1).max(100),
    furnished: z.boolean().default(false),
    bathroomType: z.string().trim().min(1).max(80).default("shared"),
    availableFrom: z.string().date().nullable().optional(),
  })
  .superRefine((value, context) => {
    const validBasis = value.roomType === "private" && value.rentalBasis === "per_room"
      || value.roomType === "shared" && ["per_person", "per_bed_space"].includes(value.rentalBasis);
    if (!validBasis) {
      context.addIssue({ code: "custom", path: ["rentalBasis"], message: "Rental basis does not match room type" });
    }
  });

export const bedSpaceInputSchema = z.object({
  label: z.string().trim().min(1).max(60),
  monthlyRent: z.number().min(0),
});

export const photoInputSchema = z.object({
  storagePath: z.string().trim().min(1).max(500),
  publicUrl: z.string().url(),
  sortOrder: z.number().int().min(0).max(100).default(0),
});
