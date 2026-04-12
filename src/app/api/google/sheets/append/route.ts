import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!sheetId || !refreshToken || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google Sheets not configured" },
      { status: 503 }
    );
  }

  try {
    // Get access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const body = await request.json();
    const { values } = body;

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:G:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!appendRes.ok) {
      return NextResponse.json(
        { error: "Failed to append to Google Sheets" },
        { status: appendRes.status }
      );
    }

    const data = await appendRes.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Google Sheets" },
      { status: 500 }
    );
  }
}
