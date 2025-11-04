"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, IndianRupee } from "lucide-react";

interface ApproveReturnButtonProps {
  orderId: string;
  itemTitle: string;
  refundAmount: number;
  onSuccess?: () => void;
}

export function ApproveReturnButton({ orderId, itemTitle, refundAmount, onSuccess }: ApproveReturnButtonProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);

  const handleApproveReturn = async () => {
    if (!confirm(`Are you sure you want to approve the return of "${itemTitle}"? This will refund ₹${refundAmount.toFixed(2)} security deposit to the borrower from your wallet.`)) {
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/approve-return`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || `Return approved successfully! Security deposit of ₹${refundAmount.toFixed(2)} has been refunded.`);
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Handle insufficient balance
        if (data.requiredAmount && response.status === 402) {
          alert(`Insufficient balance to refund security deposit. Required: ₹${data.requiredAmount.toFixed(2)}, Available: ₹${data.currentBalance.toFixed(2)}. Please top up your wallet first.`);
        } else {
          alert(data.error || data.message || "Failed to approve return");
        }
      }
    } catch (error: any) {
      alert("An error occurred. Please try again.");
      console.error("Error approving return:", error);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <CheckCircle2 className="w-4 h-4 text-blue-600" />
        <p className="text-xs text-blue-800">
          Borrower has requested to return this item. Approve to refund security deposit.
        </p>
      </div>
      <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
        <IndianRupee className="w-4 h-4 text-gray-600" />
        <p className="text-sm font-semibold text-gray-900">
          Security Deposit to Refund: ₹{refundAmount.toFixed(2)}
        </p>
      </div>
      <Button
        onClick={handleApproveReturn}
        disabled={isApproving}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isApproving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve Return & Refund Deposit
          </>
        )}
      </Button>
    </div>
  );
}

