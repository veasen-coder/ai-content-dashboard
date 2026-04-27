"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  X,
  Search,
  RefreshCw,
  Calendar,
  Flag,
  Trash2,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  AlertOctagon,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCensor } from "@/hooks/use-censor";

// --------------- Types ---------------

interface Member {
  id: string;
  name: string;
  role: string | null;
  initials: string;
  color_hex: string;
  bg_hex: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  member_id: string;
  event_id: string | null;
  needs_qc: boolean;
  created_at: string;
  updated_at: string;
  member: Member | null;
}

interface Comment {
  id: string;
  task_id: string;
  member_id: string;
  content: string;
  created_at: string;
  member: Member | null;
}

type TaskStatus = "todo" | "in-progress" | "blocked" | "done";
type TaskPriority = "normal" | "high";

// --------------- Constants ---------------

const STATUSES: {
  value: TaskStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof Circle;
}[] = [
  {
    value: "todo",
    label: "To Do",
    color: "#94A3B8",
    bg: "#94A3B81A",
    border: "#94A3B833",
    icon: Circle,
  },
  {
    value: "in-progress",
    label: "In Progress",
    color: "#3B82F6",
    bg: "#3B82F61A",
    border: "#3B82F633",
    icon: Clock,
  },
  {
    value: "blocked",
    label: "Blocked",
    color: "#EF4444",
    bg: "#EF44441A",
    border: "#EF444433",
    icon: AlertOctagon,
  },
  {
    value: "done",
    label: "Done",
    color: "#10B981",
    bg: "#10B9811A",
    border: "#10B98133",
    icon: CheckCircle2,
  },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

// --------------- Helpers ---------------

function formatDueDate(dateStr: string | null): {
  text: string;
  isOverdue: boolean;
  isToday: boolean;
} {
  if (!dateStr) return { text: "", isOverdue: false, isToday: false };
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1)
    return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false };
  if (diffDays === -1) return { text: "Yesterday", isOverdue: true, isToday: false };
  if (diffDays === 0) return { text: "Today", isOverdue: false, isToday: true };
  if (diffDays === 1) return { text: "Tomorrow", isOverdue: false, isToday: false };
  if (diffDays < 7) return { text: `In ${diffDays}d`, isOverdue: false, isToday: false };
  return {
    text: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    isOverdue: false,
    isToday: false,
  };
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// --------------- Component ---------------

