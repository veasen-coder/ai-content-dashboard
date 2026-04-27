"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useCensor } from "@/hooks/use-censor";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  ExternalLink,
  Plus,
  Flag,
  X,
  Calendar,
  AlertCircle,
  Loader2,
  Filter,
  ArrowUpDown,
  Check,
  Bookmark,
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
  { id: 107691572, username: "Veasen Teh", initials: "VT", color: "#006063", short: "Veasen" },
  { id: 107691573, username: "Way Hann", initials: "WH", color: "#b388ff", short: "Way Hann" },
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

  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  return { text: `${month} ${day}`, isOverdue: diffDays < 0 };
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

function AssigneeBadge({ assignee, size = "sm" }: { assignee: Assignee; size?: "sm" | "xs" }) {
  const censor = useCensor();
  const bgColor = assignee.color || "#6B7280";
  const dim = size === "xs" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-[#0F0F0F] ${dim}`}
      style={{ backgroundColor: bgColor }}
      title={censor.name(assignee.username, String(assignee.id))}
    >
      {assignee.initials}
    </div>
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
  const censor = useCensor();
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

        <div
          className="overflow-y-auto p-5 space-y-5"
          style={{ maxHeight: "calc(100vh - 65px)" }}
        >
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
              {saving && <p className="mt-1 text-xs text-[#6B7280]">Saving...</p>}
            </div>
          ) : (
            <h3
              onClick={() => setEditingName(true)}
              className="cursor-pointer rounded-lg px-1 py-0.5 text-lg font-semibold leading-snug transition-colors hover:bg-[#111111]"
              title="Click to edit"
            >
              {censor.short(task.name, 10)}
            </h3>
          )}

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
                    {censor.name(member.username, String(member.id))}
                  </button>
                );
              })}
            </div>
          </div>

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

          {task.description && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <div className={`rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-sm text-muted-foreground whitespace-pre-wrap ${censor.blurClass}`}>
                {task.description}
              </div>
            </div>
          )}

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

// --------------- Kanban Card ---------------

