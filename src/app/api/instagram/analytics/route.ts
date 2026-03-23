import { NextResponse } from "next/server";

const IG = "https://graph.instagram.com/v21.0";
const POST_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
const PROFILE_FIELDS = "id,name,username,biography,followers_count,media_count,profile_picture_url,website";

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "INSTAGRAM_ACCESS_TOKEN not set" }, { status: 400 });
  }

  try {
    const [profRes, postsRes] = await Promise.all([
      fetch(`${IG}/me?fields=${PROFILE_FIELDS}&access_token=${token}`, { next: { revalidate: 3600 } }),
      fetch(`${IG}/me/media?fields=${POST_FIELDS}&limit=50&access_token=${token}`, { next: { revalidate: 900 } }),
    ]);

    const profile = await profRes.json();
    const postsData = await postsRes.json();

    if (profile.error) return NextResponse.json({ error: profile.error.message }, { status: 400 });
    if (postsData.error) return NextResponse.json({ error: postsData.error.message }, { status: 400 });

    const posts: Array<{
      id: string;
      caption?: string;
      media_type: string;
      media_url: string;
      thumbnail_url?: string;
      permalink: string;
      timestamp: string;
      like_count: number;
      comments_count: number;
    }> = postsData.data ?? [];

    // ── KPI summary ───────────────────────────────────────────────────────────
    const totalLikes    = posts.reduce((s, p) => s + (p.like_count ?? 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments_count ?? 0), 0);
    const totalEng      = totalLikes + totalComments;
    const followers     = profile.followers_count ?? 0;
    const engagementRate = posts.length && followers > 0
      ? parseFloat(((totalEng / (posts.length * followers)) * 100).toFixed(2))
      : 0;
    const avgLikesPerPost = posts.length ? Math.round(totalLikes / posts.length) : 0;

    // ── Engagement by day (derived from post timestamps) ──────────────────────
    const byDay: Record<string, { likes: number; comments: number; count: number }> = {};
    for (const p of posts) {
      const day = p.timestamp.slice(0, 10);
      if (!byDay[day]) byDay[day] = { likes: 0, comments: 0, count: 0 };
      byDay[day].likes    += p.like_count ?? 0;
      byDay[day].comments += p.comments_count ?? 0;
      byDay[day].count    += 1;
    }
    const dailyEngagement = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, likes: v.likes, comments: v.comments, posts: v.count }));

    // ── Top posts by total engagement ─────────────────────────────────────────
    const topPosts = [...posts]
      .sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        type: p.media_type === "VIDEO" ? "reel" : p.media_type === "CAROUSEL_ALBUM" ? "carousel" : "feed",
        caption: (p.caption ?? "").slice(0, 120),
        publishedAt: p.timestamp,
        permalink: p.permalink,
        mediaUrl: p.thumbnail_url ?? p.media_url,
        likes: p.like_count ?? 0,
        comments: p.comments_count ?? 0,
        engagementRate: followers > 0
          ? parseFloat((((p.like_count + p.comments_count) / followers) * 100).toFixed(2))
          : 0,
      }));

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        followers: followers,
        mediaCount: profile.media_count,
        biography: profile.biography,
        profilePictureUrl: profile.profile_picture_url,
        website: profile.website,
      },
      kpi: {
        totalLikes,
        totalComments,
        totalEngagement: totalEng,
        engagementRate,
        avgLikesPerPost,
        totalPosts: posts.length,
        followers,
      },
      dailyEngagement,
      topPosts,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
