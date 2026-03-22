"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Film,
  Grid2x2,
  Hash,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Tv2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InstagramPost,
  PostStatus,
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
} from "@/types/instagram";

const TYPE_ICONS = {
  feed: ImageIcon,
  reel: Film,
  story: Tv2,
  carousel: Grid2x2,
};

const STATUS_STYLES: Record<
  PostStatus,
  { badge: string; dot: string }
> = {
  backlog: {
    badge: "bg-zinc-800 text-zinc-400 border-zinc-700",
    dot: "bg-zinc-500",
  },
  draft: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  scheduled: {
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    dot: "bg-blue-400",
  },
  published: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
};

interface PostCardProps {
  post: InstagramPost;
  onStatusChange: (id: string, status: PostStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (post: InstagramPost) => void;
}

export function PostCard({
  post,
  onStatusChange,
  onDelete,
  onEdit,
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const TypeIcon = TYPE_ICONS[post.type];
  const style = STATUS_STYLES[post.status];

  const formattedDate = post.scheduledDate
    ? new Date(post.scheduledDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      {/* Coloured top accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `hsl(${post.coverHue}, 65%, 55%)`,
        }}
      />

      {/* Cover image placeholder */}
      <div
        className="h-36 w-full flex items-center justify-center relative"
        style={{
          background: `linear-gradient(135deg, hsl(${post.coverHue}, 50%, 12%), hsl(${
            (post.coverHue + 40) % 360
          }, 50%, 18%))`,
        }}
      >
        <TypeIcon
          className="h-10 w-10 opacity-20"
          style={{ color: `hsl(${post.coverHue}, 70%, 70%)` }}
        />
        <Badge
          variant="outline"
          className="absolute top-2 left-2 text-[10px] px-1.5 py-0 bg-black/40 backdrop-blur-sm border-white/10 text-white/80"
        >
          {POST_TYPE_LABELS[post.type]}
        </Badge>

        {/* Action menu */}
        <div
          className={`absolute top-2 right-2 flex gap-1 transition-opacity duration-150 ${
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white/80 hover:text-white"
            onClick={() => onEdit(post)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 bg-black/40 backdrop-blur-sm hover:bg-red-500/60 text-white/80 hover:text-white"
            onClick={() => onDelete(post.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <CardContent className="p-3 space-y-2.5">
        {/* Status badge + type */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`}
            />
            <span className={`text-[11px] font-medium ${style.badge.split(" ")[1]}`}>
              {POST_STATUS_LABELS[post.status]}
            </span>
          </div>
          <Select
            value={post.status}
            onValueChange={(v) => onStatusChange(post.id, v as PostStatus)}
          >
            <SelectTrigger className="h-6 w-6 border-0 p-0 bg-transparent shadow-none focus:ring-0 [&>svg]:hidden">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Caption */}
        <p className="text-sm leading-snug text-foreground line-clamp-2 min-h-[2.5rem]">
          {post.caption || (
            <span className="text-muted-foreground italic">No caption yet…</span>
          )}
        </p>

        {/* Hashtags */}
        {post.hashtags && (
          <p className="text-[11px] text-blue-400/80 line-clamp-1 flex items-center gap-1">
            <Hash className="h-3 w-3 shrink-0" />
            {post.hashtags}
          </p>
        )}

        {/* Footer: date */}
        <div className="pt-1 border-t border-border/50 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {post.status === "scheduled" && formattedDate ? (
            <>
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{formattedDate}</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 shrink-0" />
              <span>
                Added{" "}
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
