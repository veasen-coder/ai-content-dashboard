"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useDemoModeStore } from "@/store/demo-mode-store";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = {
  Consultation: "bg-primary",
  Treatment: "bg-[#10B981]",
  "Follow-up": "bg-amber-500",
  "Group Session": "bg-blue-500",
};

const TODAY_BOOKINGS = [
  {
    time: "09:30 AM",
    customer: "Ahmad Rahman",
    service: "Consultation",
    duration: "30 min",
    status: "Confirmed",
  },
  {
    time: "10:30 AM",
    customer: "Siti Nurhaliza",
    service: "Treatment",
    duration: "60 min",
    status: "Confirmed",
  },
  {
    time: "11:45 AM",
    customer: "Raj Kumar",
    service: "Follow-up",
    duration: "20 min",
    status: "Checked In",
  },
  {
    time: "01:00 PM",
    customer: "Mei Ling Tan",
    service: "Consultation",
    duration: "45 min",
    status: "Confirmed",
  },
  {
    time: "02:30 PM",
    customer: "Farah Aziz",
    service: "Group Session",
    duration: "90 min",
    status: "Confirmed",
  },
  {
    time: "04:00 PM",
    customer: "Hafiz Ibrahim",
    service: "Treatment",
    duration: "60 min",
    status: "Pending",
  },
  {
    time: "05:30 PM",
    customer: "Priya Sharma",
    service: "Follow-up",
    duration: "30 min",
    status: "Confirmed",
  },
];

// Generate demo appointment dots for the current month
function generateDots(daysInMonth: number) {
  const dots: Record<number, (keyof typeof SERVICE_TYPES)[]> = {};
  const services = Object.keys(SERVICE_TYPES) as (keyof typeof SERVICE_TYPES)[];
  const seed = [3, 5, 7, 11, 13, 17]; // pseudo-random
  for (let d = 1; d <= daysInMonth; d++) {
    const count = seed[d % seed.length] % 5; // 0-4 dots
    dots[d] = [];
    for (let i = 0; i < count; i++) {
      dots[d].push(services[(d + i) % services.length]);
    }
  }
  return dots;
}

const STATUS_COLORS: Record<string, string> = {
  Confirmed: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
  "Checked In": "bg-primary/15 text-primary border-primary/30",
  Pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function DemoCalendarPage() {
  const { demoClientName } = useDemoModeStore();
  const now = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const isCurrentMonth =
    now.getMonth() === month && now.getFullYear() === year;

  const monthName = viewDate.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const dots = generateDots(daysInMonth);

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <PageWrapper title="Calendar & Bookings">
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-4">
          <div>
            <div className="font-mono text-lg font-bold">12</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Today&apos;s bookings
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-lg font-bold">47</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Next 7 days
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-lg font-bold text-[#10B981]">
              87%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Fill rate
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            <span className="text-muted-foreground">
              Synced with{" "}
              <span className="font-medium text-foreground">
                Google Calendar
              </span>
            </span>
          </div>
          <button className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Book New Appointment
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Calendar grid */}
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{monthName}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days of week */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {weeks.flat().map((day, i) => {
                if (day === null) {
                  return <div key={i} className="aspect-square" />;
                }
                const isToday = isCurrentMonth && day === today;
                const dayDots = dots[day] || [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-lg border p-1.5 transition-colors hover:bg-muted/40 cursor-pointer",
                      isToday
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-background/50"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium",
                        isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {day}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayDots.slice(0, 4).map((s, j) => (
                        <div
                          key={j}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            SERVICE_TYPES[s]
                          )}
                        />
                      ))}
                      {dayDots.length > 4 && (
                        <span className="text-[8px] text-muted-foreground">
                          +{dayDots.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
              {Object.entries(SERVICE_TYPES).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-2 rounded-full", color)} />
                  <span className="text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's bookings */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-sm font-semibold">Today&apos;s Bookings</h3>
                <p className="text-xs text-muted-foreground">
                  {demoClientName}
                </p>
              </div>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {TODAY_BOOKINGS.map((b, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xs font-semibold">
                      {b.time.split(" ")[0]}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {b.time.split(" ")[1]}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-0.5 rounded-full shrink-0",
                      SERVICE_TYPES[b.service as keyof typeof SERVICE_TYPES]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{b.customer}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {b.service}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {b.duration}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                          STATUS_COLORS[b.status]
                        )}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
