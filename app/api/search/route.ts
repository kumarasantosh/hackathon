import { NextRequest, NextResponse } from "next/server";
import { aiMatchItems } from "@/lib/ai/aiMatch";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const location = searchParams.get("location");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Use AI matching to find relevant items
    const matches = await aiMatchItems(query, location || undefined, 10);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

