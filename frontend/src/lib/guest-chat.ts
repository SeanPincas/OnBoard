import type { SupabaseClient } from "@supabase/supabase-js";

import { getGuestContext } from "@/lib/guest-session";

export async function getGuestChatContext(token: string) {
  const context = await getGuestContext(token);
  if (!context) return null;
  return context as {
    supabase: SupabaseClient;
    session: { id: string; active_role: "tenant" | "landlord" };
    actors: Array<{ id: string; role: "tenant" | "landlord"; display_name: string }>;
    actor: { id: string; role: "tenant" | "landlord"; display_name: string };
  };
}

export function guestActorForRole(
  actors: Array<{ id: string; role: "tenant" | "landlord"; display_name: string }>,
  role: "tenant" | "landlord",
) {
  return actors.find((actor) => actor.role === role) ?? null;
}
