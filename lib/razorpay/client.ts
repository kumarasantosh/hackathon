import Razorpay from "razorpay";

// Check if Razorpay credentials are available and create instance
function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// Export for backward compatibility - create instance lazily to avoid errors at module load
let razorpayInstance: Razorpay | null = null;

export const razorpay = new Proxy({} as Razorpay, {
  get(target, prop) {
    if (!razorpayInstance) {
      razorpayInstance = getRazorpayInstance();
    }
    return (razorpayInstance as any)[prop];
  }
});

export interface RazorpayOrderOptions {
  amount: number; // in paise (₹100 = 10000 paise)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(
  options: RazorpayOrderOptions
): Promise<{ id: string; amount: number; currency: string }> {
  // Validate amount
  if (!options.amount || options.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  // Validate minimum amount (Razorpay requires minimum ₹1 = 100 paise)
  if (options.amount < 100) {
    throw new Error("Amount must be at least ₹1 (100 paise)");
  }

  const orderOptions = {
    amount: options.amount,
    currency: options.currency || "INR",
    receipt: options.receipt || `receipt_${Date.now()}`,
    notes: options.notes || {},
  };

  try {
    const razorpayInstance = getRazorpayInstance();
    const order = await razorpayInstance.orders.create(orderOptions);
    
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error);
    
    // Provide more detailed error messages
    if (error.error) {
      // Razorpay API error
      const errorDescription = error.error.description || error.error.reason || "Unknown error";
      const errorCode = error.error.code || "UNKNOWN";
      throw new Error(
        `Razorpay error (${errorCode}): ${errorDescription}`
      );
    }
    
    if (error.message) {
      // Re-throw if it's already our custom error
      throw error;
    }
    
    // Generic error
    throw new Error(`Failed to create payment order: ${error.message || "Unknown error"}`);
  }
}

export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<boolean> {
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const generatedSignature = hmac.digest("hex");
  return generatedSignature === razorpaySignature;
}

