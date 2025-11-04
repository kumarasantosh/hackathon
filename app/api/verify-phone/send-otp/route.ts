import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/user-helpers";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { generateOTP, storeOTP, sendOTPSMS } from "@/lib/otp";

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
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Generate and store OTP (normalize phone number)
    const otp = generateOTP();
    await storeOTP(phone.trim(), otp);

    // Send OTP via WhatsApp (with SMS fallback)
    console.log("🚀 Starting OTP send process for phone:", phone);
    const sent = await sendOTPSMS(phone, otp);

    if (!sent) {
      console.error("❌ Failed to send OTP via both WhatsApp and SMS");
      return NextResponse.json(
        { 
          error: "Failed to send OTP. Please check your phone number and try again.",
          details: process.env.NODE_ENV === "development" 
            ? "Check server logs for details. If using Twilio WhatsApp sandbox, ensure the recipient has joined the sandbox first." 
            : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully via WhatsApp",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

