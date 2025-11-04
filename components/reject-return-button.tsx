"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { XCircle, Loader2 } from "lucide-react";

interface RejectReturnButtonProps {
  orderId: string;
  itemTitle: string;
  onSuccess?: () => void;
}

export function RejectReturnButton({ orderId, itemTitle, onSuccess }: RejectReturnButtonProps) {
  const router = useRouter();
  const [isRejecting, setIsRejecting] = useState(false);

  const handleRejectReturn = async () => {
    if (!confirm(`Are you sure you want to reject the return request for "${itemTitle}"? This will mark the return as rejected.`)) {
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/reject-return`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Return request rejected successfully.");
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        alert(data.error || data.message || "Failed to reject return");
      }
    } catch (error: any) {
      alert("An error occurred. Please try again.");
      console.error("Error rejecting return:", error);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Button
      onClick={handleRejectReturn}
      disabled={isRejecting}
      variant="destructive"
      className="w-full"
    >
      {isRejecting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Rejecting...
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 mr-2" />
          Reject Return
        </>
      )}
    </Button>
  );
}

