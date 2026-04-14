import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

interface PublishBody {
  platform: "instagram" | "facebook" | "both";
  caption: string;
  image_url?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
  location_id?: string;
  share_to_feed?: boolean;
}

async function publishToInstagram(
  accessToken: string,
  pageId: string,
  body: PublishBody
): Promise<{ id: string }> {
  // Step 1: Get IG Business Account ID from the page
  const igRes = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  );
  const igData = await igRes.json();

  if (igData.error) {
    throw new Error(igData.error.message || "Failed to fetch page data");
  }

  const igId = igData.instagram_business_account?.id;
  if (!igId) {
    throw new Error("No Instagram Business Account linked to this page");
  }

  // Step 2: Create media container
  const containerParams = new URLSearchParams({
    access_token: accessToken,
    caption: body.caption,
  });

  if (body.image_url) {
    const mediaType = body.media_type || "IMAGE";

    if (mediaType === "VIDEO" || mediaType === "REELS") {
      containerParams.set("video_url", body.image_url);
      containerParams.set("media_type", mediaType);
    } else {
      containerParams.set("image_url", body.image_url);
      if (mediaType !== "IMAGE") {
        containerParams.set("media_type", mediaType);
      }
    }
  }

  if (body.location_id) {
    containerParams.set("location_id", body.location_id);
  }

  if (body.media_type === "REELS" && body.share_to_feed !== undefined) {
    containerParams.set("share_to_feed", String(body.share_to_feed));
  }

  const containerRes = await fetch(`${GRAPH_BASE}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: containerParams.toString(),
  });
  const containerData = await containerRes.json();

  if (containerData.error) {
    throw new Error(containerData.error.message || "Failed to create media container");
  }

  const creationId = containerData.id;
  if (!creationId) {
    throw new Error("No creation ID returned from media container");
  }

  // Step 3: Publish the container
  const publishParams = new URLSearchParams({
    access_token: accessToken,
    creation_id: creationId,
  });

  const publishRes = await fetch(`${GRAPH_BASE}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString(),
  });
  const publishData = await publishRes.json();

  if (publishData.error) {
    throw new Error(publishData.error.message || "Failed to publish to Instagram");
  }

  return { id: publishData.id };
}

async function publishToFacebook(
  accessToken: string,
  pageId: string,
  body: PublishBody
): Promise<{ id: string }> {
  if (body.image_url) {
    // Photo post
    const params = new URLSearchParams({
      access_token: accessToken,
      url: body.image_url,
      message: body.caption,
    });

    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message || "Failed to publish photo to Facebook");
    }

    return { id: data.id || data.post_id };
  } else {
    // Text-only post
    const params = new URLSearchParams({
      access_token: accessToken,
      message: body.caption,
    });

    const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message || "Failed to publish to Facebook");
    }

    return { id: data.id };
  }
}

export async function POST(request: NextRequest) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook/Instagram not configured. Set FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID." },
      { status: 503 }
    );
  }

  let body: PublishBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { platform, caption } = body;

  if (!platform || !["instagram", "facebook", "both"].includes(platform)) {
    return NextResponse.json(
      { error: "Invalid platform. Must be 'instagram', 'facebook', or 'both'." },
      { status: 400 }
    );
  }

  if (!caption || typeof caption !== "string" || caption.trim().length === 0) {
    return NextResponse.json(
      { error: "Caption is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  const publishIG = platform === "instagram" || platform === "both";
  const publishFB = platform === "facebook" || platform === "both";

  let instagramResult: { id: string } | null = null;
  let facebookResult: { id: string } | null = null;
  const errors: string[] = [];

  try {
    // Run both flows in parallel when publishing to both
    const promises: Promise<void>[] = [];

    if (publishIG) {
      promises.push(
        publishToInstagram(accessToken, pageId, body)
          .then((result) => { instagramResult = result; })
          .catch((err) => { errors.push(`Instagram: ${err.message}`); })
      );
    }

    if (publishFB) {
      promises.push(
        publishToFacebook(accessToken, pageId, body)
          .then((result) => { facebookResult = result; })
          .catch((err) => { errors.push(`Facebook: ${err.message}`); })
      );
    }

    await Promise.all(promises);

    // If all requested platforms failed, return error
    if (errors.length > 0 && !instagramResult && !facebookResult) {
      return NextResponse.json(
        { error: errors.join("; "), success: false, instagram: null, facebook: null },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      instagram: instagramResult,
      facebook: facebookResult,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    });
  } catch (err) {
    console.error("[Social Publish] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to publish", detail: String(err) },
      { status: 500 }
    );
  }
}
