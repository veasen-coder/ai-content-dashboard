"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useCensor } from "@/hooks/use-censor";
import {
  Send,
  Hash,
  Users,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description?: string;
  members_count?: number;
  date_created?: string;
}

interface Member {
  id: number;
  name: string;
  username: string;
  email: string;
  initials: string;
  profile_picture?: string;
}

interface Message {
  id: string;
  content: string;
  date: string;
  user_id: number;
  replies_count?: number;
  user?: {
    id: number;
    name: string;
    username: string;
    initials: string;
    profile_picture?: string;
  };
}

export default function ChatPage() {
  const censor = useCensor();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch channels
  useEffect(() => {
    async function fetchChannels() {
      try {
        const res = await fetch("/api/clickup/chat?action=channels");
        const data = await res.json();
        if (data.channels) {
          setChannels(data.channels);
          // Auto-select first channel
          if (data.channels.length > 0) {
            setSelectedChannel(data.channels[0]);
          }
        }
      } catch {
        console.error("Failed to fetch channels");
      } finally {
        setLoadingChannels(false);
      }
    }
    fetchChannels();
  }, []);

  // Fetch messages and members when channel changes
  useEffect(() => {
    if (!selectedChannel) return;

    async function fetchMessages() {
      setLoadingMessages(true);
      try {
        const res = await fetch(
          `/api/clickup/chat?action=messages&channel_id=${selectedChannel!.id}`
        );
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          setTimeout(scrollToBottom, 100);
        }
      } catch {
        console.error("Failed to fetch messages");
      } finally {
        setLoadingMessages(false);
      }
    }

    async function fetchMembers() {
      try {
        const res = await fetch(
          `/api/clickup/chat?action=members&channel_id=${selectedChannel!.id}`
        );
        const data = await res.json();
        if (data.members) {
          setMembers(data.members);
        }
      } catch {
        console.error("Failed to fetch members");
      }
    }

    fetchMessages();
    fetchMembers();
  }, [selectedChannel, scrollToBottom]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChannel || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/clickup/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: selectedChannel.id,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        setNewMessage("");
        // Refresh messages
        const msgRes = await fetch(
          `/api/clickup/chat?action=messages&channel_id=${selectedChannel.id}`
        );
        const data = await msgRes.json();
        if (data.messages) {
          setMessages(data.messages);
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch {
      console.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const refreshMessages = async () => {
    if (!selectedChannel) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/clickup/chat?action=messages&channel_id=${selectedChannel.id}`
      );
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch {
      console.error("Failed to refresh");
    } finally {
      setLoadingMessages(false);
    }
  };

  const getMemberName = (userId: number): string => {
    if (!userId) return "Unknown";
    const member = members.find((m) => m.id === userId);
    return member?.name || "Unknown";
  };

  const getMemberInitials = (userId: number): string => {
    if (!userId) return "?";
    const member = members.find((m) => m.id === userId);
    return member?.initials || "?";
  };

  const formatMessageDate = (dateStr: string): string => {
    const date = new Date(parseInt(dateStr));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  const getInitialColor = (userId: number): string => {
    const colors = [
      "bg-violet-600",
      "bg-blue-600",
      "bg-emerald-600",
      "bg-amber-600",
      "bg-rose-600",
      "bg-cyan-600",
    ];
    return colors[userId % colors.length];
  };

  return (
    <PageWrapper title="Team Chat">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Channel List */}
        <div className="flex w-64 shrink-0 flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
          <div className="border-b border-[#1E1E1E] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Channels</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {loadingChannels ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" />
              </div>
            ) : channels.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[#6B7280]">
                No channels found
              </p>
            ) : (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedChannel?.id === channel.id
                      ? "bg-violet-600/10 text-violet-400"
                      : "text-[#6B7280] hover:bg-[#1E1E1E] hover:text-[#F5F5F5]"
                  }`}
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  <span className="truncate">{censor.short(channel.name, 10)}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-[#6B7280]" />
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">
                    {censor.short(selectedChannel.name, 10)}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshMessages}
                    className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#1E1E1E] hover:text-[#F5F5F5]"
                    title="Refresh messages"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loadingMessages ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                      showMembers
                        ? "bg-violet-600/10 text-violet-400"
                        : "text-[#6B7280] hover:bg-[#1E1E1E] hover:text-[#F5F5F5]"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>{members.length}</span>
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1">
                {/* Messages */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex-1 overflow-auto px-4 py-3">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-[#6B7280]">
                        <Hash className="mb-2 h-8 w-8" />
                        <p className="text-sm">No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const userId = msg.user?.id || msg.user_id;
                          return (
                            <div key={msg.id} className="group flex gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getInitialColor(userId)}`}
                              >
                                {msg.user?.initials ||
                                  getMemberInitials(userId)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm font-semibold text-[#F5F5F5]">
                                    {censor.name(msg.user?.name || getMemberName(userId), String(userId))}
                                  </span>
                                  <span className="text-xs text-[#6B7280]">
                                    {formatMessageDate(msg.date)}
                                  </span>
                                </div>
                                <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm text-[#D1D5DB] ${censor.blurClass}`}>
                                  {msg.content}
                                </p>
                                {msg.replies_count && msg.replies_count > 0 && (
                                  <div className="mt-1 flex items-center gap-1 text-xs text-violet-400">
                                    <ChevronRight className="h-3 w-3" />
                                    <span>
                                      {msg.replies_count}{" "}
                                      {msg.replies_count === 1
                                        ? "reply"
                                        : "replies"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-[#1E1E1E] p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={`Message #${selectedChannel.name}...`}
                        className="flex-1 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-violet-600"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Members Sidebar */}
                {showMembers && (
                  <div className="w-52 shrink-0 border-l border-[#1E1E1E] p-3">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                      Members — {members.length}
                    </h4>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getInitialColor(member.id)}`}
                          >
                            {member.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[#F5F5F5]">
                              {censor.name(member.name, String(member.id))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[#6B7280]">
              <div className="text-center">
                <Hash className="mx-auto mb-3 h-10 w-10" />
                <p className="text-sm">Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
