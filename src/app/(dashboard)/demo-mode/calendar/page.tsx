"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
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
  X,
  Phone,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = {
  Consultation: "bg-primary",
  Treatment: "bg-[#10B981]",
  "Follow-up": "bg-amber-500",
  "Group Session": "bg-blue-500",
} as const;

type Service = keyof typeof SERVICE_TYPES;
type BookingStatus = "Confirmed" | "Pending" | "Completed" | "Cancelled" | "Checked In";

interface Booking {
  id: string;
  dateKey: string; // YYYY-MM-DD
  time: string;
  customer: string;
  service: Service;
  duration: string;
  status: BookingStatus;
  phone: string;
}

const MALAY_NAMES = [
  "Ahmad Rahman",
  "Siti Nurhaliza",
  "Raj Kumar",
  "Mei Ling Tan",
  "Farah Aziz",
  "Hafiz Ibrahim",
  "Priya Sharma",
  "Daniel Wong",
  "Zara Mohamed",
  "Kevin Lee",
];

function fmtDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prettyDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  Confirmed: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
  "Checked In": "bg-primary/15 text-primary border-primary/30",
  Pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Cancelled: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
};

const STATUS_CYCLE: BookingStatus[] = ["Confirmed", "Pending", "Completed", "Cancelled"];

const TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

function makeInitialBookings(today: Date): Booking[] {
  const todayKey = fmtDateKey(today);
  return [
    { id: "b1", dateKey: todayKey, time: "09:30 AM", customer: "Ahmad Rahman", service: "Consultation", duration: "30 min", status: "Confirmed", phone: "+60 12-345-6789" },
    { id: "b2", dateKey: todayKey, time: "10:30 AM", customer: "Siti Nurhaliza", service: "Treatment", duration: "60 min", status: "Confirmed", phone: "+60 19-876-5432" },
    { id: "b3", dateKey: todayKey, time: "11:45 AM", customer: "Raj Kumar", service: "Follow-up", duration: "20 min", status: "Checked In", phone: "+60 16-234-5678" },
    { id: "b4", dateKey: todayKey, time: "01:00 PM", customer: "Mei Ling Tan", service: "Consultation", duration: "45 min", status: "Confirmed", phone: "+60 17-345-9876" },
    { id: "b5", dateKey: todayKey, time: "02:30 PM", customer: "Farah Aziz", service: "Group Session", duration: "90 min", status: "Confirmed", phone: "+60 11-987-6543" },
    { id: "b6", dateKey: todayKey, time: "04:00 PM", customer: "Hafiz Ibrahim", service: "Treatment", duration: "60 min", status: "Pending", phone: "+60 13-456-7890" },
    { id: "b7", dateKey: todayKey, time: "05:30 PM", customer: "Priya Sharma", service: "Follow-up", duration: "30 min", status: "Confirmed", phone: "+60 14-567-8901" },
  ];
}

// Generate deterministic service-type spread per day (for dots)
function generateDots(year: number, month: number, daysInMonth: number) {
  const dots: Record<number, Service[]> = {};
  const services = Object.keys(SERVICE_TYPES) as Service[];
  const seed = [3, 5, 7, 11, 13, 17];
  for (let d = 1; d <= daysInMonth; d++) {
    const count = seed[(d + month) % seed.length] % 5;
    dots[d] = [];
    for (let i = 0; i < count; i++) {
      dots[d].push(services[(d + i + year) % services.length]);
    }
  }
  return dots;
}

