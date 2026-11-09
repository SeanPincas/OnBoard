import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/lib/env";

export async function createClerkSupabaseClient() {
  const environment = getPublicEnvironment();
  const { getToken } = await auth();

  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      accessToken: async () => getToken(),
    },
  );
}

export async function requireClerkUser() {
  const session = await auth();

  if (!session.userId) {
    throw new Response("Authentication required", { status: 401 });
  }

  return session;
}
