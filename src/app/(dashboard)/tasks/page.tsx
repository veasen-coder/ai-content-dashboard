"use client";

import { useState, useEffect, useCallback } from "react";
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
  X,
  Calendar,
  User,
  AlertCircle,
  Trash2,
  UserPlus,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// --------------- Types ---------------

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
  description?: string;
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

// --------------- Constants ---------------

const STATUS_ORDER: Record<string, number> = {
  "to do": 0,
  "in progress": 1,
  complete: 2,
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

const PRIORITY_OPTIONS = [
  { id: "1", value: "urgent", label: "Urgent", color: "#f50000" },
  { id: "2", value: "high", label: "High", color: "#f8ae00" },
  { id: "3", value: "normal", label: "Normal", color: "#6fddff" },
  { id: "4", value: "low", label: "Low", color: "#d8d8d8" },
];

const STATUS_OPTIONS = [
  { value: "to do", label: "To Do", color: "#87909e" },
  { value: "in progress", label: "In Progress", color: "#1090e0" },
  { value: "complete", label: "Complete", color: "#008844" },
];

const TEAM_MEMBERS = [
  { id: 107691572, username: "Veasen Teh", initials: "VT", color: "#006063" },
  { id: 107691573, username: "Way Hann", initials: "WH", color: "#b388ff" },
];

// --------------- Helpers ---------------

function formatDueDate(timestamp: string | null): {
  text: string;
  isOverdue: boolean;
} {
  if (!timestamp) return { text: "", isOverdue: false };
  const date = new Date(parseInt(timestamp));
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1)
    return { text: `${Math.abs(diffDays)} days ago`, isOverdue: true };
  if (diffDays === -1) return { text: "Yesterday", isOverdue: true };
  if (diffDays === 0) return { text: "Today", isOverdue: false };
  if (diffDays === 1) return { text: "Tomorrow", isOverdue: false };

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return { text: `${month}/${day}/${year}`, isOverdue: diffDays < 0 };
}

// --------------- Sub-components ---------------

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

