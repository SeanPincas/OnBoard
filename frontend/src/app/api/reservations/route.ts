import { NextResponse } from "next/server";

import { createClerkSupabaseClient, requireClerkUser } from "@/lib/supabase/server";
import { reservationRequestSchema } from "@/lib/validation/reservations";

export async function GET() {
  try {
    await requireClerkUser();
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("reservation_requests")
      .select("id, property_id, room_id, bed_space_id, requested_occupants, intended_move_in, agreed_monthly_rent, message, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Reservation lookup failed" }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Reservation lookup failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireClerkUser();
    const input = reservationRequestSchema.parse(await request.json());
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase.rpc("create_reservation_request", {
      p_property_id: input.propertyId,
      p_room_id: input.roomId,
      p_bed_space_id: input.bedSpaceId ?? null,
      p_requested_occupants: input.requestedOccupants,
      p_intended_move_in: input.intendedMoveIn,
      p_message: input.message ?? null,
    });

    if (error) return NextResponse.json({ error: "Reservation request failed" }, { status: 409 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid reservation data" }, { status: 400 });
    return NextResponse.json({ error: "Reservation request failed" }, { status: 500 });
  }
}
