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

// POST: Send an email via Gmail API
export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Gmail not configured" },
      { status: 503 }
    );
  }

  try {
    const { to, subject, body, from } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 }
      );
    }

    const senderName = from || "Flogen AI";
    const senderEmail = "flogen.team@gmail.com";

    // Build RFC 2822 email
    const emailLines = [
      `To: ${to}`,
      `From: ${senderName} <${senderEmail}>`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      body,
    ].join("\r\n");

    // Base64url encode
    const raw = Buffer.from(emailLines).toString("base64url");

    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    );

    if (!sendRes.ok) {
      const err = await sendRes.text();
      return NextResponse.json(
        { error: "Failed to send email", detail: err },
        { status: sendRes.status }
      );
    }

    const result = await sendRes.json();

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
