"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Send,
  User,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Palette,
  Search,
  ArrowLeft,
  Bot,
  ChevronRight,
  Square,
  Lightbulb,
  CalendarClock,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --------------- Agent Definitions ---------------

interface AgentDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  color: string;
  colorBg: string;
  systemPrompt: string;
  starterMessage: string;
  suggestedPrompts: string[];
}

const AGENTS: AgentDef[] = [
  {
    id: "content-creation",
    name: "Content Creation Agent",
    shortName: "Content",
    description:
      "Produces complete, ready-to-publish Instagram content — captions, carousel scripts, Gemini image prompts, and posting strategy.",
    icon: Palette,
    color: "text-violet-400",
    colorBg: "bg-violet-500/15",
    systemPrompt: `You are Flogen AI's Content Creation Agent. Your job is to produce complete, ready-to-publish Instagram content for Flogen AI — a Malaysian AI automation business that helps SMEs save time and grow using AI.

Brand voice: Expert but accessible. Direct. No fluff. Speaks to non-technical SME owners.
Aesthetic: Dark, minimal, modern. Content should feel premium and knowledgeable, not salesy.
Target audience: Malaysian SME owners, small business founders, entrepreneurs aged 25–45.

When given a content topic or asked to generate content, you will produce ALL of the following in one response:

1. CONTENT IDEA
- Hook concept (what makes this stop the scroll)
- Format recommendation (carousel / single image / reel / story)
- Why this works for our audience

2. CAPTION (full, ready to post)
- Opening hook (first line must stop the scroll)
- Body (value, story, or insight)
- Call to action
- Hashtags (15–20, mix of Malaysian + niche + broad)
- Emojis used sparingly and purposefully

3. CAROUSEL SCRIPT (if carousel format)
- Slide 1: Hook slide — headline only
- Slides 2–6: Content slides — title + 2-3 bullet points each
- Last slide: CTA slide — what to do next

4. GEMINI IMAGE PROMPT
Write a detailed image generation prompt for Google Gemini to create the visual. Include:
- Style (dark, minimal, modern — consistent with Flogen brand)
- Colour palette (dark background, violet accent #7C3AED, white text)
- Composition and layout
- Any text to include on the image
- Mood and atmosphere

Format your Gemini prompt like this:
"Create a [style] image with [description]. Use a dark background (#0A0A0A) with violet accents (#7C3AED). [Layout details]. [Text on image if any]. Style: modern, minimal, premium tech brand."

5. POSTING RECOMMENDATION
- Best time to post (Malaysia timezone, GMT+8)
- Content pillar this falls under (Education / Social Proof / Behind the Scenes / Promotion / Engagement)
- Suggested story to pair with this post

Always produce all 5 sections. Never produce partial content. If given a vague topic, make a strong creative decision and execute it fully.`,
    starterMessage:
      "What topic or theme do you want to create content for today? Or should I suggest this week's content calendar?",
    suggestedPrompts: [
      "Create a carousel about why SMEs need AI in 2026",
      "Generate content about WhatsApp automation for F&B businesses",
      "Suggest this week's content calendar",
      "Create a post about our 24/7 AI customer service",
    ],
  },
];

// --------------- Types ---------------

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// --------------- Sub-components ---------------

function MessageBubble({
  message,
  isStreaming,
  agentColor,
}: {
  message: Message;
  isStreaming?: boolean;
  agentColor: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
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
          <Bot className={`h-4 w-4 ${agentColor}`} />
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

function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentDef;
  onClick: () => void;
}) {
  const Icon = agent.icon;
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-xl border border-[#1E1E1E] bg-[#111111] p-6 text-left transition-all hover:border-[#2E2E2E] hover:bg-[#161616]"
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${agent.colorBg}`}
        >
          <Icon className={`h-6 w-6 ${agent.color}`} />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{agent.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {agent.description}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full bg-emerald-400`} />
        <span className="text-xs text-muted-foreground">Online</span>
      </div>
    </button>
  );
}

// --------------- Main Page ---------------

