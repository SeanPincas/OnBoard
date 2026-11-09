import { NextResponse } from "next/server";

import { requireLandlordContext } from "@/lib/supabase/landlord";
import { roomInputSchema } from "@/lib/validation/inventory";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supabase, profile } = await requireLandlordContext();
    const { propertyId } = await context.params;
    const { data, error } = await supabase
      .from("rooms")
      .select("id, property_id, room_number, title, description, room_type, rental_basis, monthly_rent, security_deposit, advance_payment, utility_fee, capacity, furnished, bathroom_type, available_from, publication_status, created_at, updated_at, properties!inner(landlord_profile_id)")
      .eq("property_id", propertyId)
      .eq("properties.landlord_profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Room lookup failed" }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Room lookup failed" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { supabase, profile } = await requireLandlordContext();
    const { propertyId } = await context.params;
    const input = roomInputSchema.parse(await request.json());
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("landlord_profile_id", profile.id)
      .maybeSingle();

    if (propertyError || !property) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        property_id: propertyId,
        title: input.title,
        description: input.description ?? null,
        room_number: input.roomNumber ?? null,
        room_type: input.roomType,
        rental_basis: input.rentalBasis,
        monthly_rent: input.monthlyRent,
        security_deposit: input.securityDeposit,
        advance_payment: input.advancePayment,
        utility_fee: input.utilityFee,
        capacity: input.capacity,
        furnished: input.furnished,
        bathroom_type: input.bathroomType,
        available_from: input.availableFrom ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Room creation failed" }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid room data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Room creation failed" }, { status: 500 });
  }
}
