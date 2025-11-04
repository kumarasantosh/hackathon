"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PaymentLoading } from "./payment-loading";

export function PaymentStatusCheck() {
  const pathname = usePathname();
  const [shouldShow, setShouldShow] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're on an order page and payment is processing
    if (pathname?.startsWith("/orders/")) {
      const isProcessing = sessionStorage.getItem("paymentProcessing") === "true";
      const storedOrderId = sessionStorage.getItem("processingOrderId");
      
      if (isProcessing && storedOrderId) {
        // Extract order ID from path
        const pathOrderId = pathname.split("/orders/")[1]?.split("?")[0];
        
        if (pathOrderId === storedOrderId) {
          setOrderId(pathOrderId);
          setShouldShow(true);
        }
      }
    }
  }, [pathname]);

  // Clear sessionStorage when payment status is finalized
  useEffect(() => {
    if (orderId && shouldShow) {
      const checkStatus = async () => {
        try {
          if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
            return;
          }

          const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
          if (response.ok) {
            const data = await response.json();
            const status = data.order?.status;
            
            if (status === "completed" || status === "failed") {
              // Clear session storage when status is finalized
              sessionStorage.removeItem("paymentProcessing");
              sessionStorage.removeItem("processingOrderId");
            }
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
          // Continue checking - don't throw
        }
      };

      // Check status periodically
      const interval = setInterval(checkStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [orderId, shouldShow]);

  if (!shouldShow || !orderId) return null;

  return <PaymentLoading orderId={orderId} />;
}

