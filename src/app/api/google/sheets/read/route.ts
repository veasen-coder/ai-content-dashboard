import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Failed to get Google access token", detail: tokenData },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;

    // Read all data from Sheet1
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?majorDimension=ROWS`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!readRes.ok) {
      const err = await readRes.text();
      return NextResponse.json(
        { error: "Failed to read Google Sheets", detail: err },
        { status: readRes.status }
      );
    }

    const data = await readRes.json();
    const rows = data.values || [];

    return NextResponse.json({ rows, range: data.range });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Google Sheets" },
      { status: 500 }
    );
  }
}
