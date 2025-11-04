"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Script from "next/script";
import { PaymentLoading } from "@/components/payment-loading";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PayRequestButtonProps {
  requestId: string;
  itemId: string;
  amount: number;
}

export function PayRequestButton({ requestId, itemId, amount }: PayRequestButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentLoading, setShowPaymentLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // Create order for this request
      const response = await fetch("/api/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, requestId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Create order API error:", data);
        const errorMessage = data.error || data.details || "Failed to create order";
        console.error("Full error details:", {
          status: response.status,
          error: data.error,
          details: data.details,
          fullData: data
        });
        throw new Error(errorMessage);
      }

      // Initialize Razorpay checkout
      if (window.Razorpay) {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Neighbour Link",
          description: "Payment for approved request",
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
            // Show loading screen immediately after Razorpay popup closes
            setOrderId(data.orderId);
            setShowPaymentLoading(true);
            
            // Store in sessionStorage to persist across navigation
            sessionStorage.setItem("paymentProcessing", "true");
            sessionStorage.setItem("processingOrderId", data.orderId);

            // Payment successful - verify and update order immediately
            try {
              const verifyResponse = await fetch("/api/verifyPayment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: data.orderId,
                  razorpayOrderId: data.razorpayOrderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  requestId: requestId, // Pass request ID to update request status
                }),
              });

              if (!verifyResponse.ok) {
                console.error("Payment verification failed");
                // Still redirect - webhook will handle it
              }
            } catch (error) {
              console.error("Error verifying payment:", error);
              // Still redirect - webhook will handle the update
            }

            // Small delay to ensure loading screen is visible before navigation
            setTimeout(() => {
              // Redirect to order page (loading will continue there)
              router.push(`/orders/${data.orderId}?payment_id=${response.razorpay_payment_id}`);
            }, 100);
          },
          theme: {
            color: "#3399cc",
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        
        // Handle when Razorpay popup closes (regardless of payment result)
        razorpay.on("payment.failed", function (response: any) {
          // If payment failed, don't show loading
          alert("Payment failed. Please try again.");
        });
        
        // Also handle modal close event to show loading if payment was successful
        razorpay.on("close", function () {
          // Only show loading if we don't already have orderId set (payment handler wasn't called)
          // If handler was called, orderId will be set and loading already shown
          if (!orderId && !showPaymentLoading) {
            // Payment might have been completed but handler not called yet
            // This is a fallback, though handler should normally be called first
          }
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => console.log("Razorpay script loaded")}
      />
      {showPaymentLoading && orderId && (
        <PaymentLoading orderId={orderId} />
      )}
      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ₹${(amount * 1.1).toFixed(2)}`
        )}
      </Button>
    </>
  );
}

