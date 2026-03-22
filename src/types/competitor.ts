import type { Platform } from "./calendar";

export type { Platform };

export interface CompetitorAccount {
  platform: Platform;
  handle: string;
  profileUrl: string;
  followers: number;
  following: number;
  postCount: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgSaves: number;
  engagementRate: number;       // percentage
  postsPerWeek: number;
  lastPostedAt: string;         // ISO
  followerHistory: number[];    // 12 weekly snapshots, oldest → newest
  engagementHistory: number[];  // 12 weekly snapshots
}

export interface RecentPost {
  id: string;
  platform: Platform;
  type: string;
  caption: string;
  postedAt: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  coverHue: number;
}

export interface Competitor {
  id: string;
  name: string;           // display name
  avatarHue: number;      // for generated avatar
  addedAt: string;
  accounts: CompetitorAccount[];
  recentPosts: RecentPost[];
  // Derived / aggregated across all tracked platforms
  totalFollowers: number;
  avgEngagementRate: number;
  topPlatform: Platform;
}

export type SortKey =
  | "name"
  | "totalFollowers"
  | "avgEngagementRate"
  | "postsPerWeek"
  | "followerGrowth"
  | "lastPosted";

export type SortDir = "asc" | "desc";
