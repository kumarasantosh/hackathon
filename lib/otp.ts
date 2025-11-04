import { createServiceRoleClient } from "@/lib/supabase/service";

interface OTPData {
  phone: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

// Fallback in-memory store for development (used if DB fails)
const inMemoryStore = new Map<string, OTPData>();

// Clean up expired OTPs from in-memory store every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of inMemoryStore.entries()) {
    if (data.expiresAt < now) {
      inMemoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Normalize phone number for consistent storage and lookup
 * Removes all spaces, hyphens, parentheses, and ensures it starts with +
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Remove all spaces, hyphens, parentheses, and dots
  let normalized = phone.replace(/[\s\-\(\)\.]/g, "");
  // Ensure it starts with +
  if (!normalized.startsWith("+")) {
    // If it doesn't start with +, assume it's an Indian number
    if (normalized.startsWith("0")) {
      normalized = "+91" + normalized.substring(1);
    } else if (normalized.startsWith("91") && normalized.length > 10) {
      normalized = "+" + normalized;
    } else if (normalized.length === 10) {
      normalized = "+91" + normalized;
    } else {
      normalized = "+" + normalized;
    }
  }
  return normalized;
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP for a phone number (using Supabase)
 */
export async function storeOTP(phone: string, otp: string): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  try {
    const supabase = createServiceRoleClient();
    
    // Upsert OTP (delete old one if exists, insert new one)
    const { error } = await supabase
      .from("otp_verifications")
      .upsert({
        phone: normalizedPhone,
        otp: otp,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      }, {
        onConflict: "phone"
      });

    if (error) {
      console.error("Failed to store OTP in database, using in-memory fallback:", error);
      // Fallback to in-memory storage
      inMemoryStore.set(normalizedPhone, {
        phone: normalizedPhone,
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      });
    } else {
      console.log("📝 OTP stored in database for:", normalizedPhone, "OTP:", otp);
    }
  } catch (error) {
    console.error("Error storing OTP, using in-memory fallback:", error);
    // Fallback to in-memory storage
    inMemoryStore.set(normalizedPhone, {
      phone: normalizedPhone,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });
  }
}

/**
 * Verify OTP for a phone number (using Supabase)
 */
export async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  
  try {
    const supabase = createServiceRoleClient();
    
    // Fetch OTP from database
    const { data: stored, error } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone", normalizedPhone)
      .single();

    // Log for debugging
    console.log("🔍 Verifying OTP:", {
      normalizedPhone,
      providedOTP: otp,
      storedOTP: stored?.otp,
      found: !!stored,
      expired: stored ? new Date(stored.expires_at) < new Date() : false,
      attempts: stored?.attempts || 0,
      dbError: error?.message,
    });
    
    if (error || !stored) {
      // Try in-memory fallback
      const inMemory = inMemoryStore.get(normalizedPhone);
      if (inMemory) {
        console.log("📦 Using in-memory OTP fallback");
        return verifyInMemoryOTP(normalizedPhone, otp, inMemory);
      }
      console.log("❌ OTP not found for phone:", normalizedPhone);
      return false;
    }
    
    // Check if expired
    if (new Date(stored.expires_at) < new Date()) {
      await supabase
        .from("otp_verifications")
        .delete()
        .eq("phone", normalizedPhone);
      console.log("❌ OTP expired");
      return false;
    }
    
    // Check attempts
    if (stored.attempts >= 5) {
      await supabase
        .from("otp_verifications")
        .delete()
        .eq("phone", normalizedPhone);
      console.log("❌ Too many attempts");
      return false;
    }
    
    // Compare OTP
    const providedOTP = String(otp).trim();
    const storedOTP = String(stored.otp).trim();
    
    if (storedOTP === providedOTP) {
      // Delete on successful verification
      await supabase
        .from("otp_verifications")
        .delete()
        .eq("phone", normalizedPhone);
      console.log("✅ OTP verified successfully");
      return true;
    } else {
      // Increment attempts
      await supabase
        .from("otp_verifications")
        .update({ attempts: stored.attempts + 1 })
        .eq("phone", normalizedPhone);
      console.log("❌ OTP mismatch:", { storedOTP, providedOTP });
      return false;
    }
  } catch (error) {
    console.error("Error verifying OTP, trying in-memory fallback:", error);
    // Fallback to in-memory storage
    const inMemory = inMemoryStore.get(normalizedPhone);
    if (inMemory) {
      return verifyInMemoryOTP(normalizedPhone, otp, inMemory);
    }
    return false;
  }
}

/**
 * Helper function to verify OTP from in-memory store (fallback)
 */
