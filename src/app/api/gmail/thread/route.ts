import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  return data.access_token || null;
}

// GET: Fetch a Gmail thread by threadId to check for replies
export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Gmail not configured" },
      { status: 503 }
    );
  }

  const threadId = request.nextUrl.searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json(
      { error: "threadId is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch thread", detail: err },
        { status: res.status }
      );
    }

    const thread = await res.json();
    const messages = (thread.messages || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (msg: any) => {
        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (h: any) => h.name.toLowerCase() === name.toLowerCase()
          )?.value || "";

        // Extract plain text body
        let body = "";
        if (msg.payload?.body?.data) {
          body = Buffer.from(msg.payload.body.data, "base64url").toString(
            "utf-8"
          );
        } else if (msg.payload?.parts) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const textPart = msg.payload.parts.find((p: any) =>
            p.mimeType?.includes("text/plain")
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, "base64url").toString(
              "utf-8"
            );
          }
        }

        return {
          id: msg.id,
          from: getHeader("From"),
          to: getHeader("To"),
          subject: getHeader("Subject"),
          date: getHeader("Date"),
          snippet: msg.snippet || "",
          body,
          labelIds: msg.labelIds || [],
        };
      }
    );

    // First message is the sent email, rest are replies
    const sentMessage = messages[0];
    const replies = messages.slice(1);

    return NextResponse.json({
      threadId,
      messageCount: messages.length,
      hasReplies: replies.length > 0,
      sentMessage,
      replies,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}
