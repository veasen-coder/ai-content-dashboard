"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useDemoModeStore } from "@/store/demo-mode-store";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Sparkles,
  CheckCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
}

const CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Ahmad Rahman",
    avatar: "A",
    preview: "Nak book for 2 pax boleh?",
    time: "2 min",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Siti Nurhaliza",
    avatar: "S",
    preview: "Terima kasih! See you tomorrow 🙏",
    time: "12 min",
    unread: 0,
    online: true,
  },
  {
    id: "3",
    name: "Raj Kumar",
    avatar: "R",
    preview: "Bot: Your booking is confirmed for...",
    time: "34 min",
    unread: 0,
    online: false,
  },
  {
    id: "4",
    name: "Mei Ling Tan",
    avatar: "M",
    preview: "Do you have vegetarian menu?",
    time: "1 hr",
    unread: 1,
    online: true,
  },
  {
    id: "5",
    name: "Farah Aziz",
    avatar: "F",
    preview: "Bot: Here's our promo for this week!",
    time: "2 hrs",
    unread: 0,
    online: false,
  },
  {
    id: "6",
    name: "Hafiz Ibrahim",
    avatar: "H",
    preview: "Okay, thanks for the info!",
    time: "3 hrs",
    unread: 0,
    online: false,
  },
  {
    id: "7",
    name: "Priya Sharma",
    avatar: "P",
    preview: "Can I reschedule to Saturday?",
    time: "5 hrs",
    unread: 1,
    online: false,
  },
  {
    id: "8",
    name: "Daniel Wong",
    avatar: "D",
    preview: "Bot: Your table for 4 is confirmed",
    time: "Yesterday",
    unread: 0,
    online: false,
  },
];

interface Message {
  id: string;
  from: "customer" | "ai" | "human";
  text: string;
  time: string;
}

const MESSAGES: Message[] = [
  {
    id: "1",
    from: "customer",
    text: "Hi, is your place open tonight?",
    time: "2:14 PM",
  },
  {
    id: "2",
    from: "ai",
    text: "Hi Ahmad! Yes, we're open from 11 AM to 11 PM every day. How can I help you today?",
    time: "2:14 PM",
  },
  {
    id: "3",
    from: "customer",
    text: "Nak book for 2 pax boleh?",
    time: "2:16 PM",
  },
  {
    id: "4",
    from: "ai",
    text: "Of course! Let me help with that. What time would you like to come in today?",
    time: "2:16 PM",
  },
  {
    id: "5",
    from: "customer",
    text: "Around 7:30 PM",
    time: "2:17 PM",
  },
  {
    id: "6",
    from: "ai",
    text: "Perfect! I've booked a table for 2 pax at 7:30 PM tonight under 'Ahmad Rahman'. You'll get a reminder 1 hour before. Anything else I can help with? 🙏",
    time: "2:17 PM",
  },
];

const QUICK_REPLIES = [
  "Our hours",
  "Check availability",
  "Send menu",
  "Confirm booking",
  "Get directions",
];

export default function DemoWhatsAppPage() {
  const { demoClientName } = useDemoModeStore();
  const [activeId, setActiveId] = useState("1");
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const activeConv = CONVERSATIONS.find((c) => c.id === activeId)!;

  return (
    <PageWrapper title="WhatsApp Business">
      <div className="space-y-4">
        {/* Top stats bar */}
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="font-mono text-lg font-bold">147</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                conversations today
              </div>
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-lg font-bold text-[#10B981]">
              94%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              auto-replied
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-lg font-bold">12</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              handoffs to human
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-lg font-bold">&lt; 8 sec</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              avg response
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#10B981]" />
            <span className="text-xs font-medium text-[#10B981]">
              AI Agent active
            </span>
          </div>
        </div>

        {/* Split view */}
        <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <div className="flex flex-col border-r border-border">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search conversations..."
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {CONVERSATIONS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/50 p-3 text-left transition-colors hover:bg-muted/30",
                    activeId === c.id && "bg-primary/5"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                      {c.avatar}
                    </div>
                    {c.online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-[#10B981]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {c.time}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <p className="flex-1 truncate text-xs text-muted-foreground">
                        {c.preview}
                      </p>
                      {c.unread > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat view */}
          <div className="flex min-w-0 flex-col">
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {activeConv.avatar}
                  </div>
                  {activeConv.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-[#10B981]" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold">{activeConv.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {activeConv.online ? "online" : "last seen recently"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <button className="rounded-lg p-2 hover:bg-muted">
                  <Phone className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 hover:bg-muted">
                  <Video className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 hover:bg-muted">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-auto bg-background/30 p-4">
              <div className="flex justify-center">
                <span className="rounded-full bg-muted/60 px-3 py-1 text-[10px] text-muted-foreground">
                  Today
                </span>
              </div>
              {MESSAGES.map((m) => {
                const isCustomer = m.from === "customer";
                const isAI = m.from === "ai";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      isCustomer ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-3 py-2 shadow-sm",
                        isCustomer
                          ? "rounded-bl-sm bg-card border border-border"
                          : isAI
                            ? "rounded-br-sm bg-gradient-to-br from-primary to-violet-600 text-white"
                            : "rounded-br-sm bg-[#10B981] text-white"
                      )}
                    >
                      {isAI && (
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-white/90">
                          <div className="flex h-3 w-3 items-center justify-center rounded-full bg-white/20">
                            <Sparkles className="h-2 w-2" />
                          </div>
                          <span>AI Reply</span>
                        </div>
                      )}
                      <p className="text-sm leading-snug">{m.text}</p>
                      <div
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1 text-[10px]",
                          isCustomer
                            ? "text-muted-foreground"
                            : "text-white/70"
                        )}
                      >
                        <span>{m.time}</span>
                        {!isCustomer && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* AI thinking indicator */}
              <div className="flex items-center gap-2 pl-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-3 w-3" />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  AI Agent ready to respond for {demoClientName}
                </span>
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              {showQuickReplies && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                  <Smile className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                    showQuickReplies
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Quick
                </button>
                <input
                  placeholder="Type a message or let AI handle it..."
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:border-primary/50 focus:outline-none"
                />
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
