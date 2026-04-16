"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  ListPlus,
  Filter,
  ArrowUpDown,
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
  "complete": 2,
  "closed": 3,
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

function getStatusOrder(status: string): number {
  return STATUS_ORDER[status.toLowerCase()] ?? 99;
}

async function updateTask(taskId: string, fields: Record<string, unknown>) {
  const res = await fetch("/api/clickup/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId, ...fields }),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
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

// --------------- Inline Dropdowns ---------------

function InlineStatusDropdown({
  task,
  onUpdate,
}: {
  task: Task;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleChange(value: string) {
    setLoading(true);
    try {
      await updateTask(task.id, { status: value });
      toast.success(`Status → ${value}`);
      onUpdate();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={loading}
        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: task.status.color || "#87909e" }}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          task.status.status
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-36 rounded-lg border border-[#1E1E1E] bg-[#111111] p-1 shadow-2xl">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                handleChange(opt.value);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-[#1E1E1E] ${
                task.status.status.toLowerCase() === opt.value
                  ? "text-white"
                  : "text-[#D1D5DB]"
              }`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InlinePriorityDropdown({
  task,
  onUpdate,
}: {
  task: Task;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleChange(priorityId: number) {
    setLoading(true);
    try {
      await updateTask(task.id, { priority: priorityId });
      const label = PRIORITY_OPTIONS.find((p) => p.id === String(priorityId))?.label || "Updated";
      toast.success(`Priority → ${label}`);
      onUpdate();
    } catch {
      toast.error("Failed to update priority");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  const priorityLabel = task.priority
    ? PRIORITY_LABELS[task.priority.priority] || task.priority.priority
    : null;
  const priorityColor = task.priority
    ? PRIORITY_COLORS[task.priority.priority] || "#6B7280"
    : "#6B7280";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={loading}
        className="inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-80"
        style={{ color: priorityColor }}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <Flag className="h-3.5 w-3.5" />
            {priorityLabel || ""}
          </>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-50 w-32 rounded-lg border border-[#1E1E1E] bg-[#111111] p-1 shadow-2xl">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={(e) => {
                e.stopPropagation();
                handleChange(parseInt(opt.id));
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-[#1E1E1E] ${
                task.priority?.id === opt.id ? "font-bold" : ""
              }`}
              style={{ color: opt.color }}
            >
              <Flag className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------- Quick Add Subtask ---------------

function QuickSubtaskInput({
  parentId,
  onCreated,
}: {
  parentId: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clickup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parent: parentId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Subtask created");
      setName("");
      onCreated();
    } catch {
      toast.error("Failed to create subtask");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 border-b border-[#1E1E1E] bg-[#0D0D0D] px-4 py-2 pl-14"
    >
      <Plus className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add subtask..."
        className="flex-1 bg-transparent text-sm text-[#F5F5F5] outline-none placeholder-[#6B7280]"
      />
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6B7280]" />}
    </form>
  );
}

// --------------- Task Detail Drawer (Editable) ---------------

function TaskDetailDrawer({
  task,
  onClose,
  onUpdate,
}: {
  task: Task | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) setNameValue(task.name);
  }, [task]);

  if (!task) return null;

  const due = formatDueDate(task.due_date);

  async function saveName() {
    if (!nameValue.trim() || nameValue === task!.name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      await updateTask(task!.id, { name: nameValue.trim() });
      toast.success("Task name updated");
      onUpdate();
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  }

  async function handleStatusChange(value: string) {
    try {
      await updateTask(task!.id, { status: value });
      toast.success(`Status → ${value}`);
      onUpdate();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handlePriorityChange(priorityId: number) {
    try {
      await updateTask(task!.id, { priority: priorityId });
      toast.success("Priority updated");
      onUpdate();
    } catch {
      toast.error("Failed to update priority");
    }
  }

  async function handleAssigneeToggle(memberId: number) {
    const isAssigned = task!.assignees.some((a) => a.id === memberId);
    try {
      await updateTask(task!.id, {
        assignees: isAssigned ? { rem: [memberId] } : { add: [memberId] },
      });
      toast.success(isAssigned ? "Unassigned" : "Assigned");
      onUpdate();
    } catch {
      toast.error("Failed to update assignee");
    }
  }

  async function handleDueDateChange(dateStr: string) {
    try {
      const timestamp = dateStr ? new Date(dateStr).getTime() : null;
      await updateTask(task!.id, {
        due_date: timestamp,
        due_date_time: false,
      });
      toast.success("Due date updated");
      onUpdate();
    } catch {
      toast.error("Failed to update due date");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md animate-in slide-in-from-right border-l border-[#1E1E1E] bg-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">Edit Task</h2>
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
        <div
          className="overflow-y-auto p-5 space-y-5"
          style={{ maxHeight: "calc(100vh - 65px)" }}
        >
          {/* Task Name - Editable */}
          {editingName ? (
            <div>
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setNameValue(task.name);
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="w-full rounded-lg border border-primary bg-[#111111] px-3 py-2 text-lg font-semibold outline-none"
              />
              {saving && (
                <p className="mt-1 text-xs text-[#6B7280]">Saving...</p>
              )}
            </div>
          ) : (
            <h3
              onClick={() => setEditingName(true)}
              className="cursor-pointer rounded-lg px-1 py-0.5 text-lg font-semibold leading-snug transition-colors hover:bg-[#111111]"
              title="Click to edit"
            >
              {task.name}
            </h3>
          )}

          {/* Status - Clickable */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    task.status.status.toLowerCase() === opt.value
                      ? "text-white ring-1 ring-white/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    backgroundColor:
                      task.status.status.toLowerCase() === opt.value
                        ? opt.color
                        : "#1E1E1E",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority - Clickable */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Priority
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handlePriorityChange(parseInt(opt.id))}
                  className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                    task.priority?.id === opt.id
                      ? "ring-1 ring-white/20"
                      : "bg-[#1E1E1E] text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    backgroundColor:
                      task.priority?.id === opt.id
                        ? opt.color + "30"
                        : undefined,
                    color:
                      task.priority?.id === opt.id ? opt.color : undefined,
                  }}
                >
                  <Flag className="h-3 w-3" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date - Editable */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Due Date
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={
                    task.due_date
                      ? new Date(parseInt(task.due_date))
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
              {due.isOverdue && (
                <span className="text-xs font-medium text-[#EF4444]">
                  Overdue
                </span>
              )}
            </div>
          </div>

          {/* Assignees - Toggleable */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Assignees
            </label>
            <div className="flex gap-2">
              {TEAM_MEMBERS.map((member) => {
                const isAssigned = task.assignees.some(
                  (a) => a.id === member.id
                );
                return (
                  <button
                    key={member.id}
                    onClick={() => handleAssigneeToggle(member.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      isAssigned
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-[#1E1E1E] bg-[#111111] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    {member.username}
                  </button>
                );
              })}
            </div>
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

// --------------- Task Row ---------------

function TaskRow({
  task,
  onClick,
  selected,
  onToggleSelect,
  indent,
  hasChildren,
  expanded,
  onToggleExpand,
  onDragStart,
  onDragEnter,
  onUpdate,
  onAddSubtask,
}: {
  task: Task;
  onClick: () => void;
  selected: boolean;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  indent?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onDragStart?: (id: string) => void;
  onDragEnter?: (id: string) => void;
  onUpdate: () => void;
  onAddSubtask?: (id: string) => void;
}) {
  const due = formatDueDate(task.due_date);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onMouseDown={(e) => {
        if (e.shiftKey) {
          e.preventDefault();
          onDragStart?.(task.id);
        }
      }}
      onMouseEnter={() => {
        onDragEnter?.(task.id);
      }}
      className={`group flex cursor-pointer items-center gap-3 border-b border-[#1E1E1E] px-4 py-3 transition-colors hover:bg-[#1A1A1A] ${selected ? "bg-primary/5" : ""} ${indent ? "pl-14 bg-[#0D0D0D]" : ""}`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(task.id, e);
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
      >
        {selected ? (
          <CheckSquare className="h-5 w-5 text-primary" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </button>

      {/* Expand */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Inline Status */}
      <div onClick={(e) => e.stopPropagation()}>
        <InlineStatusDropdown task={task} onUpdate={onUpdate} />
      </div>

      {/* Name */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`truncate text-sm font-medium ${indent ? "text-muted-foreground" : "text-foreground"}`}
        >
          {task.name}
        </span>
        {!indent && task.subtask_count && task.subtask_count > 0 && !hasChildren ? (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
            <Link2 className="h-3 w-3" />
            {task.subtask_count}
          </span>
        ) : null}
      </div>

      {/* Assignees */}
      <div className="flex w-28 items-center justify-center -space-x-1">
        {task.assignees.length > 0 ? (
          task.assignees.map((a) => <AssigneeBadge key={a.id} assignee={a} />)
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[#333] text-muted-foreground">
            <User className="h-3.5 w-3.5" />
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

      {/* Inline Priority */}
      <div className="w-24 text-right" onClick={(e) => e.stopPropagation()}>
        <InlinePriorityDropdown task={task} onUpdate={onUpdate} />
      </div>

      {/* Quick Actions */}
      {!indent && (
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onAddSubtask?.(task.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            title="Add subtask"
          >
            <ListPlus className="h-3.5 w-3.5" />
          </button>
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            title="Open in ClickUp"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

// --------------- Status Section ---------------

function StatusSection({
  group,
  onTaskClick,
  selectedIds,
  onToggleSelect,
  childrenMap,
  expandedParents,
  onToggleExpand,
  onDragStart,
  onDragEnter,
  onUpdate,
  subtaskInputId,
  onAddSubtask,
}: {
  group: StatusGroup;
  onTaskClick: (task: Task) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  childrenMap: Map<string, Task[]>;
  expandedParents: Set<string>;
  onToggleExpand: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onUpdate: () => void;
  subtaskInputId: string | null;
  onAddSubtask: (id: string) => void;
}) {
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
            <span className="w-8 shrink-0" /> {/* checkbox space */}
            <span className="w-16 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </span>
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
            <span className="w-16 shrink-0" /> {/* actions space */}
          </div>
          {group.tasks.map((task) => {
            const children = childrenMap.get(task.id) || [];
            const hasChildren = children.length > 0;
            const isExpanded = expandedParents.has(task.id);
            return (
              <div key={task.id}>
                <TaskRow
                  task={task}
                  onClick={() => onTaskClick(task)}
                  selected={selectedIds.has(task.id)}
                  onToggleSelect={onToggleSelect}
                  hasChildren={hasChildren}
                  expanded={isExpanded}
                  onToggleExpand={() => onToggleExpand(task.id)}
                  onDragStart={onDragStart}
                  onDragEnter={onDragEnter}
                  onUpdate={onUpdate}
                  onAddSubtask={onAddSubtask}
                />
                {hasChildren &&
                  isExpanded &&
                  children.map((child) => (
                    <TaskRow
                      key={child.id}
                      task={child}
                      onClick={() => onTaskClick(child)}
                      selected={selectedIds.has(child.id)}
                      onToggleSelect={onToggleSelect}
                      indent
                      onDragStart={onDragStart}
                      onDragEnter={onDragEnter}
                      onUpdate={onUpdate}
                    />
                  ))}
                {subtaskInputId === task.id && (
                  <QuickSubtaskInput parentId={task.id} onCreated={onUpdate} />
                )}
              </div>
            );
          })}
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">Create Task</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set()
  );
  const [subtaskInputId, setSubtaskInputId] = useState<string | null>(null);
  const lastClickedRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  function handleDragStart(id: string) {
    isDraggingRef.current = true;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function handleDragEnter(id: string) {
    if (!isDraggingRef.current) return;
    setSelectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string, e?: React.MouseEvent) {
    if (
      e?.shiftKey &&
      lastClickedRef.current &&
      lastClickedRef.current !== id
    ) {
      const startIdx = flatIds.indexOf(lastClickedRef.current);
      const endIdx = flatIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] =
          startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = flatIds.slice(from, to + 1);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((rid) => next.add(rid));
          return next;
        });
        lastClickedRef.current = id;
        return;
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    lastClickedRef.current = id;
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

  async function bulkStatusChange(status: string) {
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
            body: JSON.stringify({ task_id: id, status }),
          })
        )
      );
      toast.success(`${count} task(s) → ${status}`);
      clearSelection();
      fetchTasks();
    } catch {
      toast.error("Failed to update status");
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
      setTasks(data.tasks || []);
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

  // Separate top-level tasks and build children map
  const topLevel = tasks.filter((t) => !t.parent);
  const childrenMap = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.parent) {
      const list = childrenMap.get(task.parent) || [];
      list.push(task);
      childrenMap.set(task.parent, list);
    }
  }

  // Filter by search
  const searchFiltered = search
    ? topLevel.filter((t) => {
        const q = search.toLowerCase();
        if (t.name.toLowerCase().includes(q)) return true;
        const children = childrenMap.get(t.id) || [];
        return children.some((c) => c.name.toLowerCase().includes(q));
      })
    : topLevel;

  // Filter by priority
  const filtered = filterPriority === "all"
    ? searchFiltered
    : searchFiltered.filter((t) => t.priority?.priority?.toLowerCase() === filterPriority);

  // Sort helper
  const PRIORITY_SORT_ORDER: Record<string, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4,
  };

  function sortTasks(taskList: Task[]): Task[] {
    if (sortBy === "default") return taskList;
    return [...taskList].sort((a, b) => {
      if (sortBy === "priority") {
        const pa = PRIORITY_SORT_ORDER[a.priority?.priority?.toLowerCase() || ""] || 5;
        const pb = PRIORITY_SORT_ORDER[b.priority?.priority?.toLowerCase() || ""] || 5;
        return pa - pb;
      }
      if (sortBy === "due_date") {
        const da = a.due_date ? Number(a.due_date) : Infinity;
        const db = b.due_date ? Number(b.due_date) : Infinity;
        return da - db;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }

  // Group by status (case-insensitive)
  const statusMap = new Map<string, StatusGroup>();
  for (const task of filtered) {
    const key = task.status.status.toLowerCase();
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

  // Ensure all three statuses appear even if empty
  for (const opt of STATUS_OPTIONS) {
    if (!statusMap.has(opt.value)) {
      statusMap.set(opt.value, {
        status: opt.label,
        color: opt.color,
        type: opt.value === "complete" ? "closed" : "open",
        tasks: [],
      });
    }
  }

  const sorted = Array.from(statusMap.values())
    .sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status))
    .map((group) => ({
      ...group,
      tasks: sortTasks(group.tasks),
    }));

  // Flat ordered IDs for shift-select
  const flatIds: string[] = [];
  for (const group of sorted) {
    for (const task of group.tasks) {
      flatIds.push(task.id);
      if (expandedParents.has(task.id) && childrenMap.has(task.id)) {
        for (const child of childrenMap.get(task.id)!) {
          flatIds.push(child.id);
        }
      }
    }
  }

  function handleAddSubtask(taskId: string) {
    setSubtaskInputId(subtaskInputId === taskId ? null : taskId);
  }

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
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="appearance-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2 pl-9 pr-8 text-sm outline-none focus:border-primary cursor-pointer text-foreground"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2 pl-9 pr-8 text-sm outline-none focus:border-primary cursor-pointer text-foreground"
            >
              <option value="default">Sort: Default</option>
              <option value="priority">Sort: Priority</option>
              <option value="due_date">Sort: Due Date</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
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

            {/* Bulk Status */}
            <div className="flex items-center gap-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => bulkStatusChange(opt.value)}
                  disabled={bulkLoading}
                  className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: opt.color }}
                  title={`Move to ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#1E1E1E]" />

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
                    onClick={() =>
                      bulkAssign(TEAM_MEMBERS.map((m) => m.id))
                    }
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
            {sorted.map((group) => (
              <StatusSection
                key={group.status}
                group={group}
                onTaskClick={setSelectedTask}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                childrenMap={childrenMap}
                expandedParents={expandedParents}
                onToggleExpand={toggleExpand}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onUpdate={fetchTasks}
                subtaskInputId={subtaskInputId}
                onAddSubtask={handleAddSubtask}
              />
            ))}
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
        onUpdate={() => {
          fetchTasks();
        }}
      />
    </PageWrapper>
  );
}
