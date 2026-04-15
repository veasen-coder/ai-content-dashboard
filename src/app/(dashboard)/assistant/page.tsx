"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Send,
  Plus,
  User,
  Trash2,
  Loader2,
  Copy,
  Check,
  Square,
  ListTodo,
  Users,
  DollarSign,
  Mail,
  BarChart3,
  Calendar,
  Zap,
  RefreshCw,
  Brain,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --------------- Types ---------------

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolActions?: ToolAction[];
}

interface ToolAction {
  tool: string;
  input: Record<string, unknown>;
  success: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

// --------------- Constants ---------------

const QUICK_ACTIONS = [
  {
    icon: Target,
    label: "What should I focus on today?",
    prompt: "Analyze my dashboard data and tell me what I should focus on today. Look at overdue tasks, pipeline status, recent financials, and upcoming deadlines. Give me a prioritized action plan.",
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/10",
  },
  {
    icon: TrendingUp,
    label: "Business health check",
    prompt: "Give me a full business health check. Analyze my financials (revenue, expenses, profit margins), client pipeline (stages, win rate, deal values), task completion rate, and social media performance. Highlight what's going well and what needs attention.",
    color: "text-[#10B981]",
    bg: "bg-[#10B981]/10",
  },
  {
    icon: ListTodo,
    label: "Review my tasks",
    prompt: "Review all my current tasks. Show me overdue tasks first, then tasks due this week, and suggest priorities. If any tasks seem blocked or stale, flag them.",
    color: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/10",
  },
  {
    icon: Users,
    label: "Client pipeline review",
    prompt: "Review my entire client pipeline. Show me clients at each stage, highlight any that have been stuck in the same stage for too long, suggest next actions for each active deal, and identify which leads are most likely to close.",
    color: "text-[#3B82F6]",
    bg: "bg-[#3B82F6]/10",
  },
  {
    icon: DollarSign,
    label: "Financial summary",
    prompt: "Give me a detailed financial summary. Show this month's income vs expenses, account balances, biggest expense categories, and revenue trends. Compare to previous months if available and suggest areas to optimize.",
    color: "text-[#10B981]",
    bg: "bg-[#10B981]/10",
  },
  {
    icon: BarChart3,
    label: "Social media insights",
    prompt: "Analyze my social media performance across all platforms. Show follower growth, engagement rates, reach trends, and give me actionable content suggestions based on what's performing well.",
    color: "text-[#EC4899]",
    bg: "bg-[#EC4899]/10",
  },
];

const ACTION_CHIPS = [
  { icon: ListTodo, label: "Add task", prompt: "I need to create a new task. Ask me for the details (name, priority, due date).", color: "border-[#F59E0B]/30 hover:border-[#F59E0B]/60" },
  { icon: Users, label: "Add client", prompt: "I want to add a new client/lead to my pipeline. Ask me for their details.", color: "border-[#3B82F6]/30 hover:border-[#3B82F6]/60" },
  { icon: DollarSign, label: "Log payment", prompt: "I need to log a financial entry. Ask me if it's income or expense and the details.", color: "border-[#10B981]/30 hover:border-[#10B981]/60" },
  { icon: Mail, label: "Draft email", prompt: "Help me draft and send an email. Ask me who it's for and what it's about.", color: "border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60" },
  { icon: Calendar, label: "Weekly plan", prompt: "Based on my current tasks, client pipeline, and deadlines, create a detailed weekly plan for me. Break it down by day.", color: "border-[#EC4899]/30 hover:border-[#EC4899]/60" },
  { icon: Zap, label: "Quick wins", prompt: "Look at all my data and identify quick wins — things I can do in the next hour that will have the biggest impact on revenue, client satisfaction, or task completion.", color: "border-[#F97316]/30 hover:border-[#F97316]/60" },
];

// --------------- Sub-components ---------------

function MessageBubble({
  message,
  isLoading,
}: {
  message: Message;
  isLoading?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-primary/20" : "bg-gradient-to-br from-[#7C3AED]/20 to-[#3B82F6]/20"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Brain className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary/15 text-foreground"
            : "bg-[#1A1A1A] text-foreground"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-sm [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:bg-[#0A0A0A] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-[#0A0A0A] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre_code]:p-0 [&_a]:text-primary [&_table]:border-collapse [&_th]:border [&_th]:border-[#1E1E1E] [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-[#1E1E1E] [&_td]:px-3 [&_td]:py-1.5 [&_strong]:text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {isLoading && (
              <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-0.5" />
            )}
          </div>
        )}

        {/* Tool action badges */}
        {message.toolActions && message.toolActions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.toolActions.map((action, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  action.success
                    ? "bg-[#10B981]/15 text-[#10B981]"
                    : "bg-[#EF4444]/15 text-[#EF4444]"
                }`}
              >
                {action.success ? <Check className="h-2.5 w-2.5" /> : "✗"}
                {action.tool.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {!isUser && !isLoading && message.content && (
          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3 w-3 text-[#10B981]" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-[#1A1A1A] hover:text-foreground"
      }`}
    >
      <Brain className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{conversation.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-[#EF4444]" />
      </button>
    </div>
  );
}

// --------------- Main Page ---------------

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [dashboardContext, setDashboardContext] = useState<Record<string, unknown> | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages || [];

  // ---------- Load conversations from Supabase on mount ----------
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/supabase/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data || []);
        }
      } catch {
        // start fresh
      } finally {
        setLoadingConvs(false);
      }
    }
    load();
  }, []);

  // ---------- Refresh dashboard context ----------
  const refreshContext = useCallback(async () => {
    setContextLoading(true);
    try {
      // Fetch context via assistant endpoint with empty messages to get context only
      const res = await fetch("/api/claude/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.context) setDashboardContext(data.context);
      }
    } catch {
      // Context is optional — chat still works
    } finally {
      setContextLoading(false);
    }
  }, []);

  // Load context on mount
  useEffect(() => {
    refreshContext();
  }, [refreshContext]);

  // ---------- Save conversation to Supabase (debounced) ----------
  const saveConversation = useCallback((conv: Conversation) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/supabase/conversations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conv.id,
            title: conv.title,
            messages: conv.messages,
          }),
        });
      } catch {
        // Silent
      }
    }, 500);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  async function createConversation(): Promise<string> {
    try {
      const res = await fetch("/api/supabase/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat", messages: [] }),
      });
      if (res.ok) {
        const data = await res.json();
        const conv: Conversation = {
          id: data.id,
          title: data.title,
          messages: data.messages || [],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        return conv.id;
      }
    } catch {
      // fallback
    }
    const id = crypto.randomUUID();
    const conv: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    return id;
  }

  async function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    try {
      await fetch("/api/supabase/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // already removed
    }
  }

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      let convId = activeId;
      if (!convId) {
        convId = await createConversation();
      }

      const userMessage: Message = {
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add user message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: [...c.messages, userMessage],
            title:
              c.messages.length === 0
                ? content.trim().slice(0, 40) +
                  (content.trim().length > 40 ? "..." : "")
                : c.title,
          };
        })
      );

      setInput("");
      setLoading(true);

      // Build messages for API (only role + content, no extras)
      const apiMessages = [
        ...(conversations.find((c) => c.id === convId)?.messages || []).map(
          (m) => ({ role: m.role, content: m.content })
        ),
        { role: "user" as const, content: content.trim() },
      ];

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/claude/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            context: dashboardContext,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to get response");
        }

        const data = await res.json();

        // Update context if returned
        if (data.context) {
          setDashboardContext(data.context);
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: data.content || "I couldn't generate a response. Please try again.",
          timestamp: new Date().toISOString(),
          toolActions: data.tool_calls?.map((tc: { tool: string; input: Record<string, unknown>; result: string }) => ({
            tool: tc.tool,
            input: tc.input,
            success: !tc.result?.includes('"error"'),
          })),
        };

        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, assistantMessage] }
              : c
          );
          const conv = updated.find((c) => c.id === convId);
          if (conv) saveConversation(conv);
          return updated;
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error(
          err instanceof Error ? err.message : "Failed to get response"
        );
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, loading, conversations, saveConversation, dashboardContext]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Quick data summary for the sidebar
  const clientCount = Array.isArray(dashboardContext?.clients)
    ? (dashboardContext.clients as unknown[]).length
    : 0;
  const taskCount = Array.isArray(dashboardContext?.tasks)
    ? (dashboardContext.tasks as unknown[]).length
    : 0;

  return (
    <PageWrapper title="AI Assistant">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar */}
        <div className="flex w-72 shrink-0 flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={() => {
                createConversation();
                textareaRef.current?.focus();
              }}
              className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>

          {/* Live Data Status */}
          <div className="mx-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Live Data
              </span>
              <button
                onClick={refreshContext}
                disabled={contextLoading}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh dashboard data"
              >
                <RefreshCw
                  className={`h-3 w-3 ${contextLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            {dashboardContext ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tasks</span>
                  <span className="font-mono text-foreground">{taskCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Clients</span>
                  <span className="font-mono text-foreground">
                    {clientCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className="flex items-center gap-1 text-[#10B981]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-[10px]">Connected</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading data...
              </div>
            )}
          </div>

          {/* Conversation History */}
          <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
            <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </p>
            {loadingConvs ? (
              <div className="space-y-2 px-2 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-lg bg-[#1E1E1E]"
                  />
                ))}
              </div>
            ) : conversations.length > 0 ? (
              <div className="space-y-0.5">
                {conversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeId === conv.id}
                    onClick={() => setActiveId(conv.id)}
                    onDelete={() => deleteConversation(conv.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No conversations yet
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#1E1E1E] p-3">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">
                Dashboard Mastermind
              </p>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                {/* Hero */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#3B82F6]/20">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">
                  Dashboard Mastermind
                </h2>
                <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
                  I have access to all your dashboard data — tasks, clients,
                  finances, social media. Ask me anything or let me take
                  actions for you.
                </p>

                {/* Quick Actions Grid */}
                <div className="mt-8 w-full max-w-2xl">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick Analysis
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.prompt)}
                        className="flex items-start gap-3 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-3.5 text-left transition-all hover:border-primary/30 hover:bg-[#0A0A0A]/80"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.bg}`}
                        >
                          <action.icon className={`h-4 w-4 ${action.color}`} />
                        </div>
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Chips */}
                <div className="mt-6 w-full max-w-2xl">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ACTION_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => sendMessage(chip.prompt)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:text-foreground ${chip.color}`}
                      >
                        <chip.icon className="h-3 w-3" />
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    message={msg}
                    isLoading={
                      loading &&
                      i === messages.length - 1 &&
                      msg.role === "assistant"
                    }
                  />
                ))}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED]/20 to-[#3B82F6]/20">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Analyzing dashboard data...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Action chips bar (visible during conversation) */}
          {messages.length > 0 && !loading && (
            <div className="border-t border-[#1E1E1E] px-4 py-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  Quick:
                </span>
                {ACTION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => sendMessage(chip.prompt)}
                    className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] text-muted-foreground transition-all hover:text-foreground ${chip.color}`}
                  >
                    <chip.icon className="h-2.5 w-2.5" />
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-[#1E1E1E] p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your business, give commands, or request analysis..."
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
              />
              {loading ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EF4444] text-white transition-colors hover:bg-[#EF4444]/80"
                  title="Stop"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Enter to send · Shift+Enter for new line · I can create tasks, add clients, log payments & send emails
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
