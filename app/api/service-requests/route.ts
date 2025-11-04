import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { z } from "zod";

const serviceRequestSchema = z.object({
  service_name: z.string().min(1, "Service name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["free", "paid"]),
  amount: z.number().optional(),
  is_urgent: z.boolean().default(false),
  service_dates: z.array(z.string()).min(1, "At least one date is required"),
  people_needed: z.number().int().min(1, "At least 1 person is required").default(1),
  auto_approve: z.boolean().default(false),
}).refine((data) => {
  if (data.type === "paid") {
    return data.amount !== undefined && data.amount > 0;
  }
  return true;
}, {
  message: "Amount is required for paid services",
  path: ["amount"],
});

export async function POST(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = serviceRequestSchema.parse(body);

    // Get or create user from database
    const { user, error: userError } = await getOrCreateUser(userId);

    if (userError || !user) {
      return NextResponse.json(
        { 
          error: userError || "User not found",
        },
        { status: 404 }
      );
    }

    // Check if user is verified
    if (!user.verified) {
      return NextResponse.json(
        { 
          error: "Account verification required",
          message: "You must verify your phone number before creating service requests. Please verify your account in the dashboard.",
          redirect: "/dashboard/verify"
        },
        { status: 403 }
      );
    }

    // For paid services, check if user has sufficient balance
    // Total required = amount per person * number of people needed
    if (validatedData.type === "paid" && validatedData.amount && validatedData.amount > 0) {
      const userBalance = parseFloat(user.balance?.toString() || "0");
      const peopleNeeded = validatedData.people_needed || 1;
      const amountPerPerson = validatedData.amount;
      const requiredAmount = amountPerPerson * peopleNeeded;
      
      if (userBalance < requiredAmount) {
        const insufficientAmount = requiredAmount - userBalance;
        return NextResponse.json(
          {
            error: "Insufficient wallet balance",
            message: `You have insufficient balance to create this paid service request. Required: ₹${requiredAmount.toFixed(2)} (₹${amountPerPerson.toFixed(2)} × ${peopleNeeded} ${peopleNeeded === 1 ? 'person' : 'people'}), Available: ₹${userBalance.toFixed(2)}`,
            insufficientBalance: true,
            requiredAmount: requiredAmount,
            amountPerPerson: amountPerPerson,
            peopleNeeded: peopleNeeded,
            currentBalance: userBalance,
            insufficientAmount: insufficientAmount,
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const validDates: string[] = [];
    for (const dateStr of validatedData.service_dates) {
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        return NextResponse.json(
          { error: `Invalid date format: ${dateStr}. Expected YYYY-MM-DD` },
          { status: 400 }
        );
      }
      
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const day = parseInt(dateMatch[3], 10);
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: `Invalid date: ${dateStr}` },
          { status: 400 }
        );
      }
      
      if (date < today) {
        return NextResponse.json(
          { error: "Service dates must be in the future" },
          { status: 400 }
        );
      }
      
      validDates.push(dateStr);
    }

    // Create service request using service role to bypass RLS
    const serviceClient = createServiceRoleClient();

    const { data: serviceRequest, error: requestError } = await serviceClient
      .from("service_requests")
      .insert({
        user_id: user.id,
        service_name: validatedData.service_name,
        description: validatedData.description,
        location: validatedData.location,
        type: validatedData.type,
        amount: validatedData.type === "paid" ? validatedData.amount : null,
        is_urgent: validatedData.is_urgent,
        people_needed: validatedData.people_needed || 1,
        auto_approve: validatedData.auto_approve || false,
        status: "open",
      })
      .select()
      .single();

    if (requestError || !serviceRequest) {
      console.error("Failed to create service request:", requestError);
      return NextResponse.json(
        { 
          error: "Failed to create service request",
          details: process.env.NODE_ENV === "development" ? (requestError?.message || "Unknown error") : undefined
        },
        { status: 500 }
      );
    }

    // Create service request dates
    const dateRecords = validDates.map(dateStr => ({
      service_request_id: serviceRequest.id,
      service_date: dateStr,
    }));

    const { error: datesError } = await serviceClient
      .from("service_request_dates")
      .insert(dateRecords);

    if (datesError) {
      console.error("Failed to create service request dates:", datesError);
      // Continue anyway - dates might fail but request is created
    }

    return NextResponse.json({
      success: true,
      service_request: serviceRequest,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Create service request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    
    const serviceClient = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "open";
    const type = searchParams.get("type"); // 'my_requests' or 'all' or 'offers'

    if (!userId) {
      // Return all open requests for non-authenticated users
      const { data: requests, error } = await serviceClient
        .from("service_requests")
        .select(`
          *,
          users(id, name, trust_score, verified),
          service_request_dates(service_date)
        `)
        .eq("status", "open")
        .order("is_urgent", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch service requests" },
          { status: 500 }
        );
      }

      return NextResponse.json({ service_requests: requests || [] });
    }

    const { user } = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (type === "my_requests") {
      // Get user's own service requests
      const { data: requests, error } = await serviceClient
        .from("service_requests")
        .select(`
          *,
          service_request_dates(service_date),
          service_offers(id, provider_id, message, status, created_at, providers:users(id, name, trust_score))
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch service requests" },
          { status: 500 }
        );
      }

      return NextResponse.json({ service_requests: requests || [] });
    } else if (type === "offers") {
      // Get service requests where user has made offers
      const { data: offers, error } = await serviceClient
        .from("service_offers")
        .select(`
          *,
          service_requests(
            *,
            users(id, name, trust_score),
            service_request_dates(service_date)
          )
        `)
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch service offers" },
          { status: 500 }
        );
      }

      return NextResponse.json({ offers: offers || [] });
    } else {
      // Get all open requests
      const { data: requests, error } = await serviceClient
        .from("service_requests")
        .select(`
          *,
          users(id, name, trust_score, verified),
          service_request_dates(service_date),
          service_offers(id, provider_id, status)
        `)
        .eq("status", status)
        .order("is_urgent", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch service requests" },
          { status: 500 }
        );
      }

      return NextResponse.json({ service_requests: requests || [] });
    }
  } catch (error) {
    console.error("Fetch service requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

