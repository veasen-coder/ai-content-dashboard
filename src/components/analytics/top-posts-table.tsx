"use client";

import { format } from "date-fns";
import { Film, Grid2x2, Heart, ImageIcon, MessageCircle, Repeat2, Bookmark, Tv2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TopPost } from "@/lib/metricool";

const TYPE_ICON = {
  feed: ImageIcon,
  reel: Film,
  story: Tv2,
  carousel: Grid2x2,
};

const TYPE_COLORS: Record<string, string> = {
  feed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  reel: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  story: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  carousel: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

interface TopPostsTableProps {
  posts: TopPost[];
}

export function TopPostsTable({ posts }: TopPostsTableProps) {
  const max = posts[0]?.impressions ?? 1;

  return (
    <div className="space-y-3">
      {posts.map((post, idx) => {
        const TypeIcon = TYPE_ICON[post.type];
        const barWidth = Math.round((post.impressions / max) * 100);

        return (
          <div
            key={post.id}
            className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 hover:border-zinc-700 transition-colors group"
          >
            {/* Impression bar background */}
            <div
              className="absolute inset-y-0 left-0 opacity-40 transition-all duration-500"
              style={{
                width: `${barWidth}%`,
                background: `linear-gradient(90deg, hsl(${post.coverHue}, 60%, 20%), transparent)`,
              }}
            />

            <div className="relative flex items-start gap-3">
              {/* Rank */}
              <span
                className={`shrink-0 text-sm font-bold w-5 text-right ${
                  idx === 0
                    ? "text-amber-400"
                    : idx === 1
                    ? "text-zinc-400"
                    : idx === 2
                    ? "text-orange-600"
                    : "text-zinc-600"
                }`}
              >
                {idx + 1}
              </span>

              {/* Cover icon */}
              <div
                className="h-10 w-10 shrink-0 rounded-md flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, hsl(${post.coverHue}, 50%, 14%), hsl(${
                    (post.coverHue + 40) % 360
                  }, 50%, 20%))`,
                }}
              >
                <TypeIcon
                  className="h-5 w-5 opacity-60"
                  style={{ color: `hsl(${post.coverHue}, 70%, 65%)` }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 capitalize ${TYPE_COLORS[post.type]}`}
                  >
                    {post.type}
                  </Badge>
                  <span className="text-[11px] text-zinc-500">
                    {format(new Date(post.publishedAt), "MMM d, yyyy")}
                  </span>
                  <span className="ml-auto text-[11px] font-semibold text-zinc-300">
                    {post.impressions.toLocaleString()} impressions
                  </span>
                </div>

                <p className="text-xs text-zinc-300 line-clamp-1">{post.caption}</p>

                {/* Micro stats */}
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-rose-500" />
                    {post.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3 text-blue-400" />
                    {post.comments.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat2 className="h-3 w-3 text-emerald-400" />
                    {post.shares.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bookmark className="h-3 w-3 text-violet-400" />
                    {post.saves.toLocaleString()}
                  </span>
                  <span className="ml-auto font-medium text-emerald-400">
                    {post.engagementRate}% eng.
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
