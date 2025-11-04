import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  await headers();
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Neighbour Link
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            AI-Powered Hyperlocal Sharing & Support Platform
          </p>
          <p className="text-lg text-gray-600 mb-12">
            Connect with verified neighbors to share, rent, sell, volunteer, or connect safely within your community.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/sign-in">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

