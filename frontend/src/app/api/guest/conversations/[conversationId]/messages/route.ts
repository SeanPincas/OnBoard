import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { guestCookieName } from "@/lib/guest-session";
import { getGuestChatContext } from "@/lib/guest-chat";
import { chatQuerySchema, messageSchema } from "@/lib/validation/chat";

type RouteContext = { params: Promise<{ conversationId: string }> };

async function contextFromCookie() {
  const token = (await cookies()).get(guestCookieName)?.value;
  return token ? getGuestChatContext(token) : null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const guest = await contextFromCookie();
    if (!guest) return NextResponse.json({ error: "Guest session required" }, { status: 401 });
    const conversationId = (await context.params).conversationId;
    const query = chatQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const { data: participant } = await guest.supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", guest.actor.id)
      .maybeSingle();
    if (!participant) return NextResponse.json({ error: "Guest conversation access required" }, { status: 403 });

    let builder = guest.supabase
      .from("messages")
      .select("id, conversation_id, sender_profile_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(query.limit);
    if (query.before) builder = builder.lt("created_at", query.before);
    const { data, error } = await builder;
    if (error) return NextResponse.json({ error: "Guest message lookup failed" }, { status: 500 });
    return NextResponse.json({ data: data?.reverse() ?? [] });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid message query" }, { status: 400 });
    return NextResponse.json({ error: "Guest message lookup failed" }, { status: 503 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const guest = await contextFromCookie();
    if (!guest) return NextResponse.json({ error: "Guest session required" }, { status: 401 });
    const conversationId = (await context.params).conversationId;
    const input = messageSchema.parse(await request.json());
    const { data: participant } = await guest.supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", guest.actor.id)
      .maybeSingle();
    if (!participant) return NextResponse.json({ error: "Guest conversation access required" }, { status: 403 });

    const { data, error } = await guest.supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_profile_id: guest.actor.id, body: input.body })
      .select("id, conversation_id, sender_profile_id, body, created_at")
      .single();
    if (error) return NextResponse.json({ error: "Guest message could not be sent" }, { status: 409 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid message data" }, { status: 400 });
    return NextResponse.json({ error: "Guest message could not be sent" }, { status: 503 });
  }
}