export default function DemoCalendarPage() {
  const { demoClientName } = useDemoModeStore();
  const now = useMemo(() => new Date(), []);
  const todayKey = fmtDateKey(now);

  const [viewDate, setViewDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [bookings, setBookings] = useState<Booking[]>(() => makeInitialBookings(now));
  const [bookingDetail, setBookingDetail] = useState<Booking | null>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    service: "Consultation" as Service,
    date: todayKey,
    time: "10:00 AM",
    duration: "30 min",
    notes: "",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNewOpen(false);
        setBookingDetail(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const dots = useMemo(
    () => generateDots(year, month, daysInMonth),
    [year, month, daysInMonth]
  );

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

  const selectedBookings = useMemo(
    () => bookings.filter((b) => b.dateKey === selectedDateKey),
    [bookings, selectedDateKey]
  );

  function cycleBookingStatus(b: Booking, e: React.MouseEvent) {
    e.stopPropagation();
    const idx = STATUS_CYCLE.indexOf(b.status as BookingStatus);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    setBookings((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, status: next } : x))
    );
    if (bookingDetail?.id === b.id) setBookingDetail({ ...b, status: next });
    toast.success(`${b.customer}: ${next}`);
  }

  function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const newBooking: Booking = {
      id: "b" + Date.now(),
      dateKey: form.date,
      time: form.time,
      customer: form.customer,
      service: form.service,
      duration: form.duration,
      status: "Confirmed",
      phone: form.phone || "+60 1X-XXX-XXXX",
    };
    setBookings((prev) => [...prev, newBooking]);
    setSelectedDateKey(form.date);
    setNewOpen(false);
    setForm({
      customer: "",
      phone: "",
      service: "Consultation",
      date: todayKey,
      time: "10:00 AM",
      duration: "30 min",
      notes: "",
    });
    toast.success(`Appointment booked with ${newBooking.customer}`);
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
          <button
            onClick={() => setNewOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
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
                  onClick={() => {
                    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDateKey(todayKey);
                    toast("Jumped to today");
                  }}
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
                const cellKey = fmtDateKey(new Date(year, month, day));
                const isSelected = cellKey === selectedDateKey;
                const uniqueServices = Array.from(new Set(dayDots));
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDateKey(cellKey)}
                    onMouseEnter={() => setHoverDay(day)}
                    onMouseLeave={() => setHoverDay(null)}
                    className={cn(
                      "relative aspect-square rounded-lg border p-1.5 text-left transition-colors hover:bg-muted/60",
                      isSelected
                        ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                        : isToday
                        ? "border-primary/60 bg-primary/10"
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
                    {hoverDay === day && uniqueServices.length > 0 && (
                      <div className="absolute left-1/2 top-full z-10 mt-1 w-max -translate-x-1/2 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] shadow-xl">
                        <div className="font-semibold">{prettyDate(cellKey)}</div>
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          {uniqueServices.map((s) => (
                            <div key={s} className="flex items-center gap-1">
                              <div className={cn("h-1.5 w-1.5 rounded-full", SERVICE_TYPES[s])} />
                              <span className="text-muted-foreground">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
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

          {/* Bookings for selected day */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-sm font-semibold">
                  {selectedDateKey === todayKey
                    ? "Today's Bookings"
                    : `Bookings for ${prettyDate(selectedDateKey)}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {demoClientName}
                </p>
              </div>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {selectedBookings.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No bookings — tap &quot;Book New Appointment&quot; to create one.
                </div>
              )}
              {selectedBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBookingDetail(b)}
                  className="flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted/30"
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
                      SERVICE_TYPES[b.service]
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
                        onClick={(e) => cycleBookingStatus(b, e)}
                        role="button"
                        className={cn(
                          "cursor-pointer rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-transform hover:scale-105",
                          STATUS_COLORS[b.status]
                        )}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking detail popover */}
      {bookingDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setBookingDetail(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{bookingDetail.customer}</div>
                <div className="text-[11px] text-muted-foreground">
                  {prettyDate(bookingDetail.dateKey)} · {bookingDetail.time}
                </div>
              </div>
              <button
                onClick={() => setBookingDetail(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", SERVICE_TYPES[bookingDetail.service])} />
                <span>{bookingDetail.service}</span>
                <span className="text-muted-foreground">· {bookingDetail.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{bookingDetail.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    STATUS_COLORS[bookingDetail.status]
                  )}
                >
                  {bookingDetail.status}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                onClick={() => toast(`Calling ${bookingDetail.customer}...`, { icon: "📞" })}
                className="flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-2 text-xs font-medium hover:bg-muted"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </button>
              <button
                onClick={() => {
                  toast(`Rescheduling ${bookingDetail.customer}`, { icon: "🔁" });
                  setBookingDetail(null);
                }}
                className="flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-2 text-xs font-medium hover:bg-muted"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reschedule
              </button>
              <button
                onClick={() => {
                  setBookings((prev) =>
                    prev.map((x) =>
                      x.id === bookingDetail.id ? { ...x, status: "Cancelled" as BookingStatus } : x
                    )
                  );
                  toast.error(`Cancelled ${bookingDetail.customer}'s booking`);
                  setBookingDetail(null);
                }}
                className="flex items-center justify-center gap-1 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New booking modal */}
      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setNewOpen(false)}
        >
          <form
            onSubmit={handleBook}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Book New Appointment</h3>
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Customer name *
                </label>
                <input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  list="malay-names"
                  placeholder="Start typing..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <datalist id="malay-names">
                  {MALAY_NAMES.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+60 12-345-6789"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Service
                  </label>
                  <select
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value as Service })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {Object.keys(SERVICE_TYPES).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Duration
                  </label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option>20 min</option>
                    <option>30 min</option>
                    <option>45 min</option>
                    <option>60 min</option>
                    <option>90 min</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Time
                  </label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special requests, context..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
              >
                Book Appointment
              </button>
            </div>
          </form>
        </div>
      )}
    </PageWrapper>
  );
}
