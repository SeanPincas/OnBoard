import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createGuestSession,
  getGuestSession,
  guestCookieName,
  guestCookieOptions,
  resetGuestSession,
  updateGuestRole,
} from "@/lib/guest-session";

export async function POST() {
  try {
    const result = await createGuestSession();
    const response = NextResponse.json({ data: result.session });
    response.cookies.set(guestCookieName, result.token, guestCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Guest access is unavailable" }, { status: 503 });
  }
}

export async function GET() {
  const token = (await cookies()).get(guestCookieName)?.value;
  if (!token) return NextResponse.json({ data: null });

  try {
    const session = await getGuestSession(token);
    if (!session) {
      const response = NextResponse.json({ data: null });
      response.cookies.delete(guestCookieName);
      return response;
    }
    return NextResponse.json({ data: session });
  } catch {
    return NextResponse.json({ error: "Guest session lookup failed" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const token = (await cookies()).get(guestCookieName)?.value;
  if (!token) return NextResponse.json({ error: "Guest session required" }, { status: 401 });

  try {
    const body = (await request.json()) as { role?: string };
    if (body.role !== "tenant" && body.role !== "landlord") {
      return NextResponse.json({ error: "Invalid Guest role" }, { status: 400 });
    }
    const session = await updateGuestRole(token, body.role);
    if (!session) return NextResponse.json({ error: "Guest session expired" }, { status: 401 });
    return NextResponse.json({ data: session });
  } catch {
    return NextResponse.json({ error: "Guest role update failed" }, { status: 503 });
  }
}

export async function DELETE() {
  const token = (await cookies()).get(guestCookieName)?.value;
  if (!token) return NextResponse.json({ data: null });

  try {
    const session = await resetGuestSession(token);
    if (!session) return NextResponse.json({ error: "Guest session expired" }, { status: 401 });
    return NextResponse.json({ data: session });
  } catch {
    return NextResponse.json({ error: "Guest reset failed" }, { status: 503 });
  }
}
