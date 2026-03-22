export type PostType = "feed" | "reel" | "story" | "carousel";
export type PostStatus = "backlog" | "draft" | "scheduled" | "published";

export interface InstagramPost {
  id: string;
  caption: string;
  hashtags: string;
  type: PostType;
  status: PostStatus;
  scheduledDate: string | null;
  createdAt: string;
  coverHue: number; // 0-360, used for placeholder gradient
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  feed: "Feed Post",
  reel: "Reel",
  story: "Story",
  carousel: "Carousel",
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  backlog: "Backlog",
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};
