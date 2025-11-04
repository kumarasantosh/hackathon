"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ReportDamageButtonProps {
  orderId: string;
  itemTitle: string;
  onSuccess?: () => void;
}

export function ReportDamageButton({ orderId, itemTitle, onSuccess }: ReportDamageButtonProps) {
  const router = useRouter();
  const [isReporting, setIsReporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleReportDamage = async () => {
    if (!description.trim()) {
      setError("Please describe the damage");
      return;
    }

    setIsReporting(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/report-damage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: description.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Damage reported successfully. Borrower's trust score has been reduced.");
        setIsOpen(false);
        setDescription("");
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.error || data.message || "Failed to report damage");
      }
    } catch (error: any) {
      setError("An error occurred. Please try again.");
      console.error("Error reporting damage:", error);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setIsOpen(true)}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Report Damage
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Report Damage for "{itemTitle}"</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setDescription("");
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Describe the damage to the item. This will reduce the borrower's trust score by 10 points.
            </p>
            <div>
              <label htmlFor="damage-description" className="block text-sm font-medium mb-2">
                Damage Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="damage-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setError(null);
                }}
                placeholder="Describe the damage in detail..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setDescription("");
                  setError(null);
                }}
                disabled={isReporting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReportDamage}
                disabled={isReporting || !description.trim()}
              >
                {isReporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reporting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Damage
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

