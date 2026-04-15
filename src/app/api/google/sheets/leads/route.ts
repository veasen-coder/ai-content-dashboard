import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHEET_NAME = "Leads";

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

// GET: Read all leads from the "Leads" sheet tab
export async function GET() {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  const accessToken = await getAccessToken();

  if (!sheetId || !accessToken) {
    return NextResponse.json(
      { error: "Google Sheets not configured" },
      { status: 503 }
    );
  }

  try {
    // First, try to read from the "Leads" tab
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_NAME)}?majorDimension=ROWS`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!readRes.ok) {
      // If tab doesn't exist, create it
      if (readRes.status === 400) {
        await createLeadsTab(sheetId, accessToken);
        return NextResponse.json({ rows: [], headers: getHeaders() });
      }
      return NextResponse.json(
        { error: "Failed to read leads sheet" },
        { status: readRes.status }
      );
    }

    const data = await readRes.json();
    const rows = data.values || [];

    return NextResponse.json({
      headers: rows[0] || getHeaders(),
      rows: rows.slice(1), // Skip header row
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Google Sheets" },
      { status: 500 }
    );
  }
}

// POST: Append leads to the "Leads" sheet tab
export async function POST(request: NextRequest) {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  const accessToken = await getAccessToken();

  if (!sheetId || !accessToken) {
    return NextResponse.json(
      { error: "Google Sheets not configured" },
      { status: 503 }
    );
  }

  try {
    const { leads } = await request.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads provided" },
        { status: 400 }
      );
    }

    // Ensure the Leads tab exists with headers
    await ensureLeadsTab(sheetId, accessToken);

    // Build rows: Batch ID | Business Name | Niche | Country | State | Phone | Email | Subject | Email Body | Status | Sent At | Created At | Thread ID
    const rows = leads.map(
      (lead: {
        batchId: string;
        businessName: string;
        niche: string;
        country: string;
        state: string;
        phone: string;
        email: string;
        subject: string;
        emailBody: string;
        status: string;
        sentAt: string;
        threadId?: string;
      }) => [
        lead.batchId || "",
        lead.businessName || "",
        lead.niche || "",
        lead.country || "Malaysia",
        lead.state || "",
        lead.phone || "",
        lead.email || "",
        lead.subject || "",
        lead.emailBody || "",
        lead.status || "draft",
        lead.sentAt || "",
        new Date().toISOString().split("T")[0],
        lead.threadId || "",
      ]
    );

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_NAME)}!A:M:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: rows }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.text();
      return NextResponse.json(
        { error: "Failed to append to leads sheet", detail: err },
        { status: appendRes.status }
      );
    }

    const data = await appendRes.json();
    return NextResponse.json({
      success: true,
      updatedRange: data.updates?.updatedRange,
      count: rows.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save leads" },
      { status: 500 }
    );
  }
}

// --------------- Helpers ---------------

function getHeaders() {
  return [
    "Batch ID",
    "Business Name",
    "Niche",
    "Country",
    "State",
    "Phone",
    "Email",
    "Subject",
    "Email Body",
    "Status",
    "Sent At",
    "Created At",
    "Thread ID",
  ];
}

async function createLeadsTab(
  sheetId: string,
  accessToken: string
): Promise<void> {
  // Add a new sheet tab called "Leads"
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: SHEET_NAME },
            },
          },
        ],
      }),
    }
  );

  // Add headers
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_NAME)}!A1:M1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [getHeaders()] }),
    }
  );
}

async function ensureLeadsTab(
  sheetId: string,
  accessToken: string
): Promise<void> {
  // Check if tab exists by trying to read A1
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_NAME)}!A1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    await createLeadsTab(sheetId, accessToken);
  }
}
