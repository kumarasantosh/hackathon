import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { z } from "zod";

// GET - Get single service request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { user } = await getOrCreateUser(userId);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const serviceClient = createServiceRoleClient();

    // Get service request with dates
    const { data: service, error } = await serviceClient
      .from("service_requests")
      .select(`
        *,
        service_request_dates(service_date)
      `)
      .eq("id", id)
      .single();

    if (error || !service) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
    }

    // Verify user owns the service (or allow if viewing publicly)
    if (service.user_id !== user.id) {
      // Allow viewing but not editing
      return NextResponse.json({ service });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Get service request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateServiceRequestSchema = z.object({
  service_name: z.string().min(1, "Service name is required").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  location: z.string().min(1, "Location is required").optional(),
  type: z.enum(["free", "paid"]).optional(),
  amount: z.number().optional(),
  is_urgent: z.boolean().optional(),
  service_dates: z.array(z.string()).min(1, "At least one date is required").optional(),
  people_needed: z.number().int().min(1, "At least 1 person is required").optional(),
}).refine((data) => {
  if (data.type === "paid") {
    return data.amount !== undefined && data.amount > 0;
  }
  return true;
}, {
  message: "Amount is required for paid services",
  path: ["amount"],
});

// PATCH - Update service request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { user } = await getOrCreateUser(userId);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateServiceRequestSchema.parse(body);

    const serviceClient = createServiceRoleClient();

    // Verify the service request exists and belongs to the user
    const { data: existingService, error: fetchError } = await serviceClient
      .from("service_requests")
      .select("id, user_id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingService) {
      return NextResponse.json(
        { error: "Service request not found or access denied" },
        { status: 404 }
      );
    }

    // Don't allow updating completed or cancelled services
    if (existingService.status === "completed" || existingService.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot update completed or cancelled services" },
        { status: 400 }
      );
    }

    // Prepare update data (only include fields that were provided)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.service_name !== undefined) {
      updateData.service_name = validatedData.service_name;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.location !== undefined) {
      updateData.location = validatedData.location;
    }
    if (validatedData.type !== undefined) {
      updateData.type = validatedData.type;
    }
    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.type === "paid" ? validatedData.amount : null;
    }
    if (validatedData.is_urgent !== undefined) {
      updateData.is_urgent = validatedData.is_urgent;
    }
    if (validatedData.people_needed !== undefined) {
      updateData.people_needed = validatedData.people_needed;
    }

    // Update service request
    const { data: updatedService, error: updateError } = await serviceClient
      .from("service_requests")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update service request error:", updateError);
      return NextResponse.json(
        { error: "Failed to update service request", details: updateError.message },
        { status: 500 }
      );
    }

    // Update service dates if provided
    if (validatedData.service_dates && validatedData.service_dates.length > 0) {
      // Delete existing dates
      await serviceClient
        .from("service_request_dates")
        .delete()
        .eq("service_request_id", id);

      // Insert new dates
      const dateRecords = validatedData.service_dates.map((dateStr) => ({
        service_request_id: id,
        service_date: dateStr,
      }));

      await serviceClient
        .from("service_request_dates")
        .insert(dateRecords);
    }

    return NextResponse.json({
      success: true,
      service: updatedService,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Update service request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete service request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { user } = await getOrCreateUser(userId);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const serviceClient = createServiceRoleClient();

    // Verify the service request exists and belongs to the user
    const { data: existingService, error: fetchError } = await serviceClient
      .from("service_requests")
      .select("id, user_id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingService) {
      return NextResponse.json(
        { error: "Service request not found or access denied" },
        { status: 404 }
      );
    }

    // Don't allow deleting services with accepted offers (unless completed/cancelled)
    if (existingService.status === "in_progress" || existingService.status === "open") {
      // Check if there are any accepted offers
      const { data: acceptedOffers } = await serviceClient
        .from("service_offers")
        .select("id")
        .eq("service_request_id", id)
        .eq("status", "accepted");

      if (acceptedOffers && acceptedOffers.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete service with accepted offers. Please cancel or complete the service first." },
          { status: 400 }
        );
      }
    }

    // Delete service dates (cascade should handle this, but doing it explicitly)
    await serviceClient
      .from("service_request_dates")
      .delete()
      .eq("service_request_id", id);

    // Delete service offers (cascade should handle this)
    await serviceClient
      .from("service_offers")
      .delete()
      .eq("service_request_id", id);

    // Delete the service request
    const { error: deleteError } = await serviceClient
      .from("service_requests")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete service request error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete service request", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete service request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

