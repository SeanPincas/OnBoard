import { NextResponse } from "next/server";

import { createClerkSupabaseClient, requireClerkUser } from "@/lib/supabase/server";
import { onboardingUpdateSchema } from "@/lib/validation/profile";

export async function GET() {
  try {
    const session = await requireClerkUser();
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_progress, onboarding_completed_at")
      .eq("clerk_user_id", session.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Onboarding lookup failed" }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? { onboarding_progress: {}, onboarding_completed_at: null },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Onboarding lookup failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireClerkUser();
    const input = onboardingUpdateSchema.parse(await request.json());
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        onboarding_progress: input.progress,
        onboarding_completed_at: input.completed ? new Date().toISOString() : null,
      })
      .eq("clerk_user_id", session.userId)
      .select("onboarding_progress, onboarding_completed_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Onboarding save failed" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid onboarding data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Onboarding save failed" }, { status: 500 });
  }
}
