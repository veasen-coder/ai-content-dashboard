"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InstagramPost, PostStatus, PostType } from "@/types/instagram";

interface PostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (post: Omit<InstagramPost, "id" | "createdAt" | "coverHue">) => void;
  editPost?: InstagramPost | null;
}

const EMPTY_FORM = {
  caption: "",
  hashtags: "",
  type: "feed" as PostType,
  status: "backlog" as PostStatus,
  scheduledDate: "",
};

export function PostDialog({
  open,
  onOpenChange,
  onSave,
  editPost,
}: PostDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editPost) {
      setForm({
        caption: editPost.caption,
        hashtags: editPost.hashtags,
        type: editPost.type,
        status: editPost.status,
        scheduledDate: editPost.scheduledDate ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editPost, open]);

  function handleSave() {
    onSave({
      caption: form.caption,
      hashtags: form.hashtags,
      type: form.type,
      status: form.status,
      scheduledDate:
        form.status === "scheduled" && form.scheduledDate
          ? form.scheduledDate
          : null,
    });
    onOpenChange(false);
  }

  const isScheduled = form.status === "scheduled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{editPost ? "Edit Post" : "New Post Idea"}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {editPost
              ? "Update this post's details and status."
              : "Add a new idea to your content pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Post Type + Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Post Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as PostType }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed Post</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as PostStatus }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled date — only shown when status is scheduled */}
          {isScheduled && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Scheduled Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.scheduledDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduledDate: e.target.value }))
                }
                className="bg-zinc-800 border-zinc-700 text-sm [color-scheme:dark]"
              />
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Caption</Label>
            <Textarea
              placeholder="Write your caption here…"
              value={form.caption}
              onChange={(e) =>
                setForm((f) => ({ ...f, caption: e.target.value }))
              }
              rows={4}
              className="bg-zinc-800 border-zinc-700 text-sm resize-none"
            />
            <p className="text-[11px] text-zinc-600 text-right">
              {form.caption.length} / 2200
            </p>
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Hashtags</Label>
            <Input
              placeholder="#contentcreator #instagram #reels"
              value={form.hashtags}
              onChange={(e) =>
                setForm((f) => ({ ...f, hashtags: e.target.value }))
              }
              className="bg-zinc-800 border-zinc-700 text-sm"
            />
            <p className="text-[11px] text-zinc-600">
              Separate hashtags with spaces. Max 30 recommended.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.caption.trim() && !form.hashtags.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0"
          >
            {editPost ? "Save Changes" : "Add to Pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
