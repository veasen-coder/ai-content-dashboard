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
import {
  CalendarPost,
  ContentStatus,
  ContentType,
  Platform,
  PLATFORM_META,
} from "@/types/calendar";
import { PlatformIcon } from "./platform-icons";

interface PostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (post: Omit<CalendarPost, "id" | "coverHue">) => void;
  editPost?: CalendarPost | null;
  defaultDate?: string;
}

const EMPTY: Omit<CalendarPost, "id" | "coverHue"> = {
  title: "",
  caption: "",
  platform: "instagram",
  type: "post",
  status: "scheduled",
  date: "",
  time: "10:00",
};

const CONTENT_TYPES: Record<Platform, ContentType[]> = {
  instagram: ["post", "reel", "story", "carousel"],
  youtube:   ["video", "short"],
  tiktok:    ["short"],
  twitter:   ["tweet"],
  linkedin:  ["article", "post"],
  facebook:  ["post", "video"],
};

export function PostFormDialog({
  open,
  onOpenChange,
  onSave,
  editPost,
  defaultDate,
}: PostFormDialogProps) {
  const [form, setForm] = useState<Omit<CalendarPost, "id" | "coverHue">>(EMPTY);

  useEffect(() => {
    if (editPost) {
      const { id: _id, coverHue: _hue, ...rest } = editPost;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, date: defaultDate ?? "" });
    }
  }, [editPost, defaultDate, open]);

  const availableTypes = CONTENT_TYPES[form.platform] ?? ["post"];

  function handlePlatformChange(p: Platform) {
    const types = CONTENT_TYPES[p];
    setForm((f) => ({
      ...f,
      platform: p,
      type: types.includes(f.type as ContentType) ? f.type : types[0],
    }));
  }

  function handleSave() {
    onSave(form);
    onOpenChange(false);
  }

  const isValid = form.title.trim() && form.date && form.time;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{editPost ? "Edit Post" : "Schedule Content"}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {editPost ? "Update this content item." : "Add a new post to the calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Title</Label>
            <Input
              placeholder="e.g. Monday Motivation Reel"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>

          {/* Platform + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => handlePlatformChange(v as Platform)}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <PlatformIcon platform={p} className={`h-3.5 w-3.5 ${PLATFORM_META[p].color}`} />
                        {PLATFORM_META[p].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Content Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as ContentType }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as ContentStatus }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-sm [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Time</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-sm [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Caption / Notes</Label>
            <Textarea
              placeholder="Write your caption or notes here…"
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-sm resize-none"
            />
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
            disabled={!isValid}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0"
          >
            {editPost ? "Save Changes" : "Add to Calendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
