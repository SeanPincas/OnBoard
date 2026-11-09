import { NextResponse } from "next/server";

import { createClerkSupabaseClient, requireClerkUser } from "@/lib/supabase/server";
import { chatQuerySchema, messageSchema } from "@/lib/validation/chat";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireClerkUser();
    const conversationId = (await context.params).conversationId;
    const query = chatQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const supabase = await createClerkSupabaseClient();
    let builder = supabase
      .from("messages")
      .select("id, conversation_id, sender_profile_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(query.limit);
    if (query.before) builder = builder.lt("created_at", query.before);
    const { data, error } = await builder;

    if (error) return NextResponse.json({ error: "Message lookup failed" }, { status: 500 });
    return NextResponse.json({ data: data?.reverse() ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid message query" }, { status: 400 });
    return NextResponse.json({ error: "Message lookup failed" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireClerkUser();
    const conversationId = (await context.params).conversationId;
    const input = messageSchema.parse(await request.json());
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase.rpc("send_message", {
      p_conversation_id: conversationId,
      p_body: input.body,
    });

    if (error) return NextResponse.json({ error: "Message could not be sent" }, { status: 403 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid message data" }, { status: 400 });
    return NextResponse.json({ error: "Message could not be sent" }, { status: 500 });
  }
}
