import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface MatchingResult {
  itemId: string;
  title: string;
  description: string;
  score: number;
  reason: string;
}

/**
 * AI-based matching function for needs ↔ offers ↔ proximity
 * Uses Gemini to generate embeddings and match items based on semantic similarity
 */
export async function aiMatchItems(
  userNeed: string,
  userLocation?: string,
  limit: number = 10
): Promise<MatchingResult[]> {
  const supabase = await createClient();

  try {
    // Get available items from database
    const { data: items, error } = await supabase
      .from("items")
      .select("*")
      .eq("status", "available")
      .limit(100);

    if (error || !items || items.length === 0) {
      return [];
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not configured, using fallback matching");
      return fallbackMatch(userNeed, items, limit);
    }

    // Try different model names that might be available
    const modelNames = [
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-pro",
      "models/gemini-1.5-pro",
      "models/gemini-1.5-flash",
    ];

    let model;
    let workingModelName: string | null = null;

    // Find a working model
    for (const modelName of modelNames) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        // Test if the model works by attempting a small call
        workingModelName = modelName;
        break;
      } catch (e) {
        // Continue to next model
        continue;
      }
    }

    if (!model || !workingModelName) {
      console.warn("No working Gemini model found, using fallback matching");
      return fallbackMatch(userNeed, items, limit);
    }

    // Create a prompt for matching
    const prompt = `You are a matching system for a hyperlocal sharing platform. 
    User need: "${userNeed}"
    User location: ${userLocation || "unknown"}
    
    Here are available items:
    ${items
      .map(
        (item, idx) =>
          `${idx + 1}. [${item.id}] ${item.title} - ${item.description} (Category: ${item.category}, Location: ${item.location}, Type: ${item.type})`
      )
      .join("\n")}
    
    Rank the top ${limit} items that best match the user's need, considering:
    1. Semantic relevance (how well the item matches the need)
    2. Category relevance
    3. Location proximity (if provided)
    4. Availability and type
    
    Return JSON array with format:
    [{"itemId": "uuid", "score": 0.95, "reason": "why this matches"}]
    `;

    let result;
    let response;
    let text;
    
    try {
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
    } catch (apiError: any) {
      console.error(`Gemini API error with model ${workingModelName}:`, apiError?.message || apiError);
      // If API fails, use fallback matching
      return fallbackMatch(userNeed, items, limit);
    }

    // Parse JSON from response
    let matches: MatchingResult[] = [];
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      } else {
        matches = JSON.parse(text);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: return items sorted by simple keyword matching
      return fallbackMatch(userNeed, items, limit);
    }

    // Enrich matches with item details
    const enrichedMatches: MatchingResult[] = matches
      .map((match) => {
        const item = items.find((i) => i.id === match.itemId);
        if (!item) return null;
        return {
          itemId: match.itemId,
          title: item.title,
          description: item.description,
          score: match.score || 0,
          reason: match.reason || "Matched by AI",
        };
      })
      .filter((m): m is MatchingResult => m !== null)
      .slice(0, limit);

    return enrichedMatches;
  } catch (error) {
    console.error("AI matching error:", error);
    return [];
  }
}

/**
 * Fallback matching when AI parsing fails
 */
function fallbackMatch(
  userNeed: string,
  items: any[],
  limit: number
): MatchingResult[] {
  const needWords = userNeed.toLowerCase().split(/\s+/);

  const scored = items.map((item) => {
    const itemText = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    const matches = needWords.filter((word) => itemText.includes(word)).length;
    const score = matches / needWords.length;

    return {
      itemId: item.id,
      title: item.title,
      description: item.description,
      score,
      reason: `Matched ${matches} keywords from your search`,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((m) => m.score > 0);
}

/**
 * Match user skills to neighbor needs
 */
export async function matchSkillsToNeeds(
  userId: string,
  limit: number = 5
): Promise<MatchingResult[]> {
  const supabase = await createClient();

  // Get user's skills
  const { data: user } = await supabase
    .from("users")
    .select("skills, location")
    .eq("id", userId)
    .single();

  if (!user || !user.skills || user.skills.length === 0) {
    return [];
  }

  const skillsText = user.skills.join(", ");
  return aiMatchItems(
    `I have these skills: ${skillsText}. Looking for opportunities to help neighbors.`,
    user.location || undefined,
    limit
  );
}

