import { createClerkSupabaseClient, requireClerkUser } from "@/lib/supabase/server";

export async function requireLandlordContext() {
  const session = await requireClerkUser();
  const supabase = await createClerkSupabaseClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("clerk_user_id", session.userId)
    .maybeSingle();

  if (error || !profile || profile.role !== "landlord") {
    throw new Response("Landlord profile required", { status: 403 });
  }

  return { session, supabase, profile };
}
