// ─── Shared Enums / Unions ────────────────────────────────────────────────────

export type Platform =
  | "instagram"
  | "xiaohongshu"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "facebook";

export type PostStatus =
  | "published"
  | "scheduled"
  | "draft"
  | "backlog"
  | "archived";

export type ContentPillar =
  | "education"
  | "inspiration"
  | "promotion"
  | "behind-the-scenes"
  | "engagement"
  | "case-study";

export type PostType =
  | "single"
  | "carousel"
  | "reel"
  | "story"
  | "video"
  | "article";

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  platform: Platform;
  status: PostStatus;
  type: PostType;
  pillar: ContentPillar | null;
  caption: string;
  hashtags: string[];
  scheduled_at: string | null; // ISO 8601
  published_at: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  /** For XHS cross-posts, reference the IG parent */
  parent_post_id: string | null;
  /** AI-generated caption variants (A/B) */
  caption_variants: string[] | null;
  created_at: string;
  updated_at: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  impressions: number;
  reach: number;
  engagement: number;
  engagement_rate: number;
  saves: number;
  shares: number;
}

export interface FollowerMetric {
  date: string;
  followers: number;
  net_change: number;
}

export interface KpiSummary {
  total_impressions: number;
  avg_engagement_rate: number;
  new_followers: number;
  total_posts: number;
  best_day: string;
}

export interface TopPost {
  id: string;
  thumbnail_url: string | null;
  caption: string;
  impressions: number;
  engagement_rate: number;
  platform: Platform;
  published_at: string;
}

// ─── Competitor ────────────────────────────────────────────────────────────────

export interface Competitor {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  profile_url: string | null;
  avatar_url: string | null;
  followers: number;
  following: number;
  posts_count: number;
  avg_engagement_rate: number;
  posting_frequency: number; // posts per week
  growth_7d: number; // % change
  growth_30d: number; // % change
  recent_posts: CompetitorPost[];
  last_refreshed_at: string | null;
  created_at: string;
}

export interface CompetitorPost {
  id: string;
  competitor_id: string;
  caption: string;
  media_url: string | null;
  likes: number;
  comments: number;
  engagement_rate: number;
  published_at: string;
}

// ─── News ─────────────────────────────────────────────────────────────────────

export interface NewsFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  feed_id: string;
  feed_name: string;
  title: string;
  summary: string | null;
  url: string;
  image_url: string | null;
  published_at: string | null;
  is_saved: boolean;
  is_read: boolean;
  /** AI-generated post idea derived from this article */
  post_idea: PostIdea | null;
  created_at: string;
}

export interface PostIdea {
  hook: string;
  body: string[];
  cta: string;
  hashtags: string[];
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarPost {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  platform: Platform;
  status: PostStatus;
  pillar: ContentPillar | null;
  color: string; // hex
}

// ─── AI Caption Generation ────────────────────────────────────────────────────

export interface CaptionRequest {
  topic: string;
  pillar: ContentPillar;
  platform: Platform;
  tone?: string;
  context?: string;
}

export interface CaptionResponse {
  variant_a: string;
  variant_b: string;
  hashtags: string[];
}
