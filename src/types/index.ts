// Client types
export type ClientStage =
  | "lead"
  | "contacted"
  | "demo_sent"
  | "negotiation"
  | "closed";

export interface Client {
  id: string;
  name: string;
  business: string | null;
  email: string | null;
  phone: string | null;
  stage: ClientStage;
  notes: string | null;
  ai_summary: string | null;
  industry: string | null;
  source: string | null;
  deal_value: string | null;
  close_probability: number | null;
  status: string | null;
  onboarding_checklist: OnboardingChecklist | null;
  created_at: string;
  updated_at: string;
}

// Demo Script types
export interface PitchSlide {
  slide_number: number;
  type:
    | "title"
    | "problem"
    | "solution"
    | "why_us"
    | "demo_intro"
    | "features"
    | "case_study"
    | "pricing"
    | "objections"
    | "close"
    | "next_steps";
  title: string;
  subtitle?: string;
  bullets: string[];
  speaker_notes: string;
  visual_suggestion?: string;
}

export interface DemoScenario {
  title: string;
  description: string;
  trigger: string;
}

export interface DemoScriptContent {
  pitch_deck: {
    client_name: string;
    business_name: string;
    slides: PitchSlide[];
  };
  demo_html: string;
  scenarios_covered: DemoScenario[];
  presenter_notes: string;
}

export interface DemoScript {
  id: string;
  client_id: string;
  duration_minutes: number;
  focus: string | null;
  tone: string | null;
  content: DemoScriptContent;
  generated_via: "api" | "paste_bridge";
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

// Image Dump types
export type ImageDumpStatus =
  | "pending"
  | "analyzing"
  | "reviewed"
  | "approved"
  | "rejected"
  | "partial";

export interface ImageDump {
  id: string;
  title: string | null;
  notes: string | null;
  status: ImageDumpStatus;
  analysis_result: AnalysisResult | null;
  created_at: string;
  updated_at: string;
}

export interface ImageDumpItem {
  id: string;
  dump_id: string;
  file_name: string | null;
  mime_type: string;
  base64_data: string;
  sort_order: number;
  created_at: string;
}

export interface ExtractedContact {
  name: string;
  phone?: string;
  email?: string;
  business?: string;
}

export interface AnalysisGroup {
  id: string;
  label: string;
  image_item_ids: string[];
  contacts: ExtractedContact[];
  conversation_summary: string;
  sentiment: "positive" | "neutral" | "negative";
  action_items: string[];
  additional_suggestions?: string[];
  lead_potential: "high" | "medium" | "low" | "none";
  lead_reasoning: string;
  category: string;
  clarifying_questions?: string[];
  approval_status?: "pending" | "approved" | "rejected";
}

export interface AnalysisResult {
  groups: AnalysisGroup[];
  raw_notes: string;
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
