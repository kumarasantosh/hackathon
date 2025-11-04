import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { z } from "zod";

const itemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  category: z.string().min(1),
  location: z.string().min(1),
  type: z.enum(["free", "paid"]),
  amount: z.number().optional(),
  images: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.type === "paid") {
    return data.amount !== undefined && data.amount > 0;
  }
  return true;
});

// GET - Get all user's items
export async function GET(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = await getOrCreateUser(userId);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: items, error } = await serviceClient
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching items:", error);
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error("Fetch items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = itemSchema.parse(body);

    const supabase = await createClient();

    // Get or create user from database
    const { user, error: userError } = await getOrCreateUser(userId);

    if (userError || !user) {
      console.error("User creation/retrieval failed:", userError);
      return NextResponse.json(
        { 
          error: userError || "User not found",
          details: "Please ensure you are signed in and try again. If the issue persists, the user record may need to be created via webhook."
        },
        { status: 404 }
      );
    }

    // Check if user is verified
    if (!user.verified) {
      return NextResponse.json(
        { 
          error: "Account verification required",
          message: "You must verify your phone number before sharing items. Please verify your account in the dashboard.",
          redirect: "/dashboard/verify"
        },
        { status: 403 }
      );
    }

    // Create item using service role to bypass RLS
    // RLS policies can't verify Clerk authentication directly
    let serviceClient;
    try {
      serviceClient = createServiceRoleClient();
    } catch (error: any) {
      console.error("Failed to create service role client:", error.message);
      return NextResponse.json(
        { 
          error: "Server configuration error",
          details: error.message 
        },
        { status: 500 }
      );
    }

    const { data: item, error: itemError } = await serviceClient
      .from("items")
      .insert({
        user_id: user.id,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        location: validatedData.location,
        type: validatedData.type,
        amount: validatedData.type === "paid" ? validatedData.amount : null,
        images: validatedData.images || [],
        status: "available",
      })
      .select()
      .single();

    if (itemError) {
      console.error("Item creation error:", itemError);
      return NextResponse.json(
        { 
          error: "Failed to create item",
          details: itemError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

