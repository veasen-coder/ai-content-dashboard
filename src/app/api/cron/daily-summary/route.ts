import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// This endpoint is called by Vercel Cron every day at 8 AM MYT (0:00 UTC)
// It imports and calls the daily summary handler directly (no self-referencing HTTP)
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Import the POST handler directly instead of making an HTTP call to ourselves
    const { POST } = await import("@/app/api/agents/daily-summary/route");
    const response = await POST();
    const data = await response.json();

    if (response.status !== 200) {
      return NextResponse.json({ error: data.error || "Agent failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Daily summary generated and saved to Google Sheets",
      date: data.date,
      sent_to_clickup: data.sent_to_clickup,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
