import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/user-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhoneVerification } from "@/components/phone-verification";
import { VerificationCard } from "@/components/verification-card";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  await headers();
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { user } = await getOrCreateUser(userId);

  if (!user) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const redirectPath = params.redirect;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="container mx-auto px-8 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="mb-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Phone Verification
          </h1>
          <p className="text-gray-500">
            Verify your phone number to get verified status and unlock full access
          </p>
        </div>

        {/* Verification Card */}
        <div className="mb-8">
          <VerificationCard 
            userVerified={user?.verified || false} 
            userId={user?.id || ""}
            redirectPath={redirectPath}
          />
        </div>

        {/* Additional Info Card */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Why verify your phone?
                </h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Build trust with other users in the marketplace</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Get verified badge on your profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Enhanced security for your account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Receive important notifications via SMS</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

