"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import Script from "next/script";

interface WalletTopupButtonProps {
  amount: number;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function WalletTopupButton({ amount, onSuccess }: WalletTopupButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create topup transaction
      const response = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed error message
        let errorMessage = data.error || "Failed to create top-up request";
        if (data.details) {
          if (typeof data.details === "string") {
            errorMessage += `: ${data.details}`;
          } else if (data.details.message) {
            errorMessage += `: ${data.details.message}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Check if Razorpay key is available
      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || data.keyId;
      if (!razorpayKeyId) {
        throw new Error("Razorpay key not configured. Please contact support.");
      }

      // Initialize Razorpay
      const options = {
        key: razorpayKeyId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "Neighbour Link",
        description: `Wallet Top-up of ₹${amount}`,
        order_id: data.razorpayOrderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/wallet/verify-topup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transactionId: data.transactionId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok) {
              // Success - refresh and call callback
              router.refresh();
              if (onSuccess) {
                onSuccess();
              }
            } else {
              setError(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
            setError(err.message || "Payment verification failed");
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#1a5f3f",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      if (window.Razorpay) {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        throw new Error("Razorpay SDK not loaded");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate top-up");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          // SDK loaded
        }}
      />
      <div className="space-y-2">
        <Button
          onClick={handleTopup}
          disabled={isLoading}
          className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Top Up ₹{amount.toFixed(2)}
            </>
          )}
        </Button>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    </>
  );
}

