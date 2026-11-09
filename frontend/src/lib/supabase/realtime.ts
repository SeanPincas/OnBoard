"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/lib/env";

export type ChatMessageEvent = {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
};

export type ChatPresenceEvent = {
  userId: string;
  typing: boolean;
};

export function createRealtimeChatClient(getToken: () => Promise<string | null>) {
  const environment = getPublicEnvironment();
  return createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    accessToken: getToken,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function subscribeToConversation(
  client: SupabaseClient,
  conversationId: string,
  handlers: {
    onMessage: (message: ChatMessageEvent) => void;
    onPresence: (presence: Record<string, ChatPresenceEvent[]>) => void;
  },
) {
  const channel = client
    .channel(`conversation:${conversationId}`, { config: { private: true } })
    .on("broadcast", { event: "message" }, ({ payload }) => {
      handlers.onMessage(payload as ChatMessageEvent);
    })
    .on("presence", { event: "sync" }, () => {
      handlers.onPresence(channel.presenceState() as Record<string, ChatPresenceEvent[]>);
    });

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") resolve();
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        reject(error ?? new Error(`Conversation channel subscription failed: ${status}`));
      }
    });
  });
  return channel;
}

export async function broadcastChatMessage(channel: RealtimeChannel, message: ChatMessageEvent) {
  await channel.send({ type: "broadcast", event: "message", payload: message });
}

export async function updateChatPresence(channel: RealtimeChannel, presence: ChatPresenceEvent) {
  await channel.track(presence);
}
