import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/user-helpers";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { verifyOTP } from "@/lib/otp";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 }
      );
    }

    // Verify OTP (normalize phone number)
    const isValid = await verifyOTP(phone.trim(), otp.trim());

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Update user: set verified to true and save phone number
    const serviceClient = createServiceRoleClient();
    
    // First, try to update with phone number (if column exists)
    let updateData: any = {
      verified: true,
      updated_at: new Date().toISOString(),
    };

    // Try to add phone number (might need migration)
    try {
      // Check if phone column exists by attempting update
      const { error: updateError } = await serviceClient
        .from("users")
        .update({ ...updateData, phone: phone })
        .eq("id", user.id);

      if (updateError && updateError.message?.includes("phone")) {
        // Phone column doesn't exist, just update verified status
        await serviceClient
          .from("users")
          .update(updateData)
          .eq("id", user.id);
      }
    } catch (error) {
      // Fallback: just update verified status
      await serviceClient
        .from("users")
        .update(updateData)
        .eq("id", user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

