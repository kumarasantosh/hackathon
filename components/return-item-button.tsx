"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Package, Loader2 } from "lucide-react";

interface ReturnItemButtonProps {
  orderId: string;
  onSuccess?: () => void;
}

export function ReturnItemButton({ orderId, onSuccess }: ReturnItemButtonProps) {
  const router = useRouter();
  const [isReturning, setIsReturning] = useState(false);

  const handleReturnItem = async () => {
    if (!confirm("Are you sure you want to return this item? The owner will be notified to approve the return and refund your security deposit.")) {
      return;
    }

    setIsReturning(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/return`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Return request submitted successfully!");
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        alert(data.error || data.message || "Failed to submit return request");
      }
    } catch (error: any) {
      alert("An error occurred. Please try again.");
      console.error("Error returning item:", error);
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <Button
      onClick={handleReturnItem}
      disabled={isReturning}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isReturning ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          <Package className="w-4 h-4 mr-2" />
          Return Item
        </>
      )}
    </Button>
  );
}

