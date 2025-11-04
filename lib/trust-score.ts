import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Increment user's trust score by specified amount
 * Ensures trust score stays within 0-100 range
 */
export async function incrementTrustScore(
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  const serviceClient = createServiceRoleClient();

  // Get current trust score
  const { data: user, error: fetchError } = await serviceClient
    .from("users")
    .select("trust_score")
    .eq("id", userId)
    .single();

  if (fetchError || !user) {
    console.error("Failed to fetch user for trust score update:", fetchError);
    return;
  }

  const currentScore = user.trust_score || 0;
  const newScore = Math.min(100, Math.max(0, currentScore + points));

  // Update trust score
  const { error: updateError } = await serviceClient
    .from("users")
    .update({
      trust_score: newScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to update trust score:", updateError);
    throw new Error(`Failed to update trust score: ${updateError.message}`);
  } else {
    console.log(`Trust score updated for user ${userId}: ${currentScore} -> ${newScore} (${reason})`);
  }
}

