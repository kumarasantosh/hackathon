"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X, HeartHandshake } from "lucide-react";

interface JoinServiceButtonProps {
  serviceRequestId: string;
}

export function JoinServiceButton({ serviceRequestId }: JoinServiceButtonProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);

  const handleJoin = async () => {
    if (!message.trim() && message.length < 10) {
      setSubmitError("Please provide a message (at least 10 characters) explaining how you can help");
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/service-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequestId,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if it was auto-approved
        const wasAutoApproved = data.autoApproved || false;
        setAutoApproved(wasAutoApproved);
        setSubmitSuccess(true);
        
        // Show success message longer for auto-approval
        setTimeout(() => {
          router.refresh();
          setShowForm(false);
          setMessage("");
          setSubmitSuccess(false);
          setAutoApproved(false);
        }, wasAutoApproved ? 3000 : 2000);
      } else {
        if (data.redirect && response.status === 403) {
          router.push(data.redirect + "?redirect=" + encodeURIComponent(window.location.pathname));
          return;
        }

        let errorMsg = data.error || "Failed to submit offer. Please try again.";
        if (data.message) {
          errorMsg = data.message;
        }
        setSubmitError(errorMsg);
      }
    } catch (error) {
      console.error("Join service error:", error);
      setSubmitError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        className="w-full bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
        size="lg"
        onClick={() => setShowForm(true)}
      >
        <HeartHandshake className="w-4 h-4 mr-2" />
        Join This Service Request
      </Button>
    );
  }

  if (submitSuccess) {
    return (
      <Card className="border-2 border-green-300 bg-green-50">
        <CardContent className="p-6 text-center">
          <div className="text-green-600 mb-2 text-4xl">✓</div>
          <p className="text-green-800 font-medium text-lg">
            {autoApproved ? "Offer Auto-Approved!" : "Offer submitted successfully!"}
          </p>
          <p className="text-sm text-green-700 mt-2">
            {autoApproved 
              ? "Your offer was automatically approved. You're all set!"
              : "The requester will review your offer."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-emerald-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Submit Your Offer</CardTitle>
          <button
            onClick={() => {
              setShowForm(false);
              setMessage("");
              setSubmitError(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Explain how you can help with this service request..."
            required
            minLength={10}
          />
          <p className="text-xs text-gray-500 mt-1">
            {message.length}/10 characters minimum
          </p>
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        <Button
          className="w-full bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
          size="lg"
          onClick={handleJoin}
          disabled={isLoading || message.trim().length < 10}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Offer"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

