"use client";

import { format } from "date-fns";
import { Clock, Tag, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarPost, PLATFORM_META, STATUS_META } from "@/types/calendar";
import { PlatformIcon } from "./platform-icons";

interface PostDetailPopoverProps {
  post: CalendarPost;
  onEdit: (post: CalendarPost) => void;
  onDelete: (id: string) => void;
}

export function PostDetailPopover({ post, onEdit, onDelete }: PostDetailPopoverProps) {
  const pm = PLATFORM_META[post.platform];
  const sm = STATUS_META[post.status];

  return (
    <div className="w-72 space-y-3">
      {/* Cover strip */}
      <div
        className="h-1.5 w-full rounded-full"
        style={{ background: `hsl(${post.coverHue}, 65%, 55%)` }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${pm.bg} ${pm.border} border`}>
            <PlatformIcon platform={post.platform} className={`h-3.5 w-3.5 ${pm.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">{post.title}</p>
            <p className={`text-[11px] ${pm.color}`}>{pm.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
          <span className={`text-[11px] ${sm.color}`}>{sm.label}</span>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Caption */}
      {post.caption && (
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
          {post.caption}
        </p>
      )}

      {/* Meta */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Clock className="h-3 w-3 shrink-0" />
          <span>
            {format(new Date(`${post.date}T${post.time}`), "EEEE, MMMM d · h:mm a")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Tag className="h-3 w-3 shrink-0" />
          <span className="capitalize">{post.type}</span>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 text-xs border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300"
          onClick={() => onEdit(post)}
        >
          <Pencil className="h-3 w-3 mr-1.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-zinc-700 bg-zinc-800/60 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
          onClick={() => onDelete(post.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
