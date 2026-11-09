import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { guestCookieName } from "@/lib/guest-session";
import { getGuestChatContext, guestActorForRole } from "@/lib/guest-chat";
import { conversationSchema } from "@/lib/validation/chat";

async function contextFromCookie() {
  const token = (await cookies()).get(guestCookieName)?.value;
  return token ? getGuestChatContext(token) : null;
}

export async function GET() {
  try {
    const context = await contextFromCookie();
    if (!context) return NextResponse.json({ error: "Guest session required" }, { status: 401 });

    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, property_id, room_id, status, created_at, conversation_participants(profile_id, profiles(id, role, display_name))")
      .eq("conversation_participants.profile_id", context.actor.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Guest conversation lookup failed" }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Guest conversation lookup failed" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await contextFromCookie();
    if (!context) return NextResponse.json({ error: "Guest session required" }, { status: 401 });
    const input = conversationSchema.parse(await request.json());
    const { data: property, error: propertyError } = await context.supabase
      .from("properties")
      .select("id, landlord_profile_id, publication_status")
      .eq("id", input.propertyId)
      .maybeSingle();

    if (propertyError || !property || property.publication_status !== "published") {
      return NextResponse.json({ error: "Published property required" }, { status: 409 });
    }

    const tenant = context.actor.role === "tenant"
      ? context.actor
      : guestActorForRole(context.actors, "tenant");
    if (!tenant) return NextResponse.json({ error: "Guest tenant unavailable" }, { status: 409 });
    if (context.actor.role === "landlord" && property.landlord_profile_id !== context.actor.id) {
      return NextResponse.json({ error: "Guest landlord does not own this property" }, { status: 403 });
    }

    const { data: existing } = await context.supabase
      .from("conversations")
      .select("id, property_id, room_id, status, created_at")
      .eq("property_id", input.propertyId)
      .eq("room_id", input.roomId ?? null)
      .eq("status", "open")
      .maybeSingle();

    if (existing) return NextResponse.json({ data: existing });

    const { data: conversation, error: conversationError } = await context.supabase
      .from("conversations")
      .insert({ property_id: input.propertyId, room_id: input.roomId ?? null })
      .select("id, property_id, room_id, status, created_at")
      .single();
    if (conversationError || !conversation) return NextResponse.json({ error: "Guest conversation creation failed" }, { status: 409 });

    const participants = [tenant.id, property.landlord_profile_id];
    const { error: participantError } = await context.supabase
      .from("conversation_participants")
      .insert([...new Set(participants)].map((profileId) => ({ conversation_id: conversation.id, profile_id: profileId })));
    if (participantError) return NextResponse.json({ error: "Guest conversation participants failed" }, { status: 409 });
    return NextResponse.json({ data: conversation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid conversation data" }, { status: 400 });
    return NextResponse.json({ error: "Guest conversation creation failed" }, { status: 503 });
  }
}
