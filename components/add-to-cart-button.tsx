"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface AddToCartButtonProps {
  itemId: string;
}

export function AddToCartButton({ itemId }: AddToCartButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      // Create order
      const response = await fetch("/api/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Create order API error:", data);
        throw new Error(data.error || data.details || "Failed to create order");
      }

      // Initialize Razorpay checkout
      if (window.Razorpay) {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Neighbour Link",
          description: "Item purchase",
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
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
                }),
              });

              if (!verifyResponse.ok) {
                console.error("Payment verification failed");
                // Still redirect even if verification fails - webhook will handle it
              }
            } catch (error) {
              console.error("Error verifying payment:", error);
              // Still redirect - webhook will handle the update
            }

            // Redirect to order page
            router.push(`/orders/${data.orderId}?payment_id=${response.razorpay_payment_id}`);
          },
          prefill: {
            // You can add user email/phone here from Clerk
          },
          theme: {
            color: "#3399cc",
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        razorpay.on("payment.failed", function (response: any) {
          alert("Payment failed. Please try again.");
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to initiate checkout. Please try again.");
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
      <Button
        className="w-full"
        size="lg"
        onClick={handleCheckout}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Checkout with Razorpay"
        )}
      </Button>
    </>
  );
}

