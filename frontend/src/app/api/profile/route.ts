import { NextResponse } from "next/server";

import { createClerkSupabaseClient, requireClerkUser } from "@/lib/supabase/server";
import { profileUpsertSchema } from "@/lib/validation/profile";

export async function GET() {
  try {
    const session = await requireClerkUser();
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, clerk_user_id, role, display_name, profile_photo_url, contact_phone, permanent_address, age, gender, student_or_employment_status, onboarding_progress, onboarding_completed_at",
      )
      .eq("clerk_user_id", session.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireClerkUser();
    const input = profileUpsertSchema.parse(await request.json());
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          clerk_user_id: session.userId,
          role: input.role,
          display_name: input.displayName,
          profile_photo_url: input.profilePhotoUrl ?? null,
          contact_phone: input.contactPhone ?? null,
          permanent_address: input.permanentAddress ?? null,
          age: input.age ?? null,
          gender: input.gender ?? null,
          student_or_employment_status: input.studentOrEmploymentStatus ?? null,
        },
        { onConflict: "clerk_user_id" },
      )
      .select(
        "id, clerk_user_id, role, display_name, profile_photo_url, contact_phone, permanent_address, age, gender, student_or_employment_status, onboarding_progress, onboarding_completed_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: "Profile save failed" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError || error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Profile save failed" }, { status: 500 });
  }
}
