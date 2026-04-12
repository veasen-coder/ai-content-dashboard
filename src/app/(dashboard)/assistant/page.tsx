"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Bot, Send, Plus } from "lucide-react";

export default function AssistantPage() {
  const [message, setMessage] = useState("");

  return (
    <PageWrapper title="AI Assistant">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Conversation History */}
        <div className="w-72 shrink-0 rounded-xl border border-[#1E1E1E] bg-[#111111] p-3">
          <button className="mb-3 flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Chat
          </button>
          <div className="space-y-1">
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-1 flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {/* Messages Area */}
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Flogen AI Assistant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask me about strategy, clients, content, or operations
            </p>
          </div>

          {/* Input Area */}
          <div className="border-t border-[#1E1E1E] p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Flogen AI..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={!message.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Model: Claude Sonnet
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
