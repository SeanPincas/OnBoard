import { NextResponse } from "next/server";

import { requireLandlordContext } from "@/lib/supabase/landlord";
import { photoInputSchema } from "@/lib/validation/inventory";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { supabase, profile } = await requireLandlordContext();
    const { propertyId } = await context.params;
    const input = photoInputSchema.parse(await request.json());
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("landlord_profile_id", profile.id)
      .maybeSingle();

    if (propertyError || !property) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const { count, error: countError } = await supabase
      .from("listing_photos")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId);

    if (countError) return NextResponse.json({ error: "Photo count failed" }, { status: 500 });
    if ((count ?? 0) >= 6) return NextResponse.json({ error: "A property can have at most 6 photos" }, { status: 409 });

    const { data, error } = await supabase
      .from("listing_photos")
      .insert({ property_id: propertyId, ...input })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Photo metadata creation failed" }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid photo data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Photo metadata creation failed" }, { status: 500 });
  }
}
