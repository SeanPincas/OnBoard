import { NextResponse } from "next/server";

import { requireLandlordContext } from "@/lib/supabase/landlord";
import { propertyInputSchema } from "@/lib/validation/inventory";

export async function GET() {
  try {
    const { supabase, profile } = await requireLandlordContext();
    const { data, error } = await supabase
      .from("properties")
      .select("id, title, description, city, address, landmark, amenities, house_rules, occupancy_restriction, publication_status, created_at, updated_at")
      .eq("landlord_profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Property lookup failed" }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Property lookup failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireLandlordContext();
    const input = propertyInputSchema.parse(await request.json());
    const { data, error } = await supabase.rpc("create_property", {
      p_title: input.title,
      p_description: input.description ?? null,
      p_city: input.city,
      p_address: input.address,
      p_landmark: input.landmark ?? null,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_amenities: input.amenities,
      p_house_rules: input.houseRules,
      p_occupancy_restriction: input.occupancyRestriction,
    });

    if (error) return NextResponse.json({ error: "Property creation failed" }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid property data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Property creation failed" }, { status: 500 });
  }
}
