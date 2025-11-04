"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RequestActionsProps {
  requestId: string;
  itemTitle: string;
}

export function RequestActions({ requestId, itemTitle }: RequestActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<"approved" | "rejected" | false>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "approved" | "rejected") => {
    setIsLoading(action);
    setError(null);
    
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
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
        let errorMessage = data.error || data.details || "Failed to update request";
        
        // If there are conflicting dates, show them clearly
        if (data.conflictingDates && Array.isArray(data.conflictingDates) && data.conflictingDates.length > 0) {
          const formattedDates = data.conflictingDates.map((d: string) => 
            new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          ).join(", ");
          errorMessage = `${errorMessage}\n\nConflicting dates: ${formattedDates}\n\nPlease check the availability and try again.`;
        }
        
        setError(errorMessage);
        console.error("Request update failed:", data);
        // Clear error after 8 seconds for date conflicts
        setTimeout(() => setError(null), 8000);
      }
    } catch (error: any) {
      console.error("Request action error:", error);
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
          status === "approved" ? "text-green-600" : "text-red-600"
        }`}>
          Request {status}!
        </p>
        <p className="text-sm text-gray-600">
          {status === "approved" 
            ? "The requester has been notified." 
            : "The requester has been notified."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
          <p className="font-semibold mb-1">Error:</p>
          <p className="whitespace-pre-line">{error}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => handleAction("approved")}
          disabled={isLoading !== false}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          {isLoading === "approved" ? "Processing..." : "Approve"}
        </Button>
        <Button
          onClick={() => handleAction("rejected")}
          disabled={isLoading !== false}
          variant="destructive"
          size="sm"
        >
          {isLoading === "rejected" ? "Processing..." : "Reject"}
        </Button>
      </div>
    </div>
  );
}