function TaskDetailDrawer({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  if (!task) return null;

  const due = formatDueDate(task.due_date);
  const priorityLabel = task.priority
    ? PRIORITY_LABELS[task.priority.priority] || task.priority.priority
    : null;
  const priorityColor = task.priority
    ? PRIORITY_COLORS[task.priority.priority] || "#6B7280"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md animate-in slide-in-from-right border-l border-[#1E1E1E] bg-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">Task Details</h2>
          <div className="flex items-center gap-2">
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              title="Open in ClickUp"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: "calc(100vh - 65px)" }}>
          {/* Task Name */}
          <h3 className="text-lg font-semibold leading-snug">{task.name}</h3>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <div
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: task.status.color || "#87909e" }}
            >
              {task.status.status}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Priority
            </label>
            {priorityLabel ? (
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: priorityColor || undefined }}
              >
                <Flag className="h-4 w-4" />
                {priorityLabel}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/50">None</span>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Due Date
            </label>
            {due.text ? (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-mono ${
                  due.isOverdue ? "text-[#EF4444]" : "text-foreground"
                }`}
              >
                <Calendar className="h-4 w-4" />
                {due.text}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/50">No due date</span>
            )}
          </div>

          {/* Assignees */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Assignees
            </label>
            {task.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2"
                  >
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: a.color || "#6B7280" }}
                    >
                      {a.initials}
                    </div>
                    <span className="text-sm">{a.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground/50">Unassigned</span>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag.name}
                    className="rounded-md px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: tag.tag_bg || "#1E1E1E",
                      color: tag.tag_fg || "#F5F5F5",
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </div>
            </div>
          )}

          {/* Open in ClickUp */}
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Open in ClickUp
          </a>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onClick, selected, onToggleSelect }: { task: Task; onClick: () => void; selected: boolean; onToggleSelect: (id: string) => void }) {
  const due = formatDueDate(task.due_date);
  const priorityLabel = task.priority
    ? PRIORITY_LABELS[task.priority.priority] || task.priority.priority
    : null;
  const priorityColor = task.priority
    ? PRIORITY_COLORS[task.priority.priority] || "#6B7280"
    : null;

  return (
    <div onClick={onClick} role="button" tabIndex={0} className={`group flex cursor-pointer items-center gap-4 border-b border-[#1E1E1E] px-4 py-3 transition-colors hover:bg-[#1A1A1A] ${selected ? "bg-primary/5" : ""}`}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        {selected ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>
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
      <div className="flex w-28 items-center justify-center -space-x-1">
        {task.assignees.length > 0 ? (
          task.assignees.map((a) => <AssigneeBadge key={a.id} assignee={a} />)
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[#333] text-muted-foreground">
            <User className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
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
      <div className="w-24 text-right">
        {priorityLabel ? (
          <span
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: priorityColor || undefined }}
          >
            <Flag
              className="h-3.5 w-3.5"
              style={{ color: priorityColor || undefined }}
            />
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

function StatusSection({ group, onTaskClick, selectedIds, onToggleSelect }: { group: StatusGroup; onTaskClick: (task: Task) => void; selectedIds: Set<string>; onToggleSelect: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(group.type !== "closed");

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[#111111]"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div
          className="flex h-5 items-center rounded px-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: group.color || "#87909e" }}
        >
          {group.status}
        </div>
        <span className="ml-1 text-sm font-mono text-muted-foreground">
          {group.tasks.length}
        </span>
      </button>
      {isOpen && (
        <div className="mt-1 overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#111111]">
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
            <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} selected={selectedIds.has(task.id)} onToggleSelect={onToggleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// --------------- Add Task Modal ---------------

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function AddTaskModal({ isOpen, onClose, onCreated }: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("to do");
  const [priority, setPriority] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setStatus("to do");
    setPriority(null);
    setDueDate("");
    setAssignees([]);
  }

  function toggleAssignee(id: number) {
    setAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        status,
      };

      if (description.trim()) body.description = description.trim();
      if (priority) body.priority = parseInt(priority);
      if (dueDate) body.due_date = new Date(dueDate).getTime();
      if (assignees.length > 0) body.assignees = assignees;

      const res = await fetch("/api/clickup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create task");
      }

      toast.success("Task created in ClickUp");
      reset();
      onClose();
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create task"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">Create Task</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Task Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Task Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter task name..."
              autoFocus
              required
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Status + Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                      status === opt.value
                        ? "text-white ring-1 ring-white/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{
                      backgroundColor:
                        status === opt.value ? opt.color : "#1E1E1E",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setPriority(priority === opt.id ? null : opt.id)
                    }
                    className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                      priority === opt.id
                        ? "ring-1 ring-white/20"
                        : "bg-[#1E1E1E] text-muted-foreground hover:text-foreground"
                    }`}
                    style={{
                      backgroundColor:
                        priority === opt.id ? opt.color + "30" : undefined,
                      color: priority === opt.id ? opt.color : undefined,
                    }}
                  >
                    <Flag className="h-3 w-3" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due Date + Assignees Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Due Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            {/* Assignees */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Assignees
              </label>
              <div className="flex gap-2">
                {TEAM_MEMBERS.map((member) => {
                  const isSelected = assignees.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleAssignee(member.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        isSelected
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.initials}
                      </div>
                      {member.initials}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Task will be created in ClickUp
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const allIds = filtered.map((t) => t.id);
    setSelectedIds(new Set(allIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setShowAssignDropdown(false);
  }

  async function bulkDelete() {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} task(s)? This cannot be undone.`)) return;

    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch("/api/clickup/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_id: id }),
          })
        )
      );
      toast.success(`${count} task(s) deleted`);
      clearSelection();
      fetchTasks();
    } catch {
      toast.error("Failed to delete some tasks");
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkAssign(assigneeIds: number[]) {
    if (!selectedIds.size) return;
    const count = selectedIds.size;

    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch("/api/clickup/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              task_id: id,
              assignees: { add: assigneeIds },
            }),
          })
        )
      );
      toast.success(`${count} task(s) assigned`);
      setShowAssignDropdown(false);
      clearSelection();
      fetchTasks();
    } catch {
      toast.error("Failed to assign some tasks");
    } finally {
      setBulkLoading(false);
    }
  }

  const fetchTasks = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/clickup/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      const topLevel = (data.tasks || []).filter((t: Task) => !t.parent);
      setTasks(topLevel);
      setLastFetched(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Filter tasks by search
  const filtered = search
    ? tasks.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : tasks;

  // Group by status
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

  const sorted = Array.from(statusMap.values()).sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
  );

  return (
    <PageWrapper title="Tasks" lastSynced={lastFetched}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
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
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium text-primary">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-[#1E1E1E]" />
            <button
              onClick={selectAll}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Select all ({filtered.length})
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
            <div className="flex-1" />

            {/* Assign dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </button>
              {showAssignDropdown && (
                <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-[#1E1E1E] bg-[#111111] p-2 shadow-2xl">
                  {TEAM_MEMBERS.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => bulkAssign([member.id])}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[#1E1E1E]"
                    >
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.initials}
                      </div>
                      {member.username}
                    </button>
                  ))}
                  <div className="my-1 border-t border-[#1E1E1E]" />
                  <button
                    onClick={() => bulkAssign(TEAM_MEMBERS.map((m) => m.id))}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[#1E1E1E]"
                  >
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    Assign both
                  </button>
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={bulkDelete}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 w-32 animate-pulse rounded-lg bg-[#1E1E1E]" />
                <div className="space-y-3 rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
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

        {/* Error */}
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
                <StatusSection key={group.status} group={group} onTaskClick={setSelectedTask} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
              ))
            )}
          </>
        )}
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchTasks}
      />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </PageWrapper>
  );
}
