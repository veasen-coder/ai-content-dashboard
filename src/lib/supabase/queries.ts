import { createClient } from "./server";
import type {
  Post,
  Competitor,
  NewsFeed,
  NewsArticle,
} from "@/types";

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function getPosts(status?: Post["status"]): Promise<Post[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getPosts error:", error.message);
    return [];
  }
  return (data as Post[]) ?? [];
}

export async function createPost(
  post: Omit<Post, "id" | "created_at" | "updated_at">
): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single();

  if (error) {
    console.error("createPost error:", error.message);
    return null;
  }
  return data as Post;
}

export async function updatePost(
  id: string,
  updates: Partial<Omit<Post, "id" | "created_at">>
): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updatePost error:", error.message);
    return null;
  }
  return data as Post;
}

export async function deletePost(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) {
    console.error("deletePost error:", error.message);
    return false;
  }
  return true;
}

export async function getCalendarPosts(
  year: number,
  month: number
): Promise<Post[]> {
  const supabase = await createClient();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .or(`scheduled_at.gte.${start},published_at.gte.${start}`)
    .or(`scheduled_at.lte.${end},published_at.lte.${end}`)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("getCalendarPosts error:", error.message);
    return [];
  }
  return (data as Post[]) ?? [];
}

// ─── Competitors ──────────────────────────────────────────────────────────────

export async function getCompetitors(): Promise<Competitor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitors")
    .select(`*, competitor_posts(*)`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getCompetitors error:", error.message);
    return [];
  }
  return (data as Competitor[]) ?? [];
}

export async function upsertCompetitor(
  competitor: Omit<Competitor, "id" | "created_at" | "recent_posts">
): Promise<Competitor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitors")
    .upsert(competitor, { onConflict: "handle,platform" })
    .select()
    .single();

  if (error) {
    console.error("upsertCompetitor error:", error.message);
    return null;
  }
  return data as Competitor;
}

export async function deleteCompetitor(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  if (error) {
    console.error("deleteCompetitor error:", error.message);
    return false;
  }
  return true;
}

// ─── News ─────────────────────────────────────────────────────────────────────

export async function getNewsFeeds(): Promise<NewsFeed[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_feeds")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getNewsFeeds error:", error.message);
    return [];
  }
  return (data as NewsFeed[]) ?? [];
}

export async function getNewsArticles(
  feedId?: string,
  unreadOnly = false
): Promise<NewsArticle[]> {
  const supabase = await createClient();
  let query = supabase
    .from("news_articles")
    .select(`*, news_feeds(name)`)
    .order("published_at", { ascending: false })
    .limit(50);

  if (feedId) query = query.eq("feed_id", feedId);
  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) {
    console.error("getNewsArticles error:", error.message);
    return [];
  }
  return (data as NewsArticle[]) ?? [];
}

export async function upsertArticles(
  articles: Omit<NewsArticle, "id" | "created_at" | "is_saved" | "is_read" | "post_idea" | "feed_name">[]
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("news_articles")
    .upsert(articles, { onConflict: "url", ignoreDuplicates: true });

  if (error) {
    console.error("upsertArticles error:", error.message);
  }
}

export async function markArticleRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("news_articles").update({ is_read: true }).eq("id", id);
}

export async function saveArticle(id: string, saved: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("news_articles")
    .update({ is_saved: saved })
    .eq("id", id);
}

export async function savePostIdeaToArticle(
  id: string,
  postIdea: NewsArticle["post_idea"]
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("news_articles")
    .update({ post_idea: postIdea })
    .eq("id", id);
}
