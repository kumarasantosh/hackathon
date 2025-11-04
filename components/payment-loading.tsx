"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface PaymentLoadingProps {
  orderId: string;
}

export function PaymentLoading({ orderId }: PaymentLoadingProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending");
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    // Don't start polling if orderId is invalid
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      setError("Invalid order ID");
      setIsPolling(false);
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;

    const pollOrderStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        
        if (!response.ok) {
          // If 401, might be auth issue - continue polling as it might resolve
          if (response.status === 401 || response.status === 403) {
            console.warn("Authentication issue while polling order status");
            return;
          }
          
          // If 404, order might not exist yet - continue polling
          if (response.status === 404) {
            console.warn("Order not found yet, continuing to poll");
            return;
          }
          
          throw new Error(`Failed to fetch order status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !data.order) {
          console.warn("Invalid response format, continuing to poll");
          return;
        }

        const orderStatus = data.order.status;

        if (orderStatus === "completed" || orderStatus === "failed") {
          setStatus(orderStatus);
          setIsPolling(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
          
          // Hide loading screen and refresh the page after showing success/failure message
          setTimeout(() => {
            setShouldHide(true);
            setTimeout(() => {
              router.refresh();
            }, 300);
          }, 2000);
        }
      } catch (err) {
        // Don't set error on every failed request - only after timeout or multiple failures
        console.error("Error polling order status:", err);
        
        // Only show error if we've been polling for a while
        // Otherwise, just log and continue
      }
    };

    // Start polling immediately
    pollOrderStatus();

    // Poll every 2 seconds
    pollInterval = setInterval(pollOrderStatus, 2000);

    // Timeout after 60 seconds
    timeoutTimer = setTimeout(() => {
      setIsPolling(false);
      clearInterval(pollInterval);
      setError("Payment verification is taking longer than expected. Please refresh the page.");
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutTimer);
    };
  }, [orderId, router]);

  if (shouldHide) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {isPolling && status === "pending" ? (
            <>
              <div className="relative">
                <Loader2 className="w-16 h-16 text-[#1a5f3f] animate-spin" />
                <div className="absolute inset-0 rounded-full border-4 border-[#1a5f3f]/20"></div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Processing Payment</h2>
                <p className="text-gray-600">Please wait while we verify your payment...</p>
                <div className="flex items-center justify-center space-x-2 pt-2">
                  <div className="w-2 h-2 bg-[#1a5f3f] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-[#1a5f3f] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-[#1a5f3f] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </>
          ) : status === "completed" ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                <p className="text-gray-600">Your payment has been processed successfully.</p>
              </div>
            </>
          ) : status === "failed" ? (
            <>
              <XCircle className="w-16 h-16 text-red-600" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
                <p className="text-gray-600">Your payment could not be processed. Please try again.</p>
              </div>
            </>
          ) : error ? (
            <>
              <XCircle className="w-16 h-16 text-amber-600" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Verification Timeout</h2>
                <p className="text-gray-600">{error}</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

