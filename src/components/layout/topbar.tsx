"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TopbarProps {
  title: string;
  lastSynced?: string | null;
  headerExtra?: React.ReactNode;
}

const SEARCH_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Tasks", href: "/tasks" },
  { label: "Clients", href: "/clients" },
  { label: "Finance", href: "/finance" },
  { label: "Social Media", href: "/social" },
  { label: "Resources", href: "/resources" },
  { label: "Agents", href: "/agents" },
  { label: "AI Assistant", href: "/assistant" },
  { label: "Settings", href: "/settings" },
];

export function Topbar({ title, lastSynced, headerExtra }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [searchOpen]);

  // Close notif dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredItems = SEARCH_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          {headerExtra}
        </div>

        {lastSynced && (
          <span className="hidden text-sm text-muted-foreground sm:block">
            Last synced: {formatRelativeTime(lastSynced)}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Search (Cmd+K)"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="p-6 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    No notifications yet
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredItems.length > 0) {
                    router.push(filteredItems[0].href);
                    setSearchOpen(false);
                  }
                }}
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setSearchOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No results found
                </p>
              )}
            </div>
            <div className="border-t border-border px-4 py-2">
              <p className="text-[10px] text-muted-foreground">
                Press Enter to navigate &middot; Esc to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
