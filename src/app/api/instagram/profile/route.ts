import { NextResponse } from "next/server";

const IG = "https://graph.instagram.com/v21.0";
const FIELDS = "id,name,username,biography,followers_count,media_count,profile_picture_url,website";

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "INSTAGRAM_ACCESS_TOKEN not set" }, { status: 400 });
  }
  try {
    const res  = await fetch(`${IG}/me?fields=${FIELDS}&access_token=${token}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