export default function TasksPage() {
  const censor = useCensor();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<string>("all"); // member id or "all"
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // --------------- Fetch ---------------

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, mRes] = await Promise.all([
        fetch("/api/supabase/tasks"),
        fetch("/api/supabase/members"),
      ]);
      if (!tRes.ok) throw new Error("Failed to load tasks");
      if (!mRes.ok) throw new Error("Failed to load members");
      const tData: Task[] = await tRes.json();
      const mData: Member[] = await mRes.json();
      setTasks(tData);
      setMembers(mData);
      setLastSynced(new Date().toISOString());
    } catch (err) {
      toast.error((err as Error).message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // --------------- Mutations ---------------

  async function updateTask(id: string, updates: Partial<Task>) {
    // Optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    if (selectedTask?.id === id) {
      setSelectedTask((s) => (s ? { ...s, ...updates } : s));
    }

    try {
      const res = await fetch("/api/supabase/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (selectedTask?.id === id) setSelectedTask(updated);
    } catch {
      toast.error("Update failed — refreshing");
      fetchTasks();
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/supabase/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSelectedTask(null);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  }

  // --------------- Filtering / Grouping ---------------

  const filtered = useMemo(() => {
    let result = tasks;
    if (memberFilter !== "all") {
      result = result.filter((t) => t.member_id === memberFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [tasks, memberFilter, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      "in-progress": [],
      blocked: [],
      done: [],
    };
    filtered.forEach((t) => map[t.status].push(t));
    return map;
  }, [filtered]);

  const counts = useMemo(() => {
    return {
      total: tasks.length,
      open: tasks.filter((t) => t.status !== "done").length,
      overdue: tasks.filter(
        (t) =>
          t.status !== "done" &&
          t.due_date &&
          new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0))
      ).length,
    };
  }, [tasks]);

  // --------------- Render ---------------

  return (
    <PageWrapper
      title="Tasks"
      lastSynced={lastSynced}
      headerExtra={
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <span className="font-mono text-foreground">{counts.open}</span> open
          </span>
          {counts.overdue > 0 && (
            <span className="text-red-400">
              <span className="font-mono">{counts.overdue}</span> overdue
            </span>
          )}
        </div>
      }
    >
      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Member filter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMemberFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              memberFilter === "all"
                ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
            )}
          >
            All members
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberFilter(m.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                memberFilter === m.id
                  ? "bg-[#7C3AED]/20 text-foreground"
                  : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
              )}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: m.bg_hex, color: m.color_hex }}
              >
                {m.initials}
              </span>
              <span className={censor.blurClass}>
                {censor.name(m.name.split(" ")[0])}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-48 rounded-lg border border-[#1E1E1E] bg-[#111111] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7C3AED]/90"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Board */}
      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((status) => {
            const Icon = status.icon;
            const items = grouped[status.value];
            return (
              <div
                key={status.value}
                className="flex min-h-[200px] flex-col rounded-xl border border-[#1E1E1E] bg-[#0F0F0F]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-[#1E1E1E] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: status.color }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {status.label}
                    </span>
                    <span className="rounded-md bg-[#1E1E1E] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 p-2">
                  {items.length === 0 ? (
                    <div className="flex h-20 items-center justify-center text-xs text-muted-foreground/60">
                      No tasks
                    </div>
                  ) : (
                    items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        members={members}
                        onClick={() => setSelectedTask(task)}
                        onStatusChange={(s) =>
                          updateTask(task.id, { status: s })
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          members={members}
          defaultMemberId={memberFilter !== "all" ? memberFilter : members[0]?.id}
          onClose={() => setShowAddModal(false)}
          onCreated={(t) => {
            setTasks((prev) => [t, ...prev]);
            setShowAddModal(false);
            toast.success("Task created");
          }}
        />
      )}

      {/* Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </PageWrapper>
  );
}

// --------------- TaskCard ---------------

function TaskCard({
  task,
  members,
  onClick,
  onStatusChange,
}: {
  task: Task;
  members: Member[];
  onClick: () => void;
  onStatusChange: (s: TaskStatus) => void;
}) {
  const censor = useCensor();
  const due = formatDueDate(task.due_date);
  const member = task.member ?? members.find((m) => m.id === task.member_id);
  const status = STATUS_MAP[task.status];

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-left transition-colors hover:border-[#7C3AED]/40"
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("line-clamp-2 text-sm font-medium text-foreground", censor.blurClass)}>
            {task.title}
          </p>
        </div>
        {task.priority === "high" && (
          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-[#F59E0B] text-[#F59E0B]" />
        )}
      </div>

      {/* Description preview */}
      {task.description && (
        <p className={cn("mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground", censor.blurClass)}>
          {task.description}
        </p>
      )}

      {/* Footer row */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Status pill (clickable to cycle) */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              const idx = STATUSES.findIndex((s) => s.value === task.status);
              const next = STATUSES[(idx + 1) % STATUSES.length];
              onStatusChange(next.value);
            }}
            className="cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80"
            style={{
              color: status.color,
              backgroundColor: status.bg,
            }}
            title="Click to advance status"
          >
            {status.label}
          </span>

          {/* Due date */}
          {due.text && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px]",
                due.isOverdue
                  ? "text-red-400"
                  : due.isToday
                  ? "text-amber-400"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {due.text}
            </span>
          )}
        </div>

        {/* Assignee */}
        {member && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
            style={{ backgroundColor: member.bg_hex, color: member.color_hex }}
            title={member.name}
          >
            {member.initials}
          </span>
        )}
      </div>
    </button>
  );
}

// --------------- AddTaskModal ---------------

