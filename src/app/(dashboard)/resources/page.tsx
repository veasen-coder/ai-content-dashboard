"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  X,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  FileText,
  GraduationCap,
  FolderOpen,
  Receipt,
  LayoutTemplate,
  Folder,
  ChevronDown,
  Loader2,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCensor } from "@/hooks/use-censor";

// --------------- Types ---------------

interface Resource {
  id: string;
  title: string;
  category: string;
  url: string | null;
  description: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string | null;
}

// --------------- Categories ---------------

interface CategoryDef {
  id: string;
  label: string;
  description: string;
  icon: typeof FileText;
  /** Solid hex used for foreground icon + label */
  color: string;
  /** Translucent overlay for the section header background */
  bg: string;
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: "intima",
    label: "INTIMA Files",
    description: "INTIMA Week documents, forms, and planning files",
    icon: GraduationCap,
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.10)",
  },
  {
    id: "department",
    label: "Department Files",
    description: "Files organized by each department",
    icon: FolderOpen,
    color: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.10)",
  },
  {
    id: "claim",
    label: "Claim Forms",
    description: "Reimbursement and claim documents",
    icon: Receipt,
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.10)",
  },
  {
    id: "template",
    label: "Templates",
    description: "Reusable templates and standard formats",
    icon: LayoutTemplate,
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.10)",
  },
  {
    id: "general",
    label: "General",
    description: "Other resources",
    icon: Folder,
    color: "#6B7280",
    bg: "rgba(107, 114, 128, 0.10)",
  },
];

const CATEGORY_MAP = Object.fromEntries(
  CATEGORY_DEFS.map((c) => [c.id, c])
);

// --------------- Component ---------------

export default function ResourcesPage() {
  const censor = useCensor();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  // --------------- Fetch ---------------

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/supabase/resources");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResources(data);
      setLastSynced(new Date().toISOString());
    } catch {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // --------------- Mutations ---------------

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      const res = await fetch("/api/supabase/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setResources((prev) => prev.filter((r) => r.id !== id));
      setContextMenuId(null);
      toast.success("Resource deleted");
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  // --------------- Filter + Group ---------------

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return resources;
    const q = searchQuery.toLowerCase();
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false)
    );
  }, [resources, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, Resource[]> = {};
    CATEGORY_DEFS.forEach((c) => {
      map[c.id] = [];
    });
    filtered.forEach((r) => {
      const key = CATEGORY_MAP[r.category] ? r.category : "general";
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [filtered]);

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // --------------- Render ---------------

  return (
    <PageWrapper
      title="Resources"
      lastSynced={lastSynced}
      headerExtra={
        <span className="text-xs text-muted-foreground">
          <span className="font-mono text-foreground">{resources.length}</span>{" "}
          resources shared
        </span>
      }
    >
      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#1E1E1E] bg-[#111111] pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchResources}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7C3AED]/90"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </button>
        </div>
      </div>

      {/* Sections */}
      {loading && resources.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] py-16">
          <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "No resources match your search"
              : "No resources yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_DEFS.map((cat) => {
            const items = grouped[cat.id] ?? [];
            if (items.length === 0) return null;
            const isCollapsed = collapsed[cat.id];
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className="overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#0F0F0F]"
              >
                {/* Section header */}
                <button
                  onClick={() => toggleCollapse(cat.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                  style={{ backgroundColor: cat.bg }}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                  <Icon
                    className="h-5 w-5 shrink-0"
                    style={{ color: cat.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: cat.color }}
                    >
                      {cat.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#1E1E1E] px-2 font-mono text-[11px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </button>

                {/* Section rows */}
                {!isCollapsed && (
                  <ul className="divide-y divide-[#1E1E1E]">
                    {items.map((r) => (
                      <ResourceRow
                        key={r.id}
                        resource={r}
                        category={cat}
                        censor={censor}
                        contextMenuOpen={contextMenuId === r.id}
                        onContextToggle={() =>
                          setContextMenuId(
                            contextMenuId === r.id ? null : r.id
                          )
                        }
                        onEdit={() => {
                          setEditing(r);
                          setContextMenuId(null);
                        }}
                        onDelete={() => handleDelete(r.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <ResourceModal
          mode="create"
          onClose={() => setShowAddModal(false)}
          onSaved={(r) => {
            setResources((prev) => [r, ...prev]);
            setShowAddModal(false);
            toast.success("Resource added");
          }}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <ResourceModal
          mode="edit"
          resource={editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setResources((prev) => prev.map((x) => (x.id === r.id ? r : x)));
            setEditing(null);
            toast.success("Resource updated");
          }}
        />
      )}

      {/* Click-away for context menu */}
      {contextMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setContextMenuId(null)}
        />
      )}
    </PageWrapper>
  );
}

// --------------- Resource Row ---------------

function ResourceRow({
  resource,
  category,
  censor,
  contextMenuOpen,
  onContextToggle,
  onEdit,
  onDelete,
}: {
  resource: Resource;
  category: CategoryDef;
  censor: ReturnType<typeof useCensor>;
  contextMenuOpen: boolean;
  onContextToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
      {/* Icon tile */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${category.color}15` }}
      >
        <FileText className="h-4 w-4" style={{ color: category.color }} />
      </div>

      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium text-foreground", censor.blurClass)}>
          {resource.title}
        </p>
        {resource.description && (
          <p className={cn("mt-0.5 truncate text-xs text-muted-foreground", censor.blurClass)}>
            {resource.description}
          </p>
        )}
      </div>

      {/* Open + actions */}
      <div className="flex items-center gap-1.5">
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 text-xs font-medium text-foreground transition-colors hover:border-[#7C3AED]/40 hover:text-[#7C3AED]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        )}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextToggle();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {contextMenuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-lg border border-[#1E1E1E] bg-[#111111] shadow-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-[#1E1E1E]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-[#1E1E1E]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// --------------- Modal ---------------

function ResourceModal({
  mode,
  resource,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  resource?: Resource;
  onClose: () => void;
  onSaved: (r: Resource) => void;
}) {
  const [title, setTitle] = useState(resource?.title || "");
  const [category, setCategory] = useState(resource?.category || "general");
  const [url, setUrl] = useState(resource?.url || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }
    try {
      setSaving(true);
      if (mode === "create") {
        const res = await fetch("/api/supabase/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            category,
            url: url.trim(),
            description: description.trim() || null,
          }),
        });
        if (!res.ok) throw new Error();
        onSaved(await res.json());
      } else {
        const res = await fetch("/api/supabase/resources", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: resource!.id,
            title: title.trim(),
            category,
            url: url.trim(),
            description: description.trim() || null,
          }),
        });
        if (!res.ok) throw new Error();
        onSaved(await res.json());
      }
    } catch {
      toast.error(`Failed to ${mode === "create" ? "add" : "update"} resource`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-xl border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {mode === "create" ? "Add New Resource" : "Edit Resource"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title + Category row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Title
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. INTIMA Week Budget Sheet"
              className="h-10 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            >
              {CATEGORY_DEFS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* URL */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Link / URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="h-10 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of this resource..."
            className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !url.trim()}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#7C3AED] px-5 text-sm font-medium text-white transition-colors hover:bg-[#7C3AED]/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "create" ? "Add Resource" : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
