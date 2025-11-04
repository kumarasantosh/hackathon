"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-[#1a5f3f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <p className="text-gray-500 animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Manage your profile and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <p className="text-gray-700">{user?.fullName || profile?.name || "Not set"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <p className="text-gray-700">{user?.primaryEmailAddress?.emailAddress || profile?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <p className="text-gray-700">{profile?.bio || "No bio set"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <p className="text-gray-700">{profile?.location || "Not set"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Skills</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile?.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-gray-500">No skills added</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Trust Score</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${profile?.trust_score || 50}%` }}
                />
              </div>
              <span className="font-semibold">{profile?.trust_score || 50}/100</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Verified Status</label>
            <p className="text-gray-700">
              {profile?.verified ? (
                <span className="text-green-600 font-semibold">✓ Verified Neighbor</span>
              ) : (
                <span className="text-gray-500">Not verified</span>
              )}
            </p>
          </div>

          <Button variant="outline">Edit Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}

