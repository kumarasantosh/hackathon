import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Get or create user in Supabase database
 * Falls back to creating user if webhook hasn't fired yet
 */
export async function getOrCreateUser(clerkUserId: string) {
  const supabase = await createClient();

  // Try to get existing user
  let { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkUserId)
    .single();

  // If user doesn't exist, create them
  if (userError || !user) {
    // Await headers() before calling currentUser() (Next.js 15 requirement)
    await headers();
    const clerkUser = await currentUser();
    
    if (!clerkUser || clerkUser.id !== clerkUserId) {
      return { user: null, error: "Failed to get Clerk user data" };
    }

    // Get email from Clerk user
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    
    if (!email) {
      console.error("No email found for Clerk user:", clerkUser.id);
      return { user: null, error: "User email is required but not available" };
    }

    // Create user in database using service role to bypass RLS
    // This is necessary because RLS policies can't check Clerk auth directly
    let serviceClient;
    try {
      serviceClient = createServiceRoleClient();
    } catch (error: any) {
      console.error("Failed to create service role client:", error.message);
      return { user: null, error: error.message };
    }

    const { data: newUser, error: createError } = await serviceClient
      .from("users")
      .insert({
        clerk_id: clerkUserId,
        email: email,
        name: clerkUser.fullName || `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
        trust_score: 0,
        verified: false,
        role: "user",
      })
      .select("*")
      .single();

    if (createError) {
      console.error("Failed to create user - Error details:", {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
      });
      
      // Check if user already exists (race condition)
      if (createError.code === "23505") {
        // Unique constraint violation - user might have been created by webhook
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("clerk_id", clerkUserId)
          .single();
        
        if (existingUser) {
          return { user: existingUser, error: null };
        }
      }
      
      return { 
        user: null, 
        error: `Failed to create user: ${createError.message || "Unknown error"}` 
      };
    }

    if (!newUser) {
      console.error("User creation returned no data");
      return { user: null, error: "Failed to create user in database - no data returned" };
    }

    user = newUser;
  }

  return { user, error: null };
}

