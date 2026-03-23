import { NextResponse } from "next/server";

const IG = "https://graph.instagram.com/v21.0";
const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "INSTAGRAM_ACCESS_TOKEN not set" }, { status: 400 });
  }
  try {
    const res  = await fetch(`${IG}/me/media?fields=${FIELDS}&limit=24&access_token=${token}`, { next: { revalidate: 900 } });
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
