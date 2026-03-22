"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Goal, GoalCategory } from "@/types/habits";
import { CATEGORY_META } from "@/types/habits";
import { TODAY } from "@/lib/habits-data";

const GOAL_EMOJIS = ["🎯","🏅","📖","💰","🚀","🏋️","🌍","🎓","❤️","⚖️","🧠","🎨","💻","🎸","🌿"];
const HUE_OPTIONS = [0, 30, 60, 120, 160, 200, 240, 280, 320, 350];
const CATEGORIES = Object.keys(CATEGORY_META) as GoalCategory[];

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: Omit<Goal, "id" | "createdAt">) => void;
}

export function AddGoalDialog({ open, onOpenChange, onAdd }: AddGoalDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [colorHue, setColorHue] = useState(200);
  const [category, setCategory] = useState<GoalCategory>("personal");
  const [current, setCurrent] = useState("0");
  const [target, setTarget] = useState("100");
  const [unit, setUnit] = useState("% complete");
  const [targetDate, setTargetDate] = useState("");

  function handleAdd() {
    if (!name.trim() || !targetDate || !target) return;
    onAdd({
      name: name.trim(), description: description.trim(),
      emoji, colorHue, category,
      current: parseFloat(current) || 0,
      target: parseFloat(target) || 100,
      unit: unit.trim() || "units",
      targetDate, milestones: [],
    });
    setName(""); setDescription(""); setEmoji("🎯"); setColorHue(200);
    setCurrent("0"); setTarget("100"); setUnit("% complete"); setTargetDate("");
    onOpenChange(false);
  }

  const isValid = name.trim() && targetDate && parseFloat(target) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>New Goal</DialogTitle>
          <DialogDescription className="text-zinc-500">Define a measurable goal to work towards.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Goal name</Label>
            <Input placeholder="e.g. Read 24 Books" value={name} onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-sm" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Description <span className="text-zinc-600">(optional)</span></Label>
            <Textarea placeholder="Why does this goal matter?" value={description} onChange={(e) => setDescription(e.target.value)}
              rows={2} className="bg-zinc-800 border-zinc-700 text-sm resize-none" />
          </div>

          {/* Emoji + color row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Emoji</Label>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_EMOJIS.map((e) => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className={`h-7 w-7 rounded-lg text-base transition-all
                      ${emoji === e ? "bg-zinc-700 ring-2 ring-zinc-500" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Color</Label>
              <div className="flex flex-wrap gap-2">
                {HUE_OPTIONS.map((h) => (
                  <button key={h} onClick={() => setColorHue(h)}
                    className={`h-5 w-5 rounded-full transition-all ${colorHue === h ? "ring-2 ring-white/40 scale-110" : "hover:scale-105"}`}
                    style={{ background: `hsl(${h}, 60%, 50%)` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className={CATEGORY_META[c].color}>{CATEGORY_META[c].label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Current</Label>
              <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-sm" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Target</Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-sm" min={1} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="books, km, $…"
                className="bg-zinc-800 border-zinc-700 text-sm" />
            </div>
          </div>

          {/* Target date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Target date</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              min={TODAY} className="bg-zinc-800 border-zinc-700 text-sm [color-scheme:dark]" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">Cancel</Button>
          <Button onClick={handleAdd} disabled={!isValid}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0">
            Add Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