export default function AgentsPage() {
  const [activeAgent, setActiveAgent] = useState<AgentDef | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  function openAgent(agent: AgentDef) {
    setActiveAgent(agent);
    setMessages([
      {
        role: "assistant",
        content: agent.starterMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function goBack() {
    if (streaming && abortRef.current) {
      abortRef.current.abort();
    }
    setActiveAgent(null);
    setMessages([]);
    setInput("");
    setStreaming(false);
  }

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || streaming || !activeAgent) return;

      const userMessage: Message = {
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setStreaming(true);

      // Build API messages (exclude the starter message from context if it's the first one)
      const apiMessages = updatedMessages
        .filter(
          (m, i) => !(i === 0 && m.role === "assistant" && m.content === activeAgent.starterMessage)
        )
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/claude/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            system: activeAgent.systemPrompt,
          }),
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
        setMessages((prev) => [...prev, assistantMessage]);

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
                  if (
                    parsed.type === "content_block_delta" &&
                    parsed.delta?.text
                  ) {
                    fullText += parsed.delta.text;
                    setMessages((prev) => {
                      const msgs = [...prev];
                      const lastMsg = msgs[msgs.length - 1];
                      if (lastMsg && lastMsg.role === "assistant") {
                        msgs[msgs.length - 1] = {
                          ...lastMsg,
                          content: fullText,
                        };
                      }
                      return msgs;
                    });
                  }
                } catch {
                  // Skip non-JSON lines
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
        // Remove empty assistant message on error
        setMessages((prev) => {
          const msgs = [...prev];
          if (
            msgs.length > 0 &&
            msgs[msgs.length - 1].role === "assistant" &&
            !msgs[msgs.length - 1].content
          ) {
            msgs.pop();
          }
          return msgs;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [activeAgent, messages, streaming]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ===================== Agent Chat View =====================
  if (activeAgent) {
    const Icon = activeAgent.icon;

    return (
      <PageWrapper title="Agents">
        <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {/* Agent Header */}
          <div className="flex items-center gap-3 border-b border-[#1E1E1E] px-4 py-3">
            <button
              onClick={goBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeAgent.colorBg}`}
            >
              <Icon className={`h-5 w-5 ${activeAgent.color}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">{activeAgent.name}</h2>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-muted-foreground">
                  Online &middot; Claude Sonnet 4
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  agentColor={activeAgent.color}
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
                      <Bot className={`h-4 w-4 ${activeAgent.color}`} />
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

            {/* Suggested prompts (show only when conversation just started) */}
            {messages.length === 1 && (
              <div className="mt-6 grid max-w-2xl grid-cols-2 gap-2">
                {activeAgent.suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
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
                placeholder={`Message ${activeAgent.shortName} Agent...`}
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
              />
              {streaming ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EF4444] text-white transition-colors hover:bg-[#EF4444]/80"
                  title="Stop generating"
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
              Press Enter to send &middot; Shift+Enter for new line
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // ===================== Agent Selection View =====================
  return (
    <PageWrapper title="Agents">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Agents</h2>
              <p className="text-sm text-muted-foreground">
                Specialised agents for content, lead research, and outreach
              </p>
            </div>
          </div>
        </div>

        {/* Auto Agents - Quick Access */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/agents/daily-summary"
            className="group flex items-center gap-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 transition-all hover:border-violet-500/50 hover:bg-violet-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
              <CalendarClock className="h-6 w-6 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">Daily Summary Agent</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Auto daily briefing — agenda, suggestions &amp; improvements &middot; 8 AM MYT &middot; Google Sheets
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/agents/content-ideas"
            className="group flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 transition-all hover:border-amber-500/50 hover:bg-amber-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <Lightbulb className="h-6 w-6 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">Content Ideas Agent</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                AI-generated posting ideas with copywriting, style guides &amp; image prompts &middot; Every 3 days
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/agents/image-summary"
            className="group flex items-center gap-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
              <ImagePlus className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">Image Summary Agent</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Upload screenshots &amp; images — AI extracts contacts, leads &amp; action items automatically
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/agents/lead-research"
            className="group flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Search className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">Lead Research Agent</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Find potential clients by niche — AI generates leads, drafts cold emails &amp; sends via Gmail
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>

        {/* Chat Agents */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => openAgent(agent)}
            />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