function AddTaskModal({
  members,
  defaultMemberId,
  onClose,
  onCreated,
}: {
  members: Member[];
  defaultMemberId?: string;
  onClose: () => void;
  onCreated: (t: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState(defaultMemberId || members[0]?.id || "");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!memberId) {
      toast.error("Assignee is required");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/supabase/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          due_date: dueDate || null,
          member_id: memberId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create task");
      }
      const task = await res.json();
      onCreated(task);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">New Task</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Title *
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional details..."
              className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>

          {/* Row 1: Assignee + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Assignee *
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Priority + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-[#1E1E1E] px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !memberId}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7C3AED]/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------- TaskDetailDrawer ---------------

function TaskDetailDrawer({
  task,
  members,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task;
  members: Member[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const censor = useCensor();
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descDraft, setDescDraft] = useState(task.description || "");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  // Sync drafts when task switches
  useEffect(() => {
    setTitleDraft(task.title);
    setDescDraft(task.description || "");
  }, [task.id, task.title, task.description]);

  // Load comments
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/supabase/tasks/comments?task_id=${task.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setComments(data);
      } catch {
        if (!cancelled) toast.error("Failed to load comments");
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  async function postComment() {
    if (!commentText.trim()) return;
    // Default to first member as author (single-user dashboard)
    const authorId = members[0]?.id;
    if (!authorId) {
      toast.error("No member found to attribute comment");
      return;
    }
    try {
      setPostingComment(true);
      const res = await fetch("/api/supabase/tasks/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          member_id: authorId,
          content: commentText.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setCommentText("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  }

  function handleTitleBlur() {
    const v = titleDraft.trim();
    if (!v || v === task.title) return;
    onUpdate(task.id, { title: v });
  }
  function handleDescBlur() {
    if (descDraft === (task.description || "")) return;
    onUpdate(task.id, { description: descDraft || null });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col border-l border-[#1E1E1E] bg-[#0A0A0A] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Task
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(task.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Title */}
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            className={cn(
              "w-full bg-transparent text-xl font-semibold text-foreground focus:outline-none",
              censor.blurClass
            )}
            placeholder="Task title"
          />

          {/* Meta panel */}
          <div className="mt-4 space-y-2 rounded-lg border border-[#1E1E1E] bg-[#111111] p-3">
            <DetailRow label="Status">
              <select
                value={task.status}
                onChange={(e) =>
                  onUpdate(task.id, { status: e.target.value as TaskStatus })
                }
                className="h-7 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 text-xs text-foreground focus:border-[#7C3AED] focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </DetailRow>
            <DetailRow label="Priority">
              <select
                value={task.priority}
                onChange={(e) =>
                  onUpdate(task.id, { priority: e.target.value as TaskPriority })
                }
                className="h-7 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 text-xs text-foreground focus:border-[#7C3AED] focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </DetailRow>
            <DetailRow label="Assignee">
              <select
                value={task.member_id}
                onChange={(e) =>
                  onUpdate(task.id, { member_id: e.target.value })
                }
                className="h-7 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 text-xs text-foreground focus:border-[#7C3AED] focus:outline-none"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </DetailRow>
            <DetailRow label="Due date">
              <input
                type="date"
                value={task.due_date || ""}
                onChange={(e) =>
                  onUpdate(task.id, { due_date: e.target.value || null })
                }
                className="h-7 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 text-xs text-foreground focus:border-[#7C3AED] focus:outline-none"
              />
            </DetailRow>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={handleDescBlur}
              rows={5}
              placeholder="Add details..."
              className={cn(
                "w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]",
                censor.blurClass
              )}
            />
          </div>

          {/* Comments */}
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Comments
              {comments.length > 0 && (
                <span className="rounded-md bg-[#1E1E1E] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {comments.length}
                </span>
              )}
            </div>

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {c.member && (
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold"
                          style={{
                            backgroundColor: c.member.bg_hex,
                            color: c.member.color_hex,
                          }}
                        >
                          {c.member.initials}
                        </span>
                      )}
                      <span className="text-xs font-medium text-foreground">
                        {c.member?.name || "Unknown"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelative(c.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Composer */}
            <div className="mt-3 flex items-end gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    postComment();
                  }
                }}
                rows={2}
                placeholder="Leave a comment... (⌘+Enter to send)"
                className="flex-1 resize-none rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              />
              <button
                onClick={postComment}
                disabled={postingComment || !commentText.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7C3AED] text-white transition-colors hover:bg-[#7C3AED]/90 disabled:opacity-50"
              >
                {postingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Footer meta */}
          <div className="mt-6 flex items-center gap-4 text-[10px] text-muted-foreground/70">
            <span>Created {formatRelative(task.created_at)}</span>
            {task.updated_at && task.updated_at !== task.created_at && (
              <span>Updated {formatRelative(task.updated_at)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

