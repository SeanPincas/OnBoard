import { NextResponse } from "next/server";

import { requireLandlordContext } from "@/lib/supabase/landlord";
import { publicationStatusSchema } from "@/lib/validation/inventory";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supabase, profile } = await requireLandlordContext();
    const { propertyId } = await context.params;
    const body = (await request.json()) as { publicationStatus?: unknown };
    const publicationStatus = publicationStatusSchema.parse(body.publicationStatus);
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, publication_status")
      .eq("id", propertyId)
      .eq("landlord_profile_id", profile.id)
      .maybeSingle();

    if (propertyError || !property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    if (publicationStatus === "published") {
      const [{ count: photoCount, error: photoError }, { count: roomCount, error: roomError }] = await Promise.all([
        supabase.from("listing_photos").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
        supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
      ]);

      if (photoError || roomError) return NextResponse.json({ error: "Publication checks failed" }, { status: 500 });
      if ((photoCount ?? 0) < 4) return NextResponse.json({ error: "Published listings require at least 4 photos" }, { status: 409 });
      if ((roomCount ?? 0) < 1) return NextResponse.json({ error: "Published properties require at least 1 room" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("properties")
      .update({ publication_status: publicationStatus })
      .eq("id", propertyId)
      .eq("landlord_profile_id", profile.id)
      .select("id, publication_status, updated_at")
      .single();

    if (error) return NextResponse.json({ error: "Publication update failed" }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid publication status" }, { status: 400 });
    }
    return NextResponse.json({ error: "Publication update failed" }, { status: 500 });
  }
}
