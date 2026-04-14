"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  FolderOpen,
  Plus,
  X,
  RefreshCw,
  Search,
  Pin,
  Trash2,
  ExternalLink,
  FileText,
  Table2,
  HardDrive,
  Link2,
  Code2,
  Star,
  MoreVertical,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

// --------------- Types ---------------

interface Resource {
  id: string;
  title: string;
  category: string;
  type: string;
  url: string | null;
  description: string | null;
  html_content: string | null;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

// --------------- Constants ---------------

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "scripts", label: "Scripts" },
  { id: "meeting_minutes", label: "Meeting Minutes" },
  { id: "demos", label: "Demos" },
  { id: "templates", label: "Templates" },
  { id: "other", label: "Other" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  scripts: "#8B5CF6",
  meeting_minutes: "#3B82F6",
  demos: "#10B981",
  templates: "#F59E0B",
  other: "#6B7280",
};

const CATEGORY_LABELS: Record<string, string> = {
  scripts: "Scripts",
  meeting_minutes: "Meeting Minutes",
  demos: "Demos",
  templates: "Templates",
  other: "Other",
};

const TYPE_OPTIONS = [
  { value: "google_doc", label: "Google Doc" },
  { value: "google_sheet", label: "Google Sheet" },
  { value: "google_drive", label: "Google Drive" },
  { value: "link", label: "Link" },
  { value: "html", label: "HTML" },
] as const;

// --------------- Helpers ---------------

function getTypeIcon(type: string) {
  switch (type) {
    case "google_doc":
      return <FileText className="h-4 w-4 text-blue-400" />;
    case "google_sheet":
      return <Table2 className="h-4 w-4 text-green-400" />;
    case "google_drive":
      return <HardDrive className="h-4 w-4 text-yellow-400" />;
    case "link":
      return <Link2 className="h-4 w-4 text-violet-400" />;
    case "html":
      return <Code2 className="h-4 w-4 text-orange-400" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --------------- Component ---------------

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("scripts");
  const [formType, setFormType] = useState("link");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Context menu
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

  // --------------- Actions ---------------

  const handleAdd = async () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      setSaving(true);

      // Upload image first if one is selected
      let imageUrl: string | null = null;
      if (formImageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", formImageFile);
        const uploadRes = await fetch("/api/supabase/resources/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Failed to upload image");
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
        setUploadingImage(false);
      }

      const res = await fetch("/api/supabase/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCategory,
          type: formType,
          url: formUrl.trim() || null,
          description: formDescription.trim() || null,
          image_url: imageUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const newResource = await res.json();
      setResources((prev) => [newResource, ...prev]);
      setShowAddModal(false);
      resetForm();
      toast.success("Resource added");
    } catch {
      toast.error("Failed to add resource");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (resource: Resource) => {
    try {
      const res = await fetch("/api/supabase/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resource.id, is_pinned: !resource.is_pinned }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setResources((prev) =>
        prev
          .map((r) => (r.id === updated.id ? updated : r))
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
      );
      toast.success(updated.is_pinned ? "Pinned" : "Unpinned");
    } catch {
      toast.error("Failed to update resource");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/supabase/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setResources((prev) => prev.filter((r) => r.id !== id));
      setContextMenuId(null);
      toast.success("Resource deleted");
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  const handleCardClick = (resource: Resource) => {
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormCategory("scripts");
    setFormType("link");
    setFormUrl("");
    setFormDescription("");
    setFormImageFile(null);
    setFormImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setFormImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setFormImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // --------------- Filtered Data ---------------

  const filteredResources = useMemo(() => {
    let result = resources;
    if (activeCategory !== "all") {
      result = result.filter((r) => r.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [resources, activeCategory, searchQuery]);

  // --------------- Render ---------------

  return (
    <PageWrapper title="Resources" lastSynced={lastSynced}>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                  : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-lg border border-[#1E1E1E] bg-[#111111] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>
          <button
            onClick={fetchResources}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7C3AED]/90"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading && resources.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] py-16">
          <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery || activeCategory !== "all"
              ? "No resources match your filters"
              : "No resources yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add resources to organize your scripts, demos, and templates
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              onClick={() => handleCardClick(resource)}
              className={`group relative flex flex-col rounded-xl border border-[#1E1E1E] bg-[#111111] p-4 transition-colors ${
                resource.url ? "cursor-pointer hover:border-[#7C3AED]/40" : ""
              }`}
            >
              {/* Image thumbnail */}
              {resource.image_url && (
                <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-xl">
                  <img
                    src={resource.image_url}
                    alt={resource.title}
                    className="h-36 w-full object-cover"
                  />
                </div>
              )}

              {/* Pin indicator */}
              {resource.is_pinned && (
                <div className={`absolute right-3 ${resource.image_url ? "top-[156px]" : "top-3"}`}>
                  <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                </div>
              )}

              {/* Header */}
              <div className="mb-2 flex items-start gap-3 pr-6">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1E1E1E]">
                  {getTypeIcon(resource.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-foreground">
                    {resource.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[resource.category] || "#6B7280"}20`,
                        color: CATEGORY_COLORS[resource.category] || "#6B7280",
                      }}
                    >
                      {CATEGORY_LABELS[resource.category] || resource.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {resource.description && (
                <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {resource.description}
                </p>
              )}

              {/* Footer */}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDate(resource.created_at)}
                </span>
                <div className="flex items-center gap-1">
                  {resource.url && (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                  {/* Actions menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenuId(
                          contextMenuId === resource.id ? null : resource.id
                        );
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-[#1E1E1E] hover:text-foreground group-hover:opacity-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                    {contextMenuId === resource.id && (
                      <div className="absolute bottom-full right-0 z-10 mb-1 w-36 rounded-lg border border-[#1E1E1E] bg-[#111111] py-1 shadow-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(resource);
                            setContextMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
                        >
                          <Pin className="h-3.5 w-3.5" />
                          {resource.is_pinned ? "Unpin" : "Pin to top"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(resource.id);
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShowAddModal(false);
            resetForm();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Add Resource
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
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
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Resource title"
                  className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>

              {/* Category + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  >
                    {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-9 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              {/* Image Upload */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Image (optional)
                </label>
                {formImagePreview ? (
                  <div className="relative">
                    <img
                      src={formImagePreview}
                      alt="Preview"
                      className="h-32 w-full rounded-lg border border-[#1E1E1E] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setFormImageFile(null); setFormImagePreview(null); }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#1E1E1E] bg-[#0A0A0A] transition-colors hover:border-[#7C3AED]/40">
                    <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="h-9 rounded-lg border border-[#1E1E1E] px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !formTitle.trim()}
                className="h-9 rounded-lg bg-[#7C3AED] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7C3AED]/90 disabled:opacity-50"
              >
                {saving ? (uploadingImage ? "Uploading image..." : "Adding...") : "Add Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away listener for context menu */}
      {contextMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setContextMenuId(null)}
        />
      )}
    </PageWrapper>
  );
}
