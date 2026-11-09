import { NextResponse } from "next/server";

import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { listingSearchQuerySchema } from "@/lib/validation/listings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const parsed = listingSearchQuerySchema.safeParse(rawQuery);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid listing search", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createClerkSupabaseClient();
    const query = parsed.data;
    const { data, error } = await supabase.rpc("search_listings", {
      p_city: query.city ?? null,
      p_search: query.search || null,
      p_min_rent: query.minRent ?? null,
      p_max_rent: query.maxRent ?? null,
      p_room_type: query.roomType ?? null,
      p_include_unavailable: query.includeUnavailable,
      p_latitude: query.latitude ?? null,
      p_longitude: query.longitude ?? null,
      p_radius_meters: query.radiusMeters ?? null,
      p_limit: query.limit,
      p_offset: query.offset,
    });

    if (error) return NextResponse.json({ error: "Listing search failed" }, { status: 500 });
    return NextResponse.json({ data, meta: { limit: query.limit, offset: query.offset } });
  } catch {
    return NextResponse.json({ error: "Listing search unavailable" }, { status: 503 });
  }
}
