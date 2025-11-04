"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WalletTopupButton } from "@/components/wallet-topup-button";

interface ServiceOfferActionsProps {
  offerId: string;
  serviceName: string;
}

export function ServiceOfferActions({ offerId, serviceName }: ServiceOfferActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<"accepted" | "rejected" | false>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState<{
    required: number;
    current: number;
  } | null>(null);

  const handleAction = async (action: "accepted" | "rejected") => {
    setIsLoading(action);
    setError(null);
    
    try {
      const response = await fetch(`/api/service-offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(action);
        // Refresh the page to show updated status
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        // Check if it's an insufficient balance error
        if (data.insufficientBalance && action === "accepted") {
          setInsufficientBalance({
            required: data.requiredAmount,
            current: data.currentBalance,
          });
          setError(`Insufficient wallet balance. Required: ₹${data.requiredAmount}, Available: ₹${data.currentBalance.toFixed(2)}`);
        } else {
          const errorMessage = data.error || data.message || "Failed to update offer";
          setError(errorMessage);
        }
        console.error("Offer update failed:", data);
        setTimeout(() => setError(null), 8000);
      }
    } catch (error: any) {
      console.error("Offer action error:", error);
      const errorMessage = error?.message || "An error occurred. Please try again.";
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  if (status) {
    return (
      <div className="space-y-2">
        <p className={`font-semibold text-lg ${
          status === "accepted" ? "text-green-600" : "text-red-600"
        }`}>
          Offer {status}!
        </p>
        <p className="text-sm text-gray-600">
          {status === "accepted" 
            ? "The provider has been notified and the service request is now in progress." 
            : "The provider has been notified."}
        </p>
      </div>
    );
  }

  const handleTopupSuccess = () => {
    // Retry accepting the offer after successful topup
    setInsufficientBalance(null);
    setError(null);
    handleAction("accepted");
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
          <p className="font-semibold mb-1">Error:</p>
          <p>{error}</p>
        </div>
      )}
      {insufficientBalance && (
        <div className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="font-semibold mb-2 text-blue-900">Insufficient Wallet Balance</p>
          <p className="text-blue-800 mb-2">
            Required: ₹{insufficientBalance.required.toFixed(2)}<br />
            Available: ₹{insufficientBalance.current.toFixed(2)}<br />
            Need to add: ₹{(insufficientBalance.required - insufficientBalance.current).toFixed(2)}
          </p>
          <WalletTopupButton
            amount={insufficientBalance.required - insufficientBalance.current}
            onSuccess={handleTopupSuccess}
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => handleAction("accepted")}
          disabled={isLoading !== false || !!insufficientBalance}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          {isLoading === "accepted" ? "Processing..." : "Accept Offer"}
        </Button>
        <Button
          onClick={() => handleAction("rejected")}
          disabled={isLoading !== false}
          variant="destructive"
          size="sm"
        >
          {isLoading === "rejected" ? "Processing..." : "Reject Offer"}
        </Button>
      </div>
    </div>
  );
}

