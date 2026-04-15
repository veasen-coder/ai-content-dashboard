"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Check,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Upload,
  FileSpreadsheet,
  Copy,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --------------- Types ---------------

interface Lead {
  id: string;
  batchId: string;
  businessName: string;
  niche: string;
  country: string;
  state: string;
  phone: string;
  email: string;
  subject: string;
  emailBody: string;
  status: "draft" | "selected" | "sending" | "sent" | "failed";
}

interface HistoryRow {
  batchId: string;
  businessName: string;
  niche: string;
  country: string;
  state: string;
  phone: string;
  email: string;
  subject: string;
  emailBody: string;
  status: string;
  sentAt: string;
  createdAt: string;
}

// --------------- Constants ---------------

const NICHES = [
  "F&B / Restaurant / Cafe",
  "Hair & Beauty Salon",
  "Healthcare / Clinic",
  "Education / Tuition Centre",
  "Real Estate / Property",
  "E-commerce / Online Store",
  "Fitness / Gym",
  "Retail / Fashion",
  "Automotive / Workshop",
  "Travel / Hospitality",
  "Professional Services",
  "Construction / Renovation",
];

const COUNTRIES = ["Malaysia"];

const MALAYSIAN_STATES = [
  "All States",
  "Kuala Lumpur",
  "Selangor",
  "Penang",
  "Johor",
  "Perak",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Sabah",
  "Sarawak",
  "Terengganu",
  "Perlis",
  "Putrajaya",
  "Labuan",
];

