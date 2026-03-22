"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Habit, HabitFrequency } from "@/types/habits";

const EMOJI_OPTIONS = ["🧘","📚","🏃","💧","✍️","🥗","💊","😴","🎯","💪","🧠","🎨","🎸","🌿","🚴","🏊","🧹","📝","💻","🌅"];
const HUE_OPTIONS = [0, 30, 60, 120, 160, 200, 240, 280, 320, 350];

interface AddHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: Omit<Habit, "id" | "completions" | "createdAt">) => void;
  today: string;
}

export function AddHabitDialog({ open, onOpenChange, onAdd, today }: AddHabitDialogProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [colorHue, setColorHue] = useState(200);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), emoji, frequency, colorHue });
    setName(""); setEmoji("🎯"); setFrequency("daily"); setColorHue(200);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>New Habit</DialogTitle>
          <DialogDescription className="text-zinc-500">Add a new habit to track daily.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Habit name</Label>
            <Input placeholder="e.g. Morning Meditation" value={name} onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-sm" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          </div>

          {/* Emoji picker */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Emoji</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`h-8 w-8 rounded-lg text-lg transition-all
                    ${emoji === e ? "bg-zinc-700 ring-2 ring-zinc-500" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as HabitFrequency)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
                <SelectItem value="weekends">Weekends (Sat–Sun)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Color</Label>
            <div className="flex gap-2">
              {HUE_OPTIONS.map((h) => (
                <button key={h} onClick={() => setColorHue(h)}
                  className={`h-6 w-6 rounded-full transition-all
                    ${colorHue === h ? "ring-2 ring-white/40 scale-110" : "hover:scale-105"}`}
                  style={{ background: `hsl(${h}, 60%, 50%)` }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">Cancel</Button>
          <Button onClick={handleAdd} disabled={!name.trim()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0">
            Add Habit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
