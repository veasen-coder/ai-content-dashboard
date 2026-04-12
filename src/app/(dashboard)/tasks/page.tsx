"use client";

import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  ExternalLink,
  Plus,
  Link2,
  Flag,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Assignee {
  id: number;
  username: string;
  initials: string;
  color: string | null;
  profilePicture: string | null;
}

interface Task {
  id: string;
  name: string;
  status: { status: string; color: string; type: string };
  priority: { id: string; priority: string; color: string } | null;
  due_date: string | null;
  assignees: Assignee[];
  tags: { name: string; tag_bg: string; tag_fg: string }[];
  url: string;
  parent: string | null;
  subtask_count?: number;
}

interface StatusGroup {
  status: string;
  color: string;
  type: string;
  tasks: Task[];
}

const STATUS_ORDER: Record<string, number> = {
  complete: 0,
  "in progress": 1,
  "to do": 2,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#f50000",
  high: "#f8ae00",
  normal: "#6fddff",
  low: "#d8d8d8",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

function formatDueDate(timestamp: string | null): {
  text: string;
  isOverdue: boolean;
} {
  if (!timestamp) return { text: "", isOverdue: false };
  const date = new Date(parseInt(timestamp));
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) {
    return {
      text: `${Math.abs(diffDays)} days ago`,
      isOverdue: true,
    };
  }
  if (diffDays === -1) return { text: "Yesterday", isOverdue: true };
  if (diffDays === 0) return { text: "Today", isOverdue: false };
  if (diffDays === 1) return { text: "Tomorrow", isOverdue: false };

  // Format as M/D/YY
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  const isOverdue = diffDays < 0;
  return { text: `${month}/${day}/${year}`, isOverdue };
}

function AssigneeBadge({ assignee }: { assignee: Assignee }) {
  const bgColor = assignee.color || "#6B7280";
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: bgColor }}
      title={assignee.username}
    >
      {assignee.initials}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const due = formatDueDate(task.due_date);
  const priorityLabel = task.priority
    ? PRIORITY_LABELS[task.priority.priority] || task.priority.priority
    : null;
  const priorityColor = task.priority
    ? PRIORITY_COLORS[task.priority.priority] || "#6B7280"
    : null;

  return (
    <div className="group flex items-center gap-4 border-b border-[#1E1E1E] px-4 py-3 transition-colors hover:bg-[#1A1A1A]">
      {/* Name */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="truncate text-sm font-medium text-foreground">
          {task.name}
        </span>
        {task.subtask_count && task.subtask_count > 0 ? (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
            <Link2 className="h-3 w-3" />
            {task.subtask_count}
          </span>
        ) : null}
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </a>
      </div>

      {/* Assignees */}
      <div className="flex w-28 items-center justify-center -space-x-1">
        {task.assignees.length > 0 ? (
          task.assignees.map((a) => <AssigneeBadge key={a.id} assignee={a} />)
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[#333] text-muted-foreground">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Due Date */}
      <div className="w-28 text-center">
        {due.text ? (
          <span
            className={`text-sm font-mono ${
              due.isOverdue ? "text-[#EF4444]" : "text-muted-foreground"
            }`}
          >
            {due.text}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/40">—</span>
        )}
      </div>

      {/* Priority */}
      <div className="w-24 text-right">
        {priorityLabel ? (
          <span
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: priorityColor || undefined }}
          >
            <Flag className="h-3.5 w-3.5" style={{ color: priorityColor || undefined }} />
            {priorityLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/40">
            <Flag className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

function StatusSection({ group }: { group: StatusGroup }) {
  const [isOpen, setIsOpen] = useState(group.type !== "closed");

  const statusIcon = () => {
    if (group.type === "closed") {
      return (
        <div
          className="flex h-5 items-center rounded px-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: group.color }}
        >
          {group.status}
        </div>
      );
    }
    if (group.status === "in progress") {
      return (
        <div
          className="flex h-5 items-center rounded px-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: group.color }}
        >
          {group.status}
        </div>
      );
    }
    return (
      <div
        className="flex h-5 items-center rounded px-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: group.color || "#87909e" }}
      >
        {group.status}
      </div>
    );
  };

  return (
    <div className="mb-4">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-2 py-2 transition-colors hover:bg-[#111111] rounded-lg"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {statusIcon()}
        <span className="ml-1 text-sm font-mono text-muted-foreground">
          {group.tasks.length}
        </span>
      </button>

      {/* Tasks */}
      {isOpen && (
        <div className="mt-1 rounded-xl border border-[#1E1E1E] bg-[#111111] overflow-hidden">
          {/* Column Headers */}
          <div className="flex items-center gap-4 border-b border-[#1E1E1E] px-4 py-2">
            <span className="flex-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </span>
            <span className="w-28 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Assignee
            </span>
            <span className="w-28 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Due date
            </span>
            <span className="w-24 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Priority
            </span>
          </div>
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  async function fetchTasks() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/clickup/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      // Filter out subtasks (tasks with a parent)
      const topLevel = (data.tasks || []).filter(
        (t: Task) => !t.parent
      );
      setTasks(topLevel);
      setLastFetched(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchTasks();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchTasks, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter tasks by search
  const filtered = search
    ? tasks.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : tasks;

  // Group by status
  const grouped: StatusGroup[] = [];
  const statusMap = new Map<string, StatusGroup>();

  for (const task of filtered) {
    const key = task.status.status;
    if (!statusMap.has(key)) {
      statusMap.set(key, {
        status: task.status.status,
        color: task.status.color,
        type: task.status.type,
        tasks: [],
      });
    }
    statusMap.get(key)!.tasks.push(task);
  }

  // Sort groups by status order
  const sorted = Array.from(statusMap.values()).sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
  );

  return (
    <PageWrapper title="Tasks" lastSynced={lastFetched}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={fetchTasks}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 w-32 animate-pulse rounded-lg bg-[#1E1E1E]" />
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4 space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="h-10 animate-pulse rounded bg-[#1E1E1E]"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={fetchTasks}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Task Groups */}
        {!loading && !error && (
          <>
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
                <p className="text-sm text-muted-foreground">
                  {search ? "No tasks match your search" : "No tasks found"}
                </p>
              </div>
            ) : (
              sorted.map((group) => (
                <StatusSection key={group.status} group={group} />
              ))
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
