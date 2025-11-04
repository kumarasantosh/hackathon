"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { PhoneVerification } from "@/components/phone-verification";
import { Button } from "@/components/ui/button";

interface VerificationCardProps {
  userVerified: boolean;
  userId: string;
  redirectPath?: string;
}

export function VerificationCard({ userVerified: initialVerified, userId, redirectPath }: VerificationCardProps) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [showVerification, setShowVerification] = useState(!initialVerified);

  useEffect(() => {
    setIsVerified(initialVerified);
    setShowVerification(!initialVerified);
  }, [initialVerified]);

  const handleVerified = () => {
    setIsVerified(true);
    setShowVerification(false);
    // Redirect to specified path or dashboard after a short delay to show success state
    setTimeout(() => {
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    }, 1500);
  };

  if (isVerified) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-5xl font-bold text-green-600 mb-2">✓</div>
          <div className="text-gray-700 text-sm font-medium">Verified</div>
          <div className="text-gray-500 text-xs mt-3">Your phone number is verified</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-700" />
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-5xl font-bold text-gray-900 mb-2">✗</div>
        <div className="text-gray-600 text-sm font-medium mb-4">Not Verified</div>
        
        {showVerification ? (
          <div className="mt-4 pt-4 border-t">
            <PhoneVerification
              isVerified={isVerified}
              onVerified={handleVerified}
            />
          </div>
        ) : (
          <div className="mt-4">
            <Button
              onClick={() => setShowVerification(true)}
              className="w-full bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
              size="sm"
            >
              Verify Phone Number
            </Button>
            <p className="text-gray-400 text-xs mt-3 text-center">
              Verify your phone to get verified status
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

