import { NextResponse } from "next/server";

import { createClerkSupabaseClient, requireClerkUser } from "@/lib/supabase/server";
import { conversationSchema } from "@/lib/validation/chat";

export async function GET() {
  try {
    await requireClerkUser();
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("id, property_id, room_id, status, created_at, conversation_participants(profile_id, profiles(id, role, display_name))")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Conversation lookup failed" }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Conversation lookup failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireClerkUser();
    const input = conversationSchema.parse(await request.json());
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      p_property_id: input.propertyId,
      p_room_id: input.roomId ?? null,
      p_tenant_profile_id: input.tenantProfileId ?? null,
    });

    if (error) return NextResponse.json({ error: "Conversation creation failed" }, { status: 409 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid conversation data" }, { status: 400 });
    return NextResponse.json({ error: "Conversation creation failed" }, { status: 500 });
  }
}
