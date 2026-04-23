"use client";

// Tiny helper for talking to the WhatsApp backend from pages that aren't the
// WhatsApp page itself (Calendar, Sidebar). Reads the backend URL from the same
// places the WhatsApp page does — env var first, then localStorage.

export function getWaBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "";
  if (envUrl) return envUrl;
  if (typeof window === "undefined") return "";
  return localStorage.getItem("wa_backend_url") || "";
}

export async function fetchActiveSessionId(): Promise<string | null> {
  const url = getWaBackendUrl();
  if (!url) return null;
  try {
    const res = await fetch(`${url}/api/sessions`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { sessions?: { id: string }[] };
    return data.sessions?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function waFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const url = getWaBackendUrl();
  if (!url) return null;
  try {
    return await fetch(`${url}${path}`, init);
  } catch {
    return null;
  }
}

export interface Booking {
  id: string;
  session_id: string;
  remote_jid: string | null;
  contact_name: string;
  contact_email: string | null;
  meeting_type: string;
  duration_mins: number;
  start_at: number;
  timezone: string;
  location: string | null;
  location_link: string | null;
  notes: string | null;
  custom_answers: string;
  status: "pending" | "confirmed" | "cancelled";
  read_by_owner: number;
  reminder_sent: number;
  created_at: number;
  updated_at: number;
}
