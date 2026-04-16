import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function publishToInstagram(
  accessToken: string,
  pageId: string,
  caption: string,
  imageUrl?: string,
  mediaType?: string
): Promise<string> {
  const igRes = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  );
  const igData = await igRes.json();
  const igId = igData.instagram_business_account?.id;
  if (!igId) throw new Error("No IG Business Account linked");

  const containerParams = new URLSearchParams({
    access_token: accessToken,
    caption,
  });

  if (imageUrl) {
    if (mediaType === "VIDEO" || mediaType === "REELS") {
      containerParams.set("video_url", imageUrl);
      containerParams.set("media_type", mediaType);
    } else {
      containerParams.set("image_url", imageUrl);
    }
  }

  const containerRes = await fetch(`${GRAPH_BASE}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: containerParams.toString(),
  });
  const containerData = await containerRes.json();
  if (containerData.error) throw new Error(containerData.error.message);

  const publishRes = await fetch(`${GRAPH_BASE}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: accessToken,
      creation_id: containerData.id,
    }).toString(),
  });
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(publishData.error.message);
  return publishData.id;
}

async function publishToFacebook(
  accessToken: string,
  pageId: string,
  caption: string,
  imageUrl?: string
): Promise<string> {
  if (imageUrl) {
    const params = new URLSearchParams({
      access_token: accessToken,
      url: imageUrl,
      message: caption,
    });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id || data.post_id;
  } else {
    const params = new URLSearchParams({
      access_token: accessToken,
      message: caption,
    });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!accessToken || !pageId) {
    return NextResponse.json({ error: "Facebook not configured" }, { status: 503 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    // Find posts scheduled for now or earlier that haven't been published
    const { data: posts, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ success: true, message: "No posts to publish", published: 0 });
    }

    let published = 0;
    const results: { id: string; status: string; error?: string }[] = [];

    for (const post of posts) {
      const publishIG = post.platform === "instagram" || post.platform === "both";
      const publishFB = post.platform === "facebook" || post.platform === "both";

      try {
        if (publishIG) {
          await publishToInstagram(accessToken, pageId, post.caption, post.image_url, post.media_type);
        }
        if (publishFB) {
          await publishToFacebook(accessToken, pageId, post.caption, post.image_url);
        }

        await supabase
          .from("scheduled_posts")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", post.id);

        published++;
        results.push({ id: post.id, status: "published" });
      } catch (e) {
        const errMsg = (e as Error).message;
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: errMsg })
          .eq("id", post.id);

        results.push({ id: post.id, status: "failed", error: errMsg });
      }
    }

    return NextResponse.json({ success: true, published, total: posts.length, results });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