function verifyInMemoryOTP(phone: string, otp: string, stored: OTPData): boolean {
  if (stored.expiresAt < Date.now()) {
    inMemoryStore.delete(phone);
    return false;
  }
  
  if (stored.attempts >= 5) {
    inMemoryStore.delete(phone);
    return false;
  }
  
  stored.attempts++;
  
  const providedOTP = String(otp).trim();
  const storedOTP = String(stored.otp).trim();
  
  if (storedOTP === providedOTP) {
    inMemoryStore.delete(phone);
    return true;
  }
  
  return false;
}

/**
 * Send OTP via WhatsApp using Twilio WhatsApp API
 */
export async function sendOTPSMS(phone: string, otp: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  // If Twilio is not configured, use mock for development
  if (!accountSid || !authToken || !whatsappFromNumber) {
    console.log("📱 WhatsApp OTP (dev mode):", {
      to: phone,
      otp: otp,
      message: `Your Neighbour Link verification code is: ${otp}. Valid for 10 minutes.`,
    });
    return true; // Return true for dev mode
  }

  try {
    // Format phone number (ensure it starts with country code)
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/^0+/, "")}`;
    
    // Twilio WhatsApp format: whatsapp:+1234567890
    const fromWhatsApp = whatsappFromNumber.startsWith("whatsapp:") 
      ? whatsappFromNumber 
      : `whatsapp:${whatsappFromNumber}`;
    const toWhatsApp = `whatsapp:${formattedPhone}`;

    // WhatsApp message template (you may need to use approved template in production)
    const message = `Your Neighbour Link verification code is: *${otp}*. Valid for 10 minutes.\n\nFor your security, do not share this code with anyone.`;

    console.log("📤 Attempting to send WhatsApp OTP:", {
      from: fromWhatsApp,
      to: toWhatsApp,
      formattedPhone: formattedPhone,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          From: fromWhatsApp,
          To: toWhatsApp,
          Body: message,
        }),
      }
    );

    const responseText = await response.text();
    console.log("📥 Twilio Response Status:", response.status);
    console.log("📥 Twilio Response:", responseText);

    if (!response.ok) {
      let errorMessage = "WhatsApp sending failed";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
        console.error("❌ Twilio WhatsApp Error:", {
          code: errorData.code,
          message: errorData.message,
          more_info: errorData.more_info,
        });
        
        // Common error: User not in sandbox
        if (errorData.code === 63007 || errorMessage.includes("not opted in")) {
          console.error("⚠️ User needs to join Twilio WhatsApp Sandbox first!");
          console.error("📱 Instructions: User must send 'join [sandbox-code]' to", fromWhatsApp);
        }
      } catch (e) {
        console.error("❌ Twilio WhatsApp Error (raw):", responseText);
      }
      
      // Try fallback to SMS if WhatsApp fails
      console.log("🔄 Attempting SMS fallback...");
      return await sendOTPViaSMSEmail(phone, otp, accountSid, authToken, whatsappFromNumber);
    }

    const result = JSON.parse(responseText);
    console.log("✅ WhatsApp OTP sent successfully:", {
      sid: result.sid,
      status: result.status,
      to: result.to,
    });
    return true;
  } catch (error) {
    console.error("WhatsApp sending error:", error);
    // Try fallback to SMS if WhatsApp fails
    try {
      return await sendOTPViaSMSEmail(phone, otp, accountSid!, authToken!, whatsappFromNumber!);
    } catch (fallbackError) {
      console.error("Fallback SMS also failed:", fallbackError);
      return false;
    }
  }
}

/**
 * Fallback: Send OTP via SMS (used when WhatsApp fails)
 */
async function sendOTPViaSMSEmail(phone: string, otp: string, accountSid: string, authToken: string, fromNumber: string): Promise<boolean> {
  try {
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/^0+/, "")}`;
    const smsFrom = fromNumber.replace("whatsapp:", ""); // Remove whatsapp: prefix for SMS

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          From: smsFrom,
          To: formattedPhone,
          Body: `Your Neighbour Link verification code is: ${otp}. Valid for 10 minutes.`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio SMS fallback failed:", error);
      return false;
    }

    console.log("✅ SMS OTP sent as fallback");
    return true;
  } catch (error) {
    console.error("SMS fallback error:", error);
    return false;
  }
}

/**
 * Alternative: Send OTP via AWS SNS (if you prefer AWS)
 */
export async function sendOTPViaSNS(phone: string, otp: string): Promise<boolean> {
  // Implementation for AWS SNS if needed
  // This is an alternative to Twilio
  return false;
}

