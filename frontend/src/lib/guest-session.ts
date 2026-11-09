import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/lib/env";

export const guestCookieName = "onboard_guest_session";
const guestSessionLifetimeMs = 1000 * 60 * 60 * 24;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createGuestAdminClient() {
  const environment = getPublicEnvironment();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required for Guest sessions");
  }

  return createClient(environment.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getGuestContext(token: string) {
  const supabase = createGuestAdminClient();
  const tokenHash = hashSessionToken(token);
  const { data: session, error: sessionError } = await supabase
    .from("guest_sessions")
    .select("id, active_role, expires_at, reset_at")
    .eq("session_token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError || !session) return null;

  const { data: actors, error: actorError } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("guest_session_id", session.id);

  if (actorError) throw new Error("Guest actors lookup failed");
  const actor = actors?.find((candidate) => candidate.role === session.active_role);
  if (!actor) return null;

  await supabase
    .from("guest_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  return { supabase, session, actors: actors ?? [], actor };
}

export function guestCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: guestSessionLifetimeMs / 1000,
  };
}

export async function createGuestSession() {
  const supabase = createGuestAdminClient();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + guestSessionLifetimeMs).toISOString();

  const { data: session, error: sessionError } = await supabase
    .from("guest_sessions")
    .insert({
      session_token_hash: hashSessionToken(token),
      expires_at: expiresAt,
    })
    .select("id, active_role, expires_at, reset_at")
    .single();

  if (sessionError || !session) {
    throw new Error("Guest session creation failed");
  }

  const { data: actors, error: actorError } = await supabase
    .from("profiles")
    .insert([
      {
        guest_session_id: session.id,
        role: "tenant",
        display_name: "Demo Tenant",
        student_or_employment_status: "student",
      },
      {
        guest_session_id: session.id,
        role: "landlord",
        display_name: "Demo Landlord",
      },
    ])
    .select("id, role, display_name, onboarding_progress, onboarding_completed_at");

  if (actorError || !actors) {
    await supabase.from("guest_sessions").delete().eq("id", session.id);
    throw new Error("Guest actor creation failed");
  }

  return { token, session, actors };
}

export async function getGuestSession(token: string) {
  const supabase = createGuestAdminClient();
  const tokenHash = hashSessionToken(token);
  const { data: session, error } = await supabase
    .from("guest_sessions")
    .select("id, active_role, expires_at, reset_at")
    .eq("session_token_hash", tokenHash)
    .maybeSingle();

  if (error || !session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  await supabase
    .from("guest_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  const { data: actors, error: actorError } = await supabase
    .from("profiles")
    .select("id, role, display_name, onboarding_progress, onboarding_completed_at")
    .eq("guest_session_id", session.id);

  if (actorError) {
    throw new Error("Guest actors lookup failed");
  }

  return { session, actors };
}

export async function updateGuestRole(token: string, role: "tenant" | "landlord") {
  const supabase = createGuestAdminClient();
  const tokenHash = hashSessionToken(token);
  const { data, error } = await supabase
    .from("guest_sessions")
    .update({ active_role: role, last_seen_at: new Date().toISOString() })
    .eq("session_token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .select("id, active_role, expires_at, reset_at")
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function resetGuestSession(token: string) {
  const supabase = createGuestAdminClient();
  const tokenHash = hashSessionToken(token);
  const { data, error } = await supabase
    .from("guest_sessions")
    .update({ reset_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
    .eq("session_token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .select("id, active_role, expires_at, reset_at")
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
