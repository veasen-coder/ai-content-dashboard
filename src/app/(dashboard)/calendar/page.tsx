"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  ExternalLink,
  RefreshCw,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCensor } from "@/hooks/use-censor";
import { getWaBackendUrl, fetchActiveSessionId, type Booking } from "@/lib/wa-backend";
import { Bell, CheckCircle2, XCircle } from "lucide-react";

// --------------- Types ---------------

interface CalendarEvent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  statusColor: string;
  priority: string | null;
  priorityColor: string | null;
  dueDate: number | null;
  startDate: number | null;
  assignees: {
    id: number;
    username: string;
    initials: string;
    profilePicture: string | null;
  }[];
  tags: { name: string; bg: string; fg: string }[];
  url: string;
}

// --------------- Helpers ---------------

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad start of month to align with weekday
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Pad end to fill 6 rows (42 cells)
  while (days.length < 42) {
    const next = days.length - startPad - lastDay.getDate() + 1;
    days.push(new Date(year, month + 1, next));
  }

  return days;
}

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "#EF4444" },
  high: { label: "High", color: "#F59E0B" },
  normal: { label: "Normal", color: "#3B82F6" },
  low: { label: "Low", color: "#6B7280" },
};

// --------------- Event Modal ---------------

function EventModal({
  mode,
  event,
  initialDate,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "add" | "edit";
  event?: CalendarEvent;
  initialDate?: Date;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState(event?.name || "");
  const [description, setDescription] = useState(event?.description || "");
  const [date, setDate] = useState(() => {
    if (event?.dueDate) {
      return new Date(event.dueDate).toISOString().split("T")[0];
    }
    if (initialDate) {
      return initialDate.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  });
  const [time, setTime] = useState(() => {
    if (event?.dueDate) {
      const d = new Date(event.dueDate);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "10:00";
  });
  const [priority, setPriority] = useState(() => {
    if (event?.priority) {
      const map: Record<string, number> = {
        urgent: 1,
        high: 2,
        normal: 3,
        low: 4,
      };
      return map[event.priority] || 3;
    }
    return 3;
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSave() {
    if (!name.trim() || !date) return;
    setSaving(true);

    try {
      const [y, m, d] = date.split("-").map(Number);
      const [hr, min] = (time || "00:00").split(":").map(Number);
      const dueMs = new Date(y, m - 1, d, hr, min).getTime();

      if (mode === "add") {
        const res = await fetch("/api/clickup/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            dueDate: dueMs,
            startDate: dueMs,
            priority,
            assignToTeam: true,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "Failed to create event");
          return;
        }
        const data = await res.json();
        toast.success(data.message || "Event created!");
      } else {
        // Edit existing
        const res = await fetch("/api/clickup/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: event!.id,
            name: name.trim(),
            description: description.trim(),
            due_date: dueMs,
            due_date_time: true,
            start_date: dueMs,
            start_date_time: true,
            priority,
          }),
        });
        if (!res.ok) {
          toast.error("Failed to update event");
          return;
        }
        toast.success("Event updated!");
      }
      onSaved();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/clickup/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: event.id }),
      });
      if (!res.ok) {
        toast.error("Failed to delete event");
        return;
      }
      toast.success("Event deleted");
      onDeleted?.();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">
            {mode === "add" ? "Add Event" : "Edit Event"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Event Name *
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client Demo, Team Standup"
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#7B68EE] focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda, notes..."
              rows={2}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#7B68EE] focus:outline-none resize-none"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground focus:border-[#7B68EE] focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground focus:border-[#7B68EE] focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Priority
            </label>
            <div className="flex gap-2">
              {[
                { value: 1, label: "Urgent", color: "#EF4444" },
                { value: 2, label: "High", color: "#F59E0B" },
                { value: 3, label: "Normal", color: "#3B82F6" },
                { value: 4, label: "Low", color: "#6B7280" },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    priority === p.value
                      ? "border-current"
                      : "border-[#1E1E1E] hover:border-[#2E2E2E]"
                  }`}
                  style={{
                    color: priority === p.value ? p.color : "#6B7280",
                    backgroundColor:
                      priority === p.value ? `${p.color}15` : "transparent",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees info */}
          <div className="rounded-lg bg-[#0A0A0A] border border-[#1E1E1E] px-3 py-2">
            <p className="text-[10px] text-muted-foreground mb-1.5">
              {mode === "add"
                ? "Auto-assigned & notified:"
                : "Current assignees:"}
            </p>
            <div className="flex items-center gap-3">
              {mode === "edit" && event?.assignees.length ? (
                event.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E1E1E] text-[8px] font-bold text-muted-foreground">
                      {a.initials}
                    </div>
                    <span className="text-xs">{a.username}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b388ff]/20 text-[8px] font-bold text-[#b388ff]">
                      WH
                    </div>
                    <span className="text-xs">Way Hann</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#006063]/20 text-[8px] font-bold text-[#26A69A]">
                      VT
                    </div>
                    <span className="text-xs">Veasen</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Open in ClickUp */}
          {mode === "edit" && event?.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-[#1E1E1E] px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-[#1A1A1A] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open in ClickUp
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {mode === "edit" && (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#DC2626] disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[#1E1E1E] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm text-muted-foreground hover:bg-[#1A1A1A] hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !date || saving}
              className="flex items-center gap-2 rounded-lg bg-[#7B68EE] px-4 py-2 text-sm font-medium text-white hover:bg-[#6C5CE7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {mode === "add" ? "Creating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  {mode === "add" ? "Create Event" : "Save Changes"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function CalendarPage() {
  const censor = useCensor();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarUrl, setCalendarUrl] = useState("https://app.clickup.com");
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waSessionId, setWaSessionId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    const base = getWaBackendUrl();
    if (!base) return;
    let sid = waSessionId;
    if (!sid) {
      sid = await fetchActiveSessionId();
      if (sid) setWaSessionId(sid);
    }
    if (!sid) return;
    try {
      const res = await fetch(`${base}/api/sessions/${sid}/bookings`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const data = (await res.json()) as { bookings?: Booking[] };
      setBookings(data.bookings || []);
    } catch { /* silent */ }
  }, [waSessionId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const unreadBookings = bookings.filter(b => !b.read_by_owner);

  async function markBookingRead(id: string) {
    const base = getWaBackendUrl();
    if (!base || !waSessionId) return;
    await fetch(`${base}/api/sessions/${waSessionId}/bookings/${id}/read`, { method: "POST" });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, read_by_owner: 1 } : b));
  }

  async function markAllBookingsRead() {
    const base = getWaBackendUrl();
    if (!base || !waSessionId) return;
    await fetch(`${base}/api/sessions/${waSessionId}/bookings/read-all`, { method: "POST" });
    setBookings(prev => prev.map(b => ({ ...b, read_by_owner: 1 })));
    toast.success("All booking notifications cleared");
  }

  async function updateBookingStatus(id: string, status: "confirmed" | "cancelled") {
    const base = getWaBackendUrl();
    if (!base || !waSessionId) return;
    await fetch(`${base}/api/sessions/${waSessionId}/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status, read_by_owner: 1 } : b));
    toast.success(status === "confirmed" ? "Booking confirmed" : "Booking cancelled");
  }

  // Modal state
  const [modal, setModal] = useState<{
    mode: "add" | "edit";
    event?: CalendarEvent;
    initialDate?: Date;
  } | null>(null);

  // Selected day for list view
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch events for the visible month range (include padding days)
      const from = new Date(year, month, -6).getTime();
      const to = new Date(year, month + 1, 7).getTime();

      const res = await fetch(
        `/api/clickup/calendar?from=${from}&to=${to}&include_closed=true`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.calendarUrl) setCalendarUrl(data.calendarUrl);
        setLastFetched(new Date().toISOString());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigation
  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today);
  }

  // Get events for a specific day
  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((e) => {
      if (!e.dueDate) return false;
      return isSameDay(new Date(e.dueDate), day);
    });
  }

  const days = getMonthDays(year, month);
  const selectedDayEvents = getEventsForDay(selectedDay);

  return (
    <PageWrapper title="Calendar" lastSynced={lastFetched}>
      <div className="space-y-6">
        {/* Bookings panel — shown only when bookings exist or unread */}
        {(bookings.length > 0 || unreadBookings.length > 0) && (
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-3">
              <div className="flex items-center gap-2">
                <Bell className={`h-4 w-4 ${unreadBookings.length > 0 ? "text-amber-400 animate-pulse" : "text-muted-foreground"}`} />
                <h2 className="text-sm font-semibold">Bookings</h2>
                {unreadBookings.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    {unreadBookings.length} NEW
                  </span>
                )}
              </div>
              {unreadBookings.length > 0 && (
                <button onClick={markAllBookingsRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground">
                  Mark all read
                </button>
              )}
            </div>
            <div className="divide-y divide-[#1E1E1E]/60">
              {bookings.slice(0, 10).map(b => {
                const when = new Date(b.start_at);
                const whenStr = when.toLocaleString("en-GB", {
                  weekday: "short", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit", hour12: false,
                });
                const statusColor = b.status === "confirmed" ? "text-emerald-400 bg-emerald-500/10"
                  : b.status === "cancelled" ? "text-red-400 bg-red-500/10"
                  : "text-amber-400 bg-amber-500/10";
                return (
                  <div key={b.id} className={`flex items-center gap-3 px-5 py-3 ${!b.read_by_owner ? "bg-amber-500/5" : ""}`}>
                    {!b.read_by_owner && <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{censor.short(b.contact_name, 10)}</p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{censor.short(b.meeting_type, 10)}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusColor}`}>{b.status}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {whenStr} · {b.duration_mins}min · {b.location || "Location TBC"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {b.status === "pending" && (
                        <>
                          <button onClick={() => updateBookingStatus(b.id, "confirmed")}
                            title="Confirm"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => updateBookingStatus(b.id, "cancelled")}
                            title="Cancel"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 hover:bg-red-500/10 transition-colors">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {!b.read_by_owner && (
                        <button onClick={() => markBookingRead(b.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground px-2">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-[180px] text-center text-sm font-semibold">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="rounded-lg border border-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] px-3 py-2 text-xs text-muted-foreground hover:bg-[#1A1A1A] hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              ClickUp Calendar
            </a>
            <button
              onClick={() =>
                setModal({ mode: "add", initialDate: selectedDay })
              }
              className="flex items-center gap-2 rounded-lg bg-[#7B68EE] px-4 py-2 text-sm font-medium text-white hover:bg-[#6C5CE7] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Calendar Grid */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[#1E1E1E]">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const isCurrentMonth = day.getMonth() === month;
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const dayEvents = getEventsForDay(day);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`relative flex flex-col items-start border-b border-r border-[#1E1E1E] p-1.5 min-h-[90px] transition-colors text-left ${
                      isSelected
                        ? "bg-[#7B68EE]/5"
                        : "hover:bg-[#0A0A0A]"
                    } ${!isCurrentMonth ? "opacity-40" : ""}`}
                  >
                    {/* Day number */}
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-[#7B68EE] text-white"
                          : isSelected
                          ? "text-[#7B68EE] font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </span>

                    {/* Event dots / pills */}
                    <div className="mt-0.5 w-full space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer hover:bg-[#1E1E1E] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ mode: "edit", event: ev });
                          }}
                          title={censor.short(ev.name, 10)}
                        >
                          <div
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: ev.statusColor }}
                          />
                          <span className="text-[10px] font-medium truncate">
                            {censor.short(ev.name, 10)}
                          </span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground px-1">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side Panel — Selected Day Detail */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">
                  {selectedDay.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                {isSameDay(selectedDay, today) && (
                  <span className="text-[10px] text-[#7B68EE] font-medium">
                    Today
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setModal({ mode: "add", initialDate: selectedDay })
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B68EE]/10 text-[#7B68EE] hover:bg-[#7B68EE]/20 transition-colors"
                title="Add event on this day"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-lg border border-[#1E1E1E] bg-[#0A0A0A]"
                  />
                ))}
              </div>
            ) : selectedDayEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => {
                  const dueDate = ev.dueDate ? new Date(ev.dueDate) : null;
                  const timeStr = dueDate
                    ? dueDate.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null;
                  const pri = ev.priority
                    ? PRIORITY_MAP[ev.priority]
                    : null;

                  return (
                    <div
                      key={ev.id}
                      className="group rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3 hover:border-[#2E2E2E] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor: ev.statusColor,
                              }}
                            />
                            <p className="text-xs font-semibold truncate">
                              {censor.short(ev.name, 10)}
                            </p>
                          </div>

                          {/* Time + Priority */}
                          <div className="flex items-center gap-2 mt-1.5">
                            {timeStr && timeStr !== "00:00" && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">
                                  {timeStr}
                                </span>
                              </div>
                            )}
                            {pri && (
                              <span
                                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                style={{
                                  color: pri.color,
                                  backgroundColor: `${pri.color}15`,
                                }}
                              >
                                {pri.label}
                              </span>
                            )}
                            <span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-[#1E1E1E] text-muted-foreground capitalize">
                              {ev.status}
                            </span>
                          </div>

                          {/* Description */}
                          {ev.description && (
                            <p className={`text-[10px] text-muted-foreground mt-1.5 line-clamp-2 ${censor.blurClass}`}>
                              {ev.description}
                            </p>
                          )}

                          {/* Assignees */}
                          {ev.assignees.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              {ev.assignees.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E1E1E] text-[7px] font-bold text-muted-foreground"
                                  title={a.username}
                                >
                                  {a.initials}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setModal({ mode: "edit", event: ev })
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground transition-colors"
                            title="Open in ClickUp"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No events on this day</p>
                <button
                  onClick={() =>
                    setModal({ mode: "add", initialDate: selectedDay })
                  }
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#7B68EE]/10 px-3 py-1.5 text-[11px] font-medium text-[#7B68EE] hover:bg-[#7B68EE]/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Event
                </button>
              </div>
            )}

            {/* Upcoming summary */}
            {events.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1E1E1E]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  All events this month
                </p>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {events
                    .filter((e) => {
                      if (!e.dueDate) return false;
                      const d = new Date(e.dueDate);
                      return (
                        d.getMonth() === month && d.getFullYear() === year
                      );
                    })
                    .map((ev) => {
                      const d = ev.dueDate ? new Date(ev.dueDate) : null;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => {
                            if (d) setSelectedDay(d);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#0A0A0A] transition-colors"
                        >
                          <div
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: ev.statusColor }}
                          />
                          <span className="text-[10px] font-medium truncate flex-1">
                            {censor.short(ev.name, 10)}
                          </span>
                          <span className="text-[9px] text-muted-foreground shrink-0">
                            {d
                              ? d.toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : ""}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Refresh */}
        <div className="flex justify-center pt-2">
          <button
            onClick={fetchEvents}
            className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Calendar
          </button>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          mode={modal.mode}
          event={modal.event}
          initialDate={modal.initialDate}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            fetchEvents();
          }}
          onDeleted={() => {
            setModal(null);
            fetchEvents();
          }}
        />
      )}
    </PageWrapper>
  );
}
