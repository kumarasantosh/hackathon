"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

interface MarkServiceCompletedButtonByServiceIdProps {
  serviceId: string;
  onSuccess?: () => void;
}

export function MarkServiceCompletedButtonByServiceId({ serviceId, onSuccess }: MarkServiceCompletedButtonByServiceIdProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleMarkAsCompleted = async () => {
    if (!confirm("Are you sure you want to mark this service as completed?")) {
      return;
    }

    setIsCompleting(true);
    try {
      const response = await fetch(`/api/service-requests/${serviceId}/complete`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Service marked as completed successfully!");
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Handle insufficient balance
        if (data.requiredAmount && response.status === 402) {
          const insufficientAmount = data.requiredAmount - data.currentBalance;
          alert(`Insufficient balance to pay volunteers. Required: ₹${data.requiredAmount.toFixed(2)}, Available: ₹${data.currentBalance.toFixed(2)}. Please top up ₹${insufficientAmount.toFixed(2)} first.`);
        } else {
          alert(data.error || data.message || "Failed to mark service as completed");
        }
      }
    } catch (error: any) {
      alert("An error occurred. Please try again.");
      console.error("Error marking service as completed:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Button
      onClick={handleMarkAsCompleted}
      disabled={isCompleting}
      className="w-full bg-green-600 hover:bg-green-700 text-white"
    >
      {isCompleting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Completing...
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark Service as Completed
        </>
      )}
    </Button>
  );
}

