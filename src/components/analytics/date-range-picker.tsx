"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange as RDPDateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DATE_PRESETS, DateRange, presetRange } from "@/lib/metricool";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [calRange, setCalRange] = useState<RDPDateRange | undefined>({
    from: value.from,
    to: value.to,
  });

  function applyPreset(days: number) {
    const r = presetRange(days);
    onChange(r);
    setCalRange({ from: r.from, to: r.to });
    setOpen(false);
  }

  function applyCalendar() {
    if (calRange?.from && calRange?.to) {
      onChange({ from: calRange.from, to: calRange.to });
      setOpen(false);
    }
  }

  const label =
    value.from && value.to
      ? `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
      : "Select range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-2 border-zinc-700 bg-zinc-900 text-sm font-normal hover:bg-zinc-800 hover:text-foreground",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon className="h-4 w-4 text-zinc-400" />
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 ml-1" />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-zinc-900 border-zinc-800 shadow-xl shadow-black/40"
        align="end"
      >
        <div className="flex">
          {/* Preset sidebar */}
          <div className="flex flex-col gap-0.5 border-r border-zinc-800 p-3 min-w-[140px]">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">
              Quick select
            </p>
            {DATE_PRESETS.map((p) => {
              const pr = presetRange(p.days);
              const isActive =
                value.from.toDateString() === pr.from.toDateString() &&
                value.to.toDateString() === pr.to.toDateString();
              return (
                <button
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  className={cn(
                    "text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                    isActive
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={calRange}
              onSelect={setCalRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              className="[&_td]:text-xs [&_th]:text-xs"
            />
            <div className="flex justify-end pt-2 border-t border-zinc-800 mt-2">
              <Button
                size="sm"
                disabled={!calRange?.from || !calRange?.to}
                onClick={applyCalendar}
                className="bg-blue-600 hover:bg-blue-500 text-white border-0 text-xs h-7 px-3"
              >
                Apply range
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
