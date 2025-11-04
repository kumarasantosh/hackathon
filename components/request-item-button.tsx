"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X } from "lucide-react";
import { BookingDatePicker } from "@/components/booking-date-picker";

interface RequestItemButtonProps {
  itemId: string;
}

export function RequestItemButton({ itemId, userVerified = false }: RequestItemButtonProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [requestMessage, setRequestMessage] = useState("");

  const handleRequest = async () => {
    if (selectedDates.length === 0) {
      setMessage("Please select at least one booking date");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // Log what we're sending
    console.log("Sending request with dates:", selectedDates);

    try {
      const response = await fetch("/api/items/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          bookingDates: selectedDates, // Only the dates that were actually selected
          message: requestMessage || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Request sent successfully! The owner will be notified.");
        setSelectedDates([]);
        setRequestMessage("");
        // Close form and refresh after a delay
        setTimeout(() => {
          setShowForm(false);
          router.refresh();
        }, 2000);
      } else {
        // If redirect is provided (verification required), redirect instead of showing error
        if (data.redirect && response.status === 403) {
          router.push(data.redirect + "?redirect=" + encodeURIComponent(window.location.pathname));
          return;
        }
        
        let errorMsg = data.error || "Failed to send request. Please try again.";
        if (data.message) {
          errorMsg = data.message;
        }
        if (data.conflictingDates && Array.isArray(data.conflictingDates)) {
          setMessage(`${errorMsg} Conflicts: ${data.conflictingDates.join(", ")}`);
        } else {
          setMessage(errorMsg);
        }
      }
    } catch (error) {
      console.error("Request error:", error);
      setMessage("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    if (!userVerified) {
      return (
        <Button
          className="w-full"
          size="lg"
          onClick={() => router.push("/dashboard/verify?redirect=" + encodeURIComponent(window.location.pathname))}
        >
          Verify to Request Item
        </Button>
      );
    }
    
    return (
      <Button
        className="w-full"
        size="lg"
        onClick={() => setShowForm(true)}
      >
        Request Item
      </Button>
    );
  }

  return (
    <Card className="border-2 border-emerald-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Create Booking Request</CardTitle>
          <button
            onClick={() => {
              setShowForm(false);
              setSelectedDates([]);
              setRequestMessage("");
              setMessage(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Important Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            📅 Step 1: Select Your Booking Dates (Required)
          </p>
          <p className="text-xs text-blue-700">
            You must select at least one date when you want to use this item before submitting your request.
          </p>
        </div>

        {/* Date Picker */}
        <div className={selectedDates.length === 0 ? "ring-2 ring-amber-300 rounded-lg p-2" : ""}>
          <BookingDatePicker
            itemId={itemId}
            selectedDates={selectedDates}
            onDatesChange={setSelectedDates}
          />
        </div>

        {/* Date Selection Status */}
        {selectedDates.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Please select at least one date to continue
            </p>
          </div>
        )}

        {selectedDates.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              ✓ {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Optional Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional)
          </label>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Add a message to the owner..."
          />
        </div>

        {/* Error/Success Message */}
        {message && (
          <p
            className={`text-sm p-2 rounded ${
              message.includes("successfully")
                ? "text-green-700 bg-green-50"
                : "text-red-700 bg-red-50"
            }`}
          >
            {message}
          </p>
        )}

        {/* Submit Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleRequest}
          disabled={isLoading || selectedDates.length === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Request...
            </>
          ) : selectedDates.length === 0 ? (
            "Select Dates to Continue"
          ) : (
            `Submit Request (${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''})`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

