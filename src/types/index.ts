// Client types
export type ClientStage =
  | "lead"
  | "book_call"
  | "call"
  | "thank_you"
  | "meeting_minutes"
  | "demo"
  | "follow_up"
  | "closing"
  | "onboarding"
  | "active"
  | "churned";

export interface Client {
  id: string;
  name: string;
  business: string | null;
  email: string | null;
  phone: string | null;
  stage: ClientStage;
  notes: string | null;
  onboarding_checklist: OnboardingChecklist | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingChecklist {
  contract_sent: boolean;
  contract_signed: boolean;
  onboarding_call: boolean;
  access_granted: boolean;
  first_deliverable: boolean;
}

// Finance types
export type FinanceType = "income" | "expense" | "transfer";
export type FinanceCategory =
  | "client_payment"
  | "tools_subscriptions"
  | "marketing"
  | "operations"
  | "other";
export type AccountName = "ocbc" | "paypal" | "stripe";

export interface FinanceEntry {
  id: string;
  type: FinanceType;
  category: string | null;
  description: string | null;
  amount: number;
  currency: string;
  account: AccountName | null;
  date: string;
  created_at: string;
}

export interface AccountBalance {
  id: string;
  account: AccountName;
  balance: number;
  updated_at: string;
}

// AI Conversation types
export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  title: string | null;
  messages: AIMessage[];
  summary: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

// Resource types
export type ResourceCategory =
  | "scripts"
  | "meeting_minutes"
  | "demos"
  | "templates"
  | "other";
export type ResourceType =
  | "google_doc"
  | "google_sheet"
  | "google_drive"
  | "link"
  | "html";

export interface Resource {
  id: string;
  title: string;
  category: ResourceCategory | null;
  type: ResourceType | null;
  url: string | null;
  description: string | null;
  html_content: string | null;
  is_pinned: boolean;
  created_at: string;
}

// Social Media types
export interface SocialMetric {
  id: string;
  platform: "instagram" | "facebook";
  metric_type: string;
  value: number;
  metadata: Record<string, unknown> | null;
  fetched_at: string;
}

// ClickUp types
export interface ClickUpTask {
  id: string;
  name: string;
  description: string | null;
  status: { status: string; color: string };
  priority: { id: string; priority: string; color: string } | null;
  due_date: string | null;
  assignees: { id: number; username: string; profilePicture: string | null }[];
  tags: { name: string; tag_bg: string; tag_fg: string }[];
  url: string;
}