function KanbanCard({
  task,
  subtasks,
  onClick,
  onSubtaskClick,
  taskIdShort,
  isOverlay,
}: {
  task: Task;
  subtasks: Task[];
  onClick: () => void;
  onSubtaskClick: (task: Task) => void;
  taskIdShort: string;
  isOverlay?: boolean;
}) {
  const censor = useCensor();
  const [showSubtasks, setShowSubtasks] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isOverlay,
  });
  const dragStyle = isOverlay
    ? { cursor: "grabbing" as const }
    : transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0 : 1,
        cursor: isDragging ? "grabbing" as const : "grab" as const,
      }
    : { cursor: "grab" as const };
  const due = formatDueDate(task.due_date);
  const priorityColor = task.priority
    ? PRIORITY_COLORS[task.priority.priority] || "#6B7280"
    : null;
  const priorityLabel = task.priority
    ? PRIORITY_LABELS[task.priority.priority] || task.priority.priority
    : null;
  const completedSubs = subtasks.filter(
    (s) => s.status.type === "closed" || s.status.status.toLowerCase() === "complete"
  ).length;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      className={`group w-full overflow-hidden rounded-md border border-[#1E1E1E] bg-[#161616] text-left shadow-sm transition-colors hover:border-[#2A2A2A] hover:bg-[#1A1A1A] ${
        isOverlay ? "rotate-2 shadow-2xl ring-2 ring-primary/40" : ""
      }`}
    >
      <button onClick={onClick} className="block w-full px-3 pt-3 text-left">
        {/* Title */}
        <p className="mb-2 text-sm font-medium leading-snug text-foreground line-clamp-3">
          {censor.short(task.name, 10)}
        </p>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.name}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: tag.tag_bg || "#3B82F6",
                  color: tag.tag_fg || "#FFFFFF",
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Subtasks toggle */}
      {subtasks.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSubtasks((v) => !v);
          }}
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
        >
          {showSubtasks ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>
            {completedSubs}/{subtasks.length} subtasks
          </span>
        </button>
      )}

      {/* Subtask list */}
      {showSubtasks && subtasks.length > 0 && (
        <div className="border-t border-[#1E1E1E] bg-[#0E0E0E]">
          {subtasks.map((sub) => {
            const isDone =
              sub.status.type === "closed" ||
              sub.status.status.toLowerCase() === "complete";
            return (
              <button
                key={sub.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSubtaskClick(sub);
                }}
                className="group/sub flex w-full items-center gap-2 border-b border-[#1A1A1A] px-3 py-1.5 text-left last:border-b-0 hover:bg-[#161616]"
              >
                <div
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border"
                  style={{
                    borderColor: sub.status.color || "#2A2A2A",
                    backgroundColor: isDone ? sub.status.color || "#10B981" : "transparent",
                  }}
                >
                  {isDone && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                </div>
                <span
                  className={`flex-1 truncate text-[11px] ${
                    isDone ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {censor.short(sub.name, 10)}
                </span>
                {sub.assignees[0] && (
                  <AssigneeBadge assignee={sub.assignees[0]} size="xs" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-2 border-t border-[#1A1A1A] px-3 py-2"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5 shrink-0 fill-[#10B981] text-[#10B981]" />
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {taskIdShort}
          </span>
          {priorityLabel && priorityColor && (
            <Flag
              className="ml-1 h-3 w-3 shrink-0"
              style={{ color: priorityColor }}
              fill={priorityColor}
            />
          )}
          {due.text && (
            <span
              className={`ml-1 shrink-0 text-[11px] font-medium ${
                due.isOverdue ? "text-[#EF4444]" : "text-muted-foreground"
              }`}
            >
              {due.text}
            </span>
          )}
        </div>
        <div className="flex shrink-0 -space-x-1.5">
          {task.assignees.map((a) => (
            <AssigneeBadge key={a.id} assignee={a} size="xs" />
          ))}
        </div>
      </button>
    </div>
  );
}

// --------------- Kanban Column ---------------

function KanbanColumn({
  group,
  childrenMap,
  onTaskClick,
  onAddTask,
}: {
  group: StatusGroup;
  childrenMap: Map<string, Task[]>;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: string) => void;
}) {
  const isDone =
    group.type === "closed" || group.status.toLowerCase() === "complete";
  const statusKey = group.status.toLowerCase();
  const { setNodeRef, isOver } = useDroppable({
    id: statusKey,
    data: { status: statusKey },
  });

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-lg bg-[#0E0E0E]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {group.status}
          </span>
          {isDone && <Check className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={3} />}
          <span className="text-[11px] font-medium text-muted-foreground">
            {group.tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(group.status)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          title="Add task to this column"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto rounded-md px-2 pb-2 transition-colors ${
          isOver ? "bg-primary/10 ring-2 ring-primary/40" : ""
        }`}
        style={{ minHeight: "200px" }}
      >
        {group.tasks.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[#1E1E1E] text-xs text-muted-foreground">
            {isOver ? "Drop here" : "No cards"}
          </div>
        ) : (
          group.tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              subtasks={childrenMap.get(task.id) || []}
              onClick={() => onTaskClick(task)}
              onSubtaskClick={onTaskClick}
              taskIdShort={`TSK-${task.id.slice(-4).toUpperCase()}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

// --------------- Add Task Modal ---------------

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultStatus?: string;
}

function AddTaskModal({ isOpen, onClose, onCreated, defaultStatus }: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("to do");
  const [priority, setPriority] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && defaultStatus) {
      const normalized = defaultStatus.toLowerCase();
      const found = STATUS_OPTIONS.find((s) => s.value === normalized);
      if (found) setStatus(found.value);
    }
  }, [isOpen, defaultStatus]);

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
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | number>("all");
  const [sortBy, setSortBy] = useState("default");
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalStatus, setAddModalStatus] = useState<string | undefined>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === String(event.active.id));
    if (task) setActiveDragTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const newStatus = String(over.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status.status.toLowerCase() === newStatus) return;

    const statusOption = STATUS_OPTIONS.find((s) => s.value === newStatus);
    const newColor = statusOption?.color || task.status.color;
    const newType =
      newStatus === "complete" ? "closed" : task.status.type === "closed" ? "open" : task.status.type;

    // Optimistic update
    const prev = tasks;
    setTasks((curr) =>
      curr.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: { status: newStatus, color: newColor, type: newType },
            }
          : t
      )
    );

    try {
      await updateTask(taskId, { status: newStatus });
      toast.success(`Moved to ${statusOption?.label || newStatus}`);
    } catch {
      toast.error("Failed to move task");
      setTasks(prev); // revert
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

  // Top-level only on the board, build children map
  const topLevel = tasks.filter((t) => !t.parent);
  const childrenMap = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.parent) {
      const list = childrenMap.get(task.parent) || [];
      list.push(task);
      childrenMap.set(task.parent, list);
    }
  }

  // Search filter (matches parent or any subtask)
  const searchFiltered = search
    ? topLevel.filter((t) => {
        const q = search.toLowerCase();
        if (t.name.toLowerCase().includes(q)) return true;
        const subs = childrenMap.get(t.id) || [];
        return subs.some((s) => s.name.toLowerCase().includes(q));
      })
    : topLevel;

  // Priority filter
  const priorityFiltered =
    filterPriority === "all"
      ? searchFiltered
      : searchFiltered.filter(
          (t) => t.priority?.priority?.toLowerCase() === filterPriority
        );

  // Assignee filter — match if parent OR any subtask is assigned
  const filtered =
    assigneeFilter === "all"
      ? priorityFiltered
      : priorityFiltered.filter((t) => {
          if (t.assignees.some((a) => a.id === assigneeFilter)) return true;
          const subs = childrenMap.get(t.id) || [];
          return subs.some((s) => s.assignees.some((a) => a.id === assigneeFilter));
        });

  // Sort within column
  const PRIORITY_SORT_ORDER: Record<string, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4,
  };

  function sortTasks(list: Task[]): Task[] {
    if (sortBy === "default") return list;
    return [...list].sort((a, b) => {
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

  // Group by status
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

  // Ensure all statuses appear
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
    .map((group) => ({ ...group, tasks: sortTasks(group.tasks) }));

  function openAddModal(status?: string) {
    setAddModalStatus(status);
    setShowAddModal(true);
  }

  return (
    <PageWrapper title="Tasks" lastSynced={lastFetched}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Person Selector — overlapping avatars */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAssigneeFilter("all")}
              title="Show all"
              className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all ${
                assigneeFilter === "all"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:border-[#2A2A2A] hover:text-foreground"
              }`}
            >
              All
            </button>
            <div className="flex -space-x-2">
              {TEAM_MEMBERS.map((member) => {
                const active = assigneeFilter === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() =>
                      setAssigneeFilter(active ? "all" : member.id)
                    }
                    title={member.short}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 transition-all ${
                      active
                        ? "z-10 scale-110 ring-primary"
                        : "ring-[#0A0A0A] hover:z-10 hover:scale-110 hover:ring-[#3A3A3A]"
                    }`}
                    style={{ backgroundColor: member.color }}
                  >
                    {member.initials}
                  </button>
                );
              })}
            </div>
          </div>

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
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2 pl-9 pr-8 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2 pl-9 pr-8 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="default">Sort: Default</option>
              <option value="priority">Sort: Priority</option>
              <option value="due_date">Sort: Due Date</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="flex-1" />

          <button
            onClick={fetchTasks}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[300px] shrink-0 space-y-2 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-3"
              >
                <div className="h-6 w-24 animate-pulse rounded bg-[#1E1E1E]" />
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-20 animate-pulse rounded-lg bg-[#1E1E1E]"
                  />
                ))}
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

        {/* Kanban Board */}
        {!loading && !error && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragTask(null)}
          >
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-4"
              style={{ minHeight: "calc(100vh - 220px)" }}
            >
              {sorted.map((group) => (
                <KanbanColumn
                  key={group.status}
                  group={group}
                  childrenMap={childrenMap}
                  onTaskClick={setSelectedTask}
                  onAddTask={openAddModal}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDragTask ? (
                <KanbanCard
                  task={activeDragTask}
                  subtasks={childrenMap.get(activeDragTask.id) || []}
                  onClick={() => {}}
                  onSubtaskClick={() => {}}
                  taskIdShort={`TSK-${activeDragTask.id.slice(-4).toUpperCase()}`}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddModalStatus(undefined);
        }}
        onCreated={fetchTasks}
        defaultStatus={addModalStatus}
      />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={fetchTasks}
      />

      {/* Loading spinner overlay */}
      {refreshing && !loading && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-xs text-muted-foreground shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Syncing
        </div>
      )}
    </PageWrapper>
  );
}
