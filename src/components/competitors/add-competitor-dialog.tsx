"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { PLATFORM_META } from "@/types/calendar";
import { PlatformIcon } from "@/components/calendar/platform-icons";
import type { Platform } from "@/types/competitor";

const ALL_PLATFORMS = Object.keys(PLATFORM_META) as Platform[];

interface AddCompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (handle: string, name: string, platforms: Platform[]) => void;
}

export function AddCompetitorDialog({ open, onOpenChange, onAdd }: AddCompetitorDialogProps) {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(["instagram"]));
  const [loading, setLoading] = useState(false);

  function toggle(p: Platform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p) && next.size === 1) return next; // keep at least one
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  async function handleAdd() {
    if (!handle.trim()) return;
    setLoading(true);
    // Simulate network fetch
    await new Promise((r) => setTimeout(r, 900));
    onAdd(handle.trim(), name.trim() || handle.trim(), Array.from(platforms));
    setLoading(false);
    setHandle("");
    setName("");
    setPlatforms(new Set(["instagram"]));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Enter a handle or channel name to start tracking their public metrics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Display Name</Label>
            <Input
              placeholder="e.g. GrowthLab Studio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Handle / Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">@</span>
              <Input
                placeholder="competitorhandle"
                value={handle.replace(/^@/, "")}
                onChange={(e) => setHandle(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-sm pl-7"
              />
            </div>
            <p className="text-[11px] text-zinc-600">
              Use the same handle across all selected platforms where possible.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Track on platforms</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => {
                const pm = PLATFORM_META[p];
                const active = platforms.has(p);
                return (
                  <button
                    key={p}
                    onClick={() => toggle(p)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all
                      ${active
                        ? `${pm.bg} ${pm.border} ${pm.color}`
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                      }`}
                  >
                    <PlatformIcon platform={p} className="h-3 w-3" />
                    {pm.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-600">
              {platforms.size} platform{platforms.size !== 1 ? "s" : ""} selected — publicly available data only.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!handle.trim() || loading}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 min-w-[130px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Fetching data…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Competitor
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