// --------------- CSV Parser ---------------

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(current.trim());
        if (row.some((c) => c !== "")) rows.push(row);
        row = [];
        current = "";
        if (char === "\r") i++;
      } else {
        current += char;
      }
    }
  }
  // last row
  row.push(current.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

// Column header matching — flexible to handle various naming conventions
function matchColumn(
  header: string
): keyof Lead | null {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (h.includes("businessname") || h.includes("business") || h.includes("company") || h === "name") return "businessName";
  if (h === "niche" || h.includes("industry") || h.includes("category")) return "niche";
  if (h === "country") return "country";
  if (h === "state" || h.includes("city") || h.includes("location") || h.includes("region")) return "state";
  if (h === "phone" || h.includes("phonenumber") || h.includes("whatsapp") || h.includes("mobile") || h.includes("contact")) return "phone";
  if (h === "email" || h.includes("emailaddress")) return "email";
  if (h === "subject" || h.includes("subjectline") || h.includes("emailsubject")) return "subject";
  if (h.includes("emailbody") || h.includes("body") || h.includes("message") || h.includes("draft")) return "emailBody";
  return null;
}

// --------------- Prompt Script ---------------

const PROMPT_SCRIPT = `You are a lead research specialist for Flogen AI, a Malaysian AI automation company that sells WhatsApp AI agents, automation workflows, and AI customer service systems to SMEs.

Your task: Generate [NUMBER] realistic potential client leads for the "[NICHE]" industry in [LOCATION].

For EACH lead, provide the following as a table or CSV format with these exact column headers:
Business Name | Niche | Country | State | Phone | Email | Subject | Email Body

Rules for each field:
- Business Name: Realistic Malaysian SME name
- Niche: The industry/niche
- Country: Malaysia (or specified country)
- State: The state/city
- Phone: Realistic Malaysian phone number (format: 01X-XXXX XXXX)
- Email: Realistic business email (use common formats like info@, hello@, admin@ with the business domain)
- Subject: A personalised cold email subject line specific to this business (NOT generic)
- Email Body: A complete cold email (150-200 words) that:
  * Opens with something specific about their business type
  * Identifies one pain point they likely face (slow responses, missed messages, manual work)
  * Explains how Flogen AI solves it in one sentence
  * Includes social proof (e.g. "We've helped F&B businesses reduce response time by 80%")
  * Soft CTA: "Would you be open to a quick 15-min call this week?"
  * Sign off as: Haikal, Founder — Flogen AI | flogen.team@gmail.com | +60 11-7557 4966

IMPORTANT: Output as a CSV file format with the headers above. Each row is one lead. Use double quotes around fields that contain commas or newlines.`;

// --------------- Main Page ---------------

export default function LeadResearchPage() {
  // Step 1: Research form
  const [niche, setNiche] = useState("");
  const [country] = useState("Malaysia");
  const [state, setState] = useState("All States");
  const [leadCount, setLeadCount] = useState(5);
  const [researching, setResearching] = useState(false);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPromptScript, setShowPromptScript] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Step 2: Leads table
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  // Step 3: Sending
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<Record<string, string>>({});

  // History
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ---- Research ----
  async function handleResearch() {
    if (!niche) {
      toast.error("Please select a niche");
      return;
    }
    setResearching(true);
    setLeads([]);
    setExpandedId(null);

    try {
      const res = await fetch("/api/agents/lead-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          country,
          state: state === "All States" ? "" : state,
          count: leadCount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to research leads");
        return;
      }

      const data = await res.json();
      const parsed: Lead[] = (data.leads || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (l: any) => ({
          id: l.id,
          batchId: l.batchId,
          businessName: l.businessName || l.business_name || "",
          niche: l.niche || niche,
          country: l.country || country,
          state: l.state || state,
          phone: l.phone || "",
          email: l.email || "",
          subject: l.subject || "",
          emailBody: l.emailBody || l.email_body || "",
          status: "draft" as const,
        })
      );

      setLeads(parsed);
      toast.success(`Found ${parsed.length} leads!`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setResearching(false);
    }
  }

  // ---- File Upload ----
  async function handleFileUpload(file: File) {
    setUploading(true);
    setLeads([]);
    setExpandedId(null);

    try {
      const batchId = `upload_${Date.now()}_${file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "_")}`;
      let rows: string[][] = [];

      if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const text = await file.text();
        rows = parseCSV(text);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Dynamically load SheetJS from CDN at runtime
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let XLSX = (window as any).XLSX;
        if (!XLSX) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load XLSX library"));
            document.head.appendChild(script);
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          XLSX = (window as any).XLSX;
        }
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
        });
        rows = data;
      } else {
        toast.error("Unsupported file type. Use CSV or XLSX.");
        setUploading(false);
        return;
      }

      if (rows.length < 2) {
        toast.error("File is empty or has no data rows");
        setUploading(false);
        return;
      }

      // Map headers
      const headers = rows[0];
      const columnMap: Record<number, keyof Lead> = {};
      headers.forEach((h, i) => {
        const mapped = matchColumn(h);
        if (mapped) columnMap[i] = mapped;
      });

      // Require at least businessName or email
      const hasBusiness = Object.values(columnMap).includes("businessName");
      const hasEmail = Object.values(columnMap).includes("email");

      if (!hasBusiness && !hasEmail) {
        toast.error(
          "Could not find 'Business Name' or 'Email' columns. Please check your headers."
        );
        setUploading(false);
        return;
      }

      // Parse data rows
      const parsed: Lead[] = rows.slice(1).map((row, i) => {
        const lead: Partial<Lead> = {};
        Object.entries(columnMap).forEach(([colIdx, field]) => {
          const val = row[parseInt(colIdx)] || "";
          (lead as Record<string, string>)[field] = val;
        });

        return {
          id: `${batchId}_${i}`,
          batchId,
          businessName: lead.businessName || "",
          niche: lead.niche || niche || "Uploaded",
          country: lead.country || country,
          state: lead.state || state === "All States" ? "" : state,
          phone: lead.phone || "",
          email: lead.email || "",
          subject: lead.subject || "",
          emailBody: lead.emailBody || "",
          status: "draft" as const,
        };
      }).filter((l) => l.businessName || l.email); // Remove empty rows

      setLeads(parsed);
      toast.success(`Imported ${parsed.length} leads from ${file.name}`);
    } catch (err) {
      console.error("File parse error:", err);
      toast.error("Failed to parse file. Make sure it has the correct format.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function copyPromptScript() {
    const customized = PROMPT_SCRIPT
      .replace("[NUMBER]", String(leadCount))
      .replace("[NICHE]", niche || "[YOUR NICHE]")
      .replace("[LOCATION]", state && state !== "All States" ? `${state}, ${country}` : country);
    navigator.clipboard.writeText(customized);
    setPromptCopied(true);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setPromptCopied(false), 2000);
  }

  // ---- Select/Deselect ----
  function toggleSelect(id: string) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status:
                l.status === "selected"
                  ? "draft"
                  : l.status === "draft"
                  ? "selected"
                  : l.status,
            }
          : l
      )
    );
  }

  function handleSelectAll() {
    const newState = !selectAll;
    setSelectAll(newState);
    setLeads((prev) =>
      prev.map((l) =>
        l.status === "draft" || l.status === "selected"
          ? { ...l, status: newState ? "selected" : "draft" }
          : l
      )
    );
  }

  // ---- Edit fields inline ----
  function updateLead(id: string, field: keyof Lead, value: string) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  // ---- Send Emails ----
  async function handleSendEmails() {
    const selected = leads.filter((l) => l.status === "selected");
    if (selected.length === 0) {
      toast.error("No leads selected");
      return;
    }

    setSending(true);
    const progress: Record<string, string> = {};
    let successCount = 0;
    let failCount = 0;

    for (const lead of selected) {
      progress[lead.id] = "sending";
      setSendProgress({ ...progress });

      // Update status to sending
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, status: "sending" as const } : l
        )
      );

      try {
        const res = await fetch("/api/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: lead.email,
            subject: lead.subject,
            body: lead.emailBody,
            from: "Haikal from Flogen AI",
          }),
        });

        if (res.ok) {
          progress[lead.id] = "sent";
          successCount++;
          setLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id ? { ...l, status: "sent" as const } : l
            )
          );
        } else {
          progress[lead.id] = "failed";
          failCount++;
          setLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id ? { ...l, status: "failed" as const } : l
            )
          );
        }
      } catch {
        progress[lead.id] = "failed";
        failCount++;
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, status: "failed" as const } : l
          )
        );
      }

      setSendProgress({ ...progress });
    }

    // Log sent leads to Google Sheets
    const sentLeads = leads
      .filter((l) => progress[l.id] === "sent")
      .map((l) => ({
        batchId: l.batchId,
        businessName: l.businessName,
        niche: l.niche,
        country: l.country,
        state: l.state,
        phone: l.phone,
        email: l.email,
        subject: l.subject,
        emailBody: l.emailBody,
        status: "sent",
        sentAt: new Date().toISOString().split("T")[0],
      }));

    if (sentLeads.length > 0) {
      try {
        await fetch("/api/google/sheets/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: sentLeads }),
        });
      } catch {
        // Sheets logging is optional
      }
    }

    setSending(false);
    if (successCount > 0) toast.success(`Sent ${successCount} emails!`);
    if (failCount > 0) toast.error(`${failCount} emails failed`);
  }

  // ---- History ----
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/google/sheets/leads");
      if (res.ok) {
        const data = await res.json();
        const rows: HistoryRow[] = (data.rows || []).map(
          (r: string[]) => ({
            batchId: r[0] || "",
            businessName: r[1] || "",
            niche: r[2] || "",
            country: r[3] || "",
            state: r[4] || "",
            phone: r[5] || "",
            email: r[6] || "",
            subject: r[7] || "",
            emailBody: r[8] || "",
            status: r[9] || "",
            sentAt: r[10] || "",
            createdAt: r[11] || "",
          })
        );
        setHistory(rows.reverse()); // Most recent first
      }
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ---- Computed ----
  const selectedCount = leads.filter(
    (l) => l.status === "selected"
  ).length;
  const sentCount = leads.filter((l) => l.status === "sent").length;
  // Group history by batch
  const historyBatches = history.reduce(
    (acc, row) => {
      if (!acc[row.batchId]) {
        acc[row.batchId] = {
          batchId: row.batchId,
          niche: row.niche,
          state: row.state,
          date: row.createdAt || row.sentAt,
          leads: [],
        };
      }
      acc[row.batchId].leads.push(row);
      return acc;
    },
    {} as Record<
      string,
      {
        batchId: string;
        niche: string;
        state: string;
        date: string;
        leads: HistoryRow[];
      }
    >
  );

  return (
    <PageWrapper title="Lead Research Agent">
      <div className="space-y-6">
        {/* Back */}
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Agents
        </Link>

        {/* ============ STEP 1: Research ============ */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <Search className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Step 1 — Research</h2>
              <p className="text-[10px] text-muted-foreground">
                Select a niche and location to find potential clients
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Niche */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Niche *
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
              >
                <option value="">Select niche...</option>
                {NICHES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div className="w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Country
              </label>
              <select
                value={country}
                disabled
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm text-foreground opacity-60 [color-scheme:dark]"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* State */}
            <div className="w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
              >
                {MALAYSIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div className="w-[100px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Leads
              </label>
              <select
                value={leadCount}
                onChange={(e) => setLeadCount(parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
              >
                {[3, 5, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Search button */}
            <button
              onClick={handleResearch}
              disabled={!niche || researching}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {researching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Find Leads
                </>
              )}
            </button>
          </div>
        </div>

        {/* ============ OR: Upload File ============ */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                <Upload className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  Or — Upload CSV / XLSX
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  Import leads from a spreadsheet to skip AI generation and save
                  API costs
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPromptScript(!showPromptScript)}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Prompt Script
            </button>
          </div>

          {/* Prompt Script Panel */}
          {showPromptScript && (
            <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-violet-400">
                  Reusable Prompt — Copy &amp; paste into ChatGPT / Claude
                </h3>
                <button
                  onClick={copyPromptScript}
                  className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
                >
                  {promptCopied ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">
                This prompt will auto-fill with your selected niche, location
                &amp; lead count. Run it in ChatGPT or Claude, then download the
                output as CSV and upload below.
              </p>
              <pre className="max-h-[200px] overflow-y-auto rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3 text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                {PROMPT_SCRIPT.replace("[NUMBER]", String(leadCount))
                  .replace("[NICHE]", niche || "[YOUR NICHE]")
                  .replace(
                    "[LOCATION]",
                    state && state !== "All States"
                      ? `${state}, ${country}`
                      : country
                  )}
              </pre>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[#2E2E2E] bg-[#0A0A0A] px-6 py-8 transition-colors hover:border-amber-500/40 hover:bg-amber-500/5"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            ) : (
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {uploading
                  ? "Parsing file..."
                  : "Drag & drop a CSV or XLSX file here"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                Required columns: Business Name, Email · Optional: Niche,
                Country, State, Phone, Subject, Email Body
              </p>
            </div>
            {!uploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                Browse Files
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </div>

          {/* Format hint */}
          <div className="mt-3 flex items-start gap-2 text-[10px] text-muted-foreground/60">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              CSV/XLSX should have headers in the first row. Column names are
              matched flexibly — e.g. &quot;Business Name&quot;,
              &quot;Company&quot;, &quot;Name&quot; all work. Fields without a
              matching column will be left empty for you to fill in.
            </span>
          </div>
        </div>

        {/* ============ STEP 2: Review & Select ============ */}
        {leads.length > 0 && (
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                  <Building2 className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">
                    Step 2 — Review & Select
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    {leads.length} leads found · Click to expand and edit
                    email drafts
                  </p>
                </div>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectAll ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[40px_1fr_120px_100px_1fr_80px] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-[#1E1E1E]">
              <span></span>
              <span>Business</span>
              <span>Niche</span>
              <span>State</span>
              <span>Email</span>
              <span>Status</span>
            </div>

            {/* Lead Rows */}
            <div className="divide-y divide-[#1E1E1E]">
              {leads.map((lead) => {
                const isExpanded = expandedId === lead.id;
                const isSelected =
                  lead.status === "selected" || lead.status === "sending";
                const isSent = lead.status === "sent";
                const isFailed = lead.status === "failed";

                return (
                  <div key={lead.id}>
                    {/* Row */}
                    <div
                      className={`grid grid-cols-1 md:grid-cols-[40px_1fr_120px_100px_1fr_80px] gap-2 items-center px-3 py-3 cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-[#0A0A0A]"
                          : "hover:bg-[#0A0A0A]/50"
                      }`}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : lead.id)
                      }
                    >
                      {/* Checkbox */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(lead.id);
                        }}
                        className="flex items-center justify-center"
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors cursor-pointer ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500"
                              : isSent
                              ? "border-emerald-500 bg-emerald-500/20"
                              : isFailed
                              ? "border-red-500 bg-red-500/20"
                              : "border-[#333] hover:border-[#555]"
                          }`}
                        >
                          {(isSelected || isSent) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                          {isFailed && (
                            <X className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                      </div>

                      {/* Business name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {lead.businessName}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      {/* Niche */}
                      <span className="text-xs text-muted-foreground truncate hidden md:block">
                        {lead.niche}
                      </span>

                      {/* State */}
                      <span className="text-xs text-muted-foreground hidden md:block">
                        {lead.state}
                      </span>

                      {/* Email */}
                      <span className="text-xs text-muted-foreground truncate hidden md:block font-mono">
                        {lead.email}
                      </span>

                      {/* Status */}
                      <span
                        className={`text-[10px] font-semibold uppercase hidden md:block ${
                          isSent
                            ? "text-emerald-400"
                            : isFailed
                            ? "text-red-400"
                            : lead.status === "sending"
                            ? "text-amber-400"
                            : isSelected
                            ? "text-blue-400"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="bg-[#0A0A0A] px-4 pb-4 pt-1 space-y-3 border-t border-[#1E1E1E]/50">
                        {/* Contact info */}
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <input
                              value={lead.email}
                              onChange={(e) =>
                                updateLead(lead.id, "email", e.target.value)
                              }
                              className="bg-transparent border-b border-transparent hover:border-[#333] focus:border-emerald-500 focus:outline-none text-foreground font-mono px-1 py-0.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <input
                              value={lead.phone}
                              onChange={(e) =>
                                updateLead(lead.id, "phone", e.target.value)
                              }
                              className="bg-transparent border-b border-transparent hover:border-[#333] focus:border-emerald-500 focus:outline-none text-foreground px-1 py-0.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {lead.state}, {lead.country}
                            </span>
                          </div>
                        </div>

                        {/* Email draft */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Email Subject
                          </label>
                          <input
                            value={lead.subject}
                            onChange={(e) =>
                              updateLead(lead.id, "subject", e.target.value)
                            }
                            className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Email Body
                          </label>
                          <textarea
                            value={lead.emailBody}
                            onChange={(e) =>
                              updateLead(
                                lead.id,
                                "emailBody",
                                e.target.value
                              )
                            }
                            rows={8}
                            className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-foreground focus:border-emerald-500 focus:outline-none resize-y font-mono leading-relaxed"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============ STEP 3: Send ============ */}
        {leads.length > 0 && (
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
                  <Send className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Step 3 — Send</h2>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedCount > 0
                      ? `${selectedCount} leads selected`
                      : "Select leads above to send"}
                    {sentCount > 0 && ` · ${sentCount} already sent`}
                    {" · From: flogen.team@gmail.com"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSendEmails}
                disabled={selectedCount === 0 || sending}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send {selectedCount} Cold Email
                    {selectedCount !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>

            {/* Send progress */}
            {Object.keys(sendProgress).length > 0 && (
              <div className="mt-4 space-y-1.5">
                {leads
                  .filter((l) => sendProgress[l.id])
                  .map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      {sendProgress[l.id] === "sending" && (
                        <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                      )}
                      {sendProgress[l.id] === "sent" && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      )}
                      {sendProgress[l.id] === "failed" && (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      )}
                      <span className="text-muted-foreground">
                        {l.businessName}
                      </span>
                      <span className="font-mono text-muted-foreground/60">
                        {l.email}
                      </span>
                      <span
                        className={`ml-auto font-semibold ${
                          sendProgress[l.id] === "sent"
                            ? "text-emerald-400"
                            : sendProgress[l.id] === "failed"
                            ? "text-red-400"
                            : "text-amber-400"
                        }`}
                      >
                        {sendProgress[l.id]}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ============ HISTORY ============ */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) fetchHistory();
            }}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Sent History</h2>
              <span className="text-[10px] text-muted-foreground">
                ({history.length} emails sent)
              </span>
            </div>
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showHistory && (
            <div className="mt-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : Object.keys(historyBatches).length > 0 ? (
                <div className="space-y-3">
                  {Object.values(historyBatches).map((batch) => (
                    <div
                      key={batch.batchId}
                      className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            {batch.niche}
                          </span>
                          {batch.state && (
                            <span className="text-[10px] text-muted-foreground">
                              · {batch.state}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {batch.date}
                          </span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                            {batch.leads.length} sent
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {batch.leads.map((l, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                            <span className="font-medium truncate flex-1">
                              {l.businessName}
                            </span>
                            <span className="font-mono text-muted-foreground/60 truncate">
                              {l.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No emails sent yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
