import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { z } from "zod";

const updateItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  type: z.enum(["free", "paid"]).optional(),
  amount: z.number().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["available", "rented", "sold"]).optional(),
}).refine((data) => {
  if (data.type === "paid") {
    return data.amount !== undefined && data.amount !== null && data.amount > 0;
  }
  return true;
});

// GET - Get single item (for editing)
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

    const { data: item, error } = await serviceClient
      .from("items")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only access their own items
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Get item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT/PATCH - Update item
export async function PUT(
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
    const body = await request.json();
    const validatedData = updateItemSchema.parse(body);

    const { user } = await getOrCreateUser(userId);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const serviceClient = createServiceRoleClient();

    // First verify the item exists and belongs to the user
    const { data: existingItem, error: fetchError } = await serviceClient
      .from("items")
      .select("id, type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: "Item not found or access denied" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    // Handle amount based on type
    if (validatedData.type !== undefined) {
      if (validatedData.type === "paid") {
        updateData.amount = validatedData.amount || existingItem.amount || null;
      } else {
        updateData.amount = null;
      }
    }

    const { data: item, error: updateError } = await serviceClient
      .from("items")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update item error:", updateError);
      return NextResponse.json(
        { error: "Failed to update item", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Update item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete item
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

    // First verify the item exists and belongs to the user
    const { data: existingItem, error: fetchError } = await serviceClient
      .from("items")
      .select("id, images")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: "Item not found or access denied" },
        { status: 404 }
      );
    }

    // Delete associated images from storage if they exist
    if (existingItem.images && existingItem.images.length > 0) {
      try {
        // Extract file paths from image URLs
        const imagePaths = existingItem.images
          .map((url: string) => {
            // Extract path from Supabase storage URL
            const match = url.match(/item-images\/(.+)/);
            return match ? match[1] : null;
          })
          .filter((path): path is string => path !== null);

        // Delete images from storage
        for (const path of imagePaths) {
          await serviceClient.storage
            .from("item-images")
            .remove([path]);
        }
      } catch (storageError) {
        console.error("Failed to delete images from storage:", storageError);
        // Continue with item deletion even if image deletion fails
      }
    }

    // Delete the item (this will cascade delete related records due to foreign key constraints)
    const { error: deleteError } = await serviceClient
      .from("items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete item error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete item", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

