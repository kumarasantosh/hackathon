"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, CheckCircle2, XCircle } from "lucide-react";

interface PhoneVerificationProps {
  isVerified: boolean;
  onVerified: () => void;
}

export function PhoneVerification({ isVerified, onVerified }: PhoneVerificationProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/verify-phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("otp");
        setSuccess(false);
        setError(null);
      } else {
        // Show detailed error message
        let errorMsg = data.error || "Failed to send OTP";
        if (data.details) {
          errorMsg += ` (${data.details})`;
        }
        setError(errorMsg);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/verify-phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Phone Verified</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-green-600 animate-in fade-in duration-300">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Verification Successful!</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === "phone" ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a5f3f]"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendOTP}
                disabled={isLoading || !phone.trim()}
                className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +91 for India)
            </p>
          </div>
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(value);
                }}
                placeholder="000000"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a5f3f] text-center text-2xl tracking-widest"
                maxLength={6}
                disabled={isLoading}
              />
              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Didn't receive OTP?{" "}
                <button
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError(null);
                  }}
                  className="text-[#1a5f3f] hover:underline"
                >
                  Change number
                </button>
              </p>
              <button
                onClick={handleSendOTP}
                disabled={isLoading}
                className="text-xs text-[#1a5f3f] hover:underline"
              >
                Resend OTP
              </button>
            </div>
          </div>
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

