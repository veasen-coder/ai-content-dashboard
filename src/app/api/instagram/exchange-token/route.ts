import { NextRequest, NextResponse } from "next/server";
import { exchangeForLongLivedToken } from "@/lib/facebook/token";

export const dynamic = "force-dynamic";

// POST: Exchange a provided short-lived token for a long-lived one
export async function POST(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const shortToken = body.short_lived_token;

    if (!shortToken) {
      return NextResponse.json(
        { error: "Missing short_lived_token in request body" },
        { status: 400 }
      );
    }

    const result = await exchangeForLongLivedToken(shortToken, appId, appSecret);

    return NextResponse.json({
      access_token: result.access_token,
      token_type: result.token_type,
      expires_in_seconds: result.expires_in,
      expires_in_days: Math.round(result.expires_in / 86400),
      instruction:
        "Copy the access_token above and set it as FACEBOOK_ACCESS_TOKEN in your .env.local file, then restart the dev server.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Token exchange failed", detail: String(err) },
      { status: 400 }
    );
  }
}

// GET: Try to exchange the current env token
export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const currentToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required" },
      { status: 503 }
    );
  }

  if (!currentToken) {
    return NextResponse.json(
      { error: "No FACEBOOK_ACCESS_TOKEN set in environment" },
      { status: 400 }
    );
  }

  try {
    const result = await exchangeForLongLivedToken(currentToken, appId, appSecret);

    return NextResponse.json({
      access_token: result.access_token,
      token_type: result.token_type,
      expires_in_seconds: result.expires_in,
      expires_in_days: Math.round(result.expires_in / 86400),
      instruction:
        "Copy the access_token above and set it as FACEBOOK_ACCESS_TOKEN in your .env.local file, then restart the dev server.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Token exchange failed — the current token is likely expired",
        detail: String(err),
        recommendation:
          "Generate a fresh short-lived token at https://developers.facebook.com/tools/explorer/ (select app 4472811756341136), then POST { \"short_lived_token\": \"...\" } to this endpoint",
      },
      { status: 400 }
    );
  }
}
