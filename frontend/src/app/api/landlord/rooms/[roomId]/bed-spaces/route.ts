import { NextResponse } from "next/server";

import { requireLandlordContext } from "@/lib/supabase/landlord";
import { bedSpaceInputSchema } from "@/lib/validation/inventory";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { supabase, profile } = await requireLandlordContext();
    const { roomId } = await context.params;
    const input = bedSpaceInputSchema.parse(await request.json());
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, properties!inner(landlord_profile_id)")
      .eq("id", roomId)
      .eq("properties.landlord_profile_id", profile.id)
      .maybeSingle();

    if (roomError || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    const { data, error } = await supabase
      .from("bed_spaces")
      .insert({ room_id: roomId, label: input.label, monthly_rent: input.monthlyRent })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Bed-space creation failed" }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid bed-space data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Bed-space creation failed" }, { status: 500 });
  }
}
