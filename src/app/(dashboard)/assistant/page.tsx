"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Bot,
  Send,
  Plus,
  User,
  Trash2,
  Loader2,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --------------- Types ---------------

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

// --------------- Constants ---------------

const SUGGESTED_PROMPTS = [
  "Draft a cold outreach email for a potential AI automation client",
  "Create a social media content plan for this week",
  "Help me prepare talking points for a client demo",
  "Summarize best practices for AI automation sales in Malaysia",
];

// --------------- Sub-components ---------------

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
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
          isUser ? "bg-primary/20" : "bg-[#1E1E1E]"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary/15 text-foreground"
            : "bg-[#1A1A1A] text-foreground"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-sm [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:bg-[#0A0A0A] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-[#0A0A0A] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre_code]:p-0 [&_a]:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-0.5" />
            )}
          </div>
        )}
        {!isUser && !isStreaming && message.content && (
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
      <Bot className="h-3.5 w-3.5 shrink-0" />
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
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages || [];

  // Auto-scroll to bottom
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

  function createConversation(): string {
    const id = crypto.randomUUID();
    const conv: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    return id;
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
    }
  }

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || streaming) return;

      let convId = activeId;
      if (!convId) {
        convId = createConversation();
      }

      const userMessage: Message = {
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add user message and create assistant placeholder
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const updated = {
            ...c,
            messages: [...c.messages, userMessage],
            title:
              c.messages.length === 0
                ? content.trim().slice(0, 40) +
                  (content.trim().length > 40 ? "..." : "")
                : c.title,
          };
          return updated;
        })
      );

      setInput("");
      setStreaming(true);

      // Build messages array for API
      const apiMessages = [
        ...(conversations.find((c) => c.id === convId)?.messages || []).map(
          (m) => ({ role: m.role, content: m.content })
        ),
        { role: "user" as const, content: content.trim() },
      ];

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/claude/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to get response");
        }

        // Add empty assistant message
        const assistantMessage: Message = {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, assistantMessage] }
              : c
          )
        );

        // Parse SSE stream
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (reader) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const data = trimmed.slice(6).trim();
                if (data === "[DONE]" || !data) continue;

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                    fullText += parsed.delta.text;

                    setConversations((prev) =>
                      prev.map((c) => {
                        if (c.id !== convId) return c;
                        const msgs = [...c.messages];
                        const lastMsg = msgs[msgs.length - 1];
                        if (lastMsg && lastMsg.role === "assistant") {
                          msgs[msgs.length - 1] = {
                            ...lastMsg,
                            content: fullText,
                          };
                        }
                        return { ...c, messages: msgs };
                      })
                    );
                  }
                } catch {
                  // Skip non-JSON lines (like event: lines)
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error(
          err instanceof Error ? err.message : "Failed to get response"
        );
        // Remove the empty assistant message on error
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = [...c.messages];
            if (
              msgs.length > 0 &&
              msgs[msgs.length - 1].role === "assistant" &&
              !msgs[msgs.length - 1].content
            ) {
              msgs.pop();
            }
            return { ...c, messages: msgs };
          })
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, streaming, conversations]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <PageWrapper title="AI Assistant">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar — Conversation History */}
        <div className="flex w-64 shrink-0 flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
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
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {conversations.length > 0 ? (
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
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No conversations yet
              </p>
            )}
          </div>
          <div className="border-t border-[#1E1E1E] p-3">
            <p className="text-xs text-muted-foreground">
              Model: Claude Sonnet 4.5
            </p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  Flogen AI Assistant
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask me about strategy, clients, content, or operations
                </p>

                {/* Suggested Prompts */}
                <div className="mt-8 grid max-w-lg grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    message={msg}
                    isStreaming={
                      streaming &&
                      i === messages.length - 1 &&
                      msg.role === "assistant"
                    }
                  />
                ))}
                {streaming &&
                  messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1E1E1E]">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-[#1E1E1E] p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Flogen AI..."
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
