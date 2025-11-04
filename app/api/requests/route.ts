import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user-helpers";

export async function GET(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { user, error: userError } = await getOrCreateUser(userId);

    if (userError || !user) {
      return NextResponse.json(
        { error: userError || "User not found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // 'sent' or 'received'

    if (type === "sent") {
      // Requests I've sent
      const { data: requests, error } = await supabase
        .from("requests")
        .select("*, items(id, title, description, category, images, location, type, amount, users(name))")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch requests" },
          { status: 500 }
        );
      }

      return NextResponse.json({ requests });
    } else {
      // Requests I've received (for my items)
      const { data: requests, error } = await supabase
        .from("requests")
        .select("*, items(id, title, description, category, images, location, type, amount), requester:users!requests_requester_id_fkey(id, name, email, trust_score, verified)")
        .eq("items.user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch requests" },
          { status: 500 }
        );
      }

      return NextResponse.json({ requests });
    }
  } catch (error) {
    console.error("Fetch requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

