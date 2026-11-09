import { NextResponse } from "next/server";

import { createClerkSupabaseClient, requireClerkUser } from "@/lib/supabase/server";
import { reservationActionSchema } from "@/lib/validation/reservations";

type RouteContext = { params: Promise<{ reservationId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireClerkUser();
    const { reservationId } = await context.params;
    const input = reservationActionSchema.parse(await request.json());
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase.rpc("review_reservation_request", {
      p_reservation_id: reservationId,
      p_action: input.action,
    });

    if (error) return NextResponse.json({ error: "Reservation action failed" }, { status: 409 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid reservation action" }, { status: 400 });
    return NextResponse.json({ error: "Reservation action failed" }, { status: 500 });
  }
}
