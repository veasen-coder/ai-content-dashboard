"use client";

import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  FileText,
  Receipt,
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Copy,
  Check,
  Loader2,
  Sparkles,
  User,
  Building2,
  Mail,
  Calendar,
  DollarSign,
  Eye,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --------------- Types ---------------

interface Client {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  stage: string;
  deal_value: number;
  industry: string;
  notes: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface HistoryEntry {
  id: string;
  type: "invoice" | "proposal";
  clientName: string;
  title: string;
  amount: number;
  date: string;
}

// --------------- Helpers ---------------

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `INV-${y}${m}${d}-${seq}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().split("T")[0];
}

// --------------- Claude Helper ---------------

async function callClaude(system: string, userMessage: string): Promise<string> {
  const res = await fetch("/api/claude/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) throw new Error("Claude API error");

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  let result = "";
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data && data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              result += parsed.delta.text;
            }
          } catch {
            // skip parse errors
          }
        }
      }
    }
  }

  return result;
}

// --------------- System Prompts ---------------

const INVOICE_SYSTEM =
  "You are an invoice assistant for Flogen AI, a Malaysian AI consulting company. Generate professional, clear invoice descriptions and notes. Currency is MYR (Malaysian Ringgit). Keep it concise and business-appropriate. Return only the improved text, no extra commentary.";

const PROPOSAL_SYSTEM =
  "You are a proposal writer for Flogen AI, a Malaysian AI consulting company specializing in AI-powered business solutions including social media management, lead generation, content creation, and business automation. Generate compelling, professional proposals. Currency is MYR. Include clear scope, deliverables, and value propositions. Use markdown formatting.";

// --------------- Default Values ---------------

const DEFAULT_TERMS = `1. Payment is due within the specified payment terms from the date of invoice.
2. All prices are in Malaysian Ringgit (MYR) and exclusive of any applicable taxes unless stated otherwise.
3. This proposal is valid for 30 days from the date of issue.
4. Flogen AI retains intellectual property rights until full payment is received.
5. Any changes to the agreed scope of work may result in additional charges.
6. Either party may terminate the agreement with 30 days written notice.`;

// --------------- Component ---------------

export default function InvoiceGeneratorPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"invoice" | "proposal">("invoice");

  // Client data
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // Shared client fields
  const [clientName, setClientName] = useState("");
  const [clientBusiness, setClientBusiness] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientIndustry, setClientIndustry] = useState("");
  const [clientDealValue, setClientDealValue] = useState(0);

  // Invoice state
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(toDateInputValue(new Date()));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toDateInputValue(d);
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: generateId(), description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Proposal state
  const [proposalTitle, setProposalTitle] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([
    { id: generateId(), name: "Standard", price: 0, features: [""] },
  ]);
  const [timeline, setTimeline] = useState("");
  const [terms, setTerms] = useState(DEFAULT_TERMS);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // --------------- Fetch Clients ---------------

  useEffect(() => {
    fetch("/api/supabase/clients")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
        else if (data.data && Array.isArray(data.data)) setClients(data.data);
      })
      .catch(() => toast.error("Failed to load clients"));
  }, []);

  // --------------- Client Selection ---------------

  const selectClient = useCallback(
    (id: string) => {
      const c = clients.find((cl) => cl.id === id);
      if (c) {
        setSelectedClientId(id);
        setClientName(c.name || "");
        setClientBusiness(c.business || "");
        setClientEmail(c.email || "");
        setClientIndustry(c.industry || "");
        setClientDealValue(c.deal_value || 0);
      }
      setClientDropdownOpen(false);
    },
    [clients]
  );

  const clearClient = useCallback(() => {
    setSelectedClientId("");
    setClientName("");
    setClientBusiness("");
    setClientEmail("");
    setClientIndustry("");
    setClientDealValue(0);
  }, []);

  // --------------- Line Items ---------------

  const addLineItem = () =>
    setLineItems((prev) => [...prev, { id: generateId(), description: "", quantity: 1, unitPrice: 0 }]);

  const removeLineItem = (id: string) =>
    setLineItems((prev) => (prev.length > 1 ? prev.filter((li) => li.id !== id) : prev));

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) =>
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)));

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // --------------- Pricing Tiers ---------------

  const addPricingTier = () =>
    setPricingTiers((prev) => [...prev, { id: generateId(), name: "", price: 0, features: [""] }]);

  const removePricingTier = (id: string) =>
    setPricingTiers((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev));

  const updateTier = (id: string, field: "name" | "price", value: string | number) =>
    setPricingTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const addTierFeature = (tierId: string) =>
    setPricingTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, features: [...t.features, ""] } : t))
    );

  const updateTierFeature = (tierId: string, idx: number, value: string) =>
    setPricingTiers((prev) =>
      prev.map((t) =>
        t.id === tierId ? { ...t, features: t.features.map((f, i) => (i === idx ? value : f)) } : t
      )
    );

  const removeTierFeature = (tierId: string, idx: number) =>
    setPricingTiers((prev) =>
      prev.map((t) =>
        t.id === tierId
          ? { ...t, features: t.features.length > 1 ? t.features.filter((_, i) => i !== idx) : t.features }
          : t
      )
    );

  const proposalTotal = pricingTiers.reduce((sum, t) => sum + t.price, 0);

  // --------------- AI Generation ---------------

  const generateInvoiceAI = async () => {
    if (lineItems.every((li) => !li.description.trim())) {
      toast.error("Add at least one line item description before generating");
      return;
    }
    setGenerating(true);
    try {
      const prompt = `Improve these invoice line item descriptions for a client:
Client: ${clientName} (${clientBusiness})
Industry: ${clientIndustry}
Line items:
${lineItems.map((li, i) => `${i + 1}. ${li.description} — Qty: ${li.quantity}, Unit Price: RM ${li.unitPrice}`).join("\n")}

Also suggest a professional invoice note. Return in this exact format:
ITEMS:
1. [improved description]
2. [improved description]
...
NOTES:
[professional note text]`;

      const result = await callClaude(INVOICE_SYSTEM, prompt);

      // Parse items
      const itemsMatch = result.match(/ITEMS:\s*\n([\s\S]*?)(?=NOTES:|$)/);
      if (itemsMatch) {
        const lines = itemsMatch[1].trim().split("\n").filter((l) => l.trim());
        setLineItems((prev) =>
          prev.map((li, i) => {
            const line = lines[i];
            if (line) {
              const cleaned = line.replace(/^\d+\.\s*/, "").trim();
              return { ...li, description: cleaned };
            }
            return li;
          })
        );
      }

      // Parse notes
      const notesMatch = result.match(/NOTES:\s*\n([\s\S]*)/);
      if (notesMatch) {
        setInvoiceNotes(notesMatch[1].trim());
      }

      toast.success("Invoice polished by AI");
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const generateProposalAI = async () => {
    setGenerating(true);
    try {
      const prompt = `Generate a professional proposal for:
Client: ${clientName} (${clientBusiness})
Industry: ${clientIndustry}
Estimated deal value: RM ${clientDealValue}
Title: ${proposalTitle || "AI-Powered Business Solutions"}
Current scope draft: ${scopeOfWork || "Not provided yet"}
Current pricing tiers: ${pricingTiers.map((t) => `${t.name}: RM ${t.price} — ${t.features.join(", ")}`).join(" | ") || "None"}
Timeline: ${timeline || "Not specified"}

Generate:
1. A compelling scope of work (3-5 paragraphs, markdown formatted)
2. Improved pricing tiers (keep existing structure but enhance descriptions)
3. A realistic timeline

Format response as:
SCOPE:
[scope text]

TIMELINE:
[timeline text]`;

      const result = await callClaude(PROPOSAL_SYSTEM, prompt);

      const scopeMatch = result.match(/SCOPE:\s*\n([\s\S]*?)(?=TIMELINE:|$)/);
      if (scopeMatch) setScopeOfWork(scopeMatch[1].trim());

      const timelineMatch = result.match(/TIMELINE:\s*\n([\s\S]*)/);
      if (timelineMatch) setTimeline(timelineMatch[1].trim());

      if (!proposalTitle) {
        setProposalTitle(`AI-Powered Solutions for ${clientBusiness || clientName || "Your Business"}`);
      }

      toast.success("Proposal generated by AI");
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // --------------- Invoice HTML ---------------

  const generateInvoiceHTML = useCallback(() => {
    return `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px;">
    <div>
      <h1 style="margin: 0; font-size: 28px; color: #7C3AED;">INVOICE</h1>
      <p style="margin: 4px 0 0; color: #666; font-size: 14px;">${invoiceNumber}</p>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 18px;">Flogen AI</h2>
      <p style="margin: 4px 0 0; color: #666; font-size: 13px;">flogen.team@gmail.com</p>
      <p style="margin: 2px 0 0; color: #666; font-size: 13px;">Malaysia</p>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div>
      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Bill To</p>
      <p style="margin: 6px 0 0; font-weight: 600;">${clientName}</p>
      ${clientBusiness ? `<p style="margin: 2px 0 0; color: #444;">${clientBusiness}</p>` : ""}
      ${clientEmail ? `<p style="margin: 2px 0 0; color: #444;">${clientEmail}</p>` : ""}
    </div>
    <div style="text-align: right;">
      <p style="margin: 0; color: #666; font-size: 12px;">Invoice Date</p>
      <p style="margin: 4px 0 12px; font-weight: 500;">${formatDate(invoiceDate)}</p>
      <p style="margin: 0; color: #666; font-size: 12px;">Due Date</p>
      <p style="margin: 4px 0 0; font-weight: 500;">${formatDate(dueDate)}</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="background: #f8f8f8;">
        <th style="text-align: left; padding: 10px 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e0e0e0;">Description</th>
        <th style="text-align: center; padding: 10px 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e0e0e0;">Qty</th>
        <th style="text-align: right; padding: 10px 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e0e0e0;">Unit Price</th>
        <th style="text-align: right; padding: 10px 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e0e0e0;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems
        .filter((li) => li.description.trim())
        .map(
          (li) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${li.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${li.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-family: monospace;">RM ${li.unitPrice.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-family: monospace;">RM ${(li.quantity * li.unitPrice).toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
    <div style="width: 250px;">
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
        <span style="color: #666;">Subtotal</span>
        <span style="font-family: monospace;">${formatCurrency(subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
        <span style="color: #666;">Tax (${taxRate}%)</span>
        <span style="font-family: monospace;">${formatCurrency(taxAmount)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: 700; border-top: 2px solid #7C3AED; margin-top: 6px;">
        <span>Total</span>
        <span style="font-family: monospace; color: #7C3AED;">${formatCurrency(total)}</span>
      </div>
    </div>
  </div>

  ${invoiceNotes ? `<div style="background: #f9f9f9; padding: 16px; border-radius: 8px; border-left: 3px solid #7C3AED;"><p style="margin: 0 0 4px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Notes</p><p style="margin: 0; font-size: 14px; color: #444; white-space: pre-wrap;">${invoiceNotes}</p></div>` : ""}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
    <p>Thank you for your business! — Flogen AI</p>
  </div>
</div>`;
  }, [invoiceNumber, invoiceDate, dueDate, clientName, clientBusiness, clientEmail, lineItems, subtotal, taxRate, taxAmount, total, invoiceNotes]);

  // --------------- Proposal HTML ---------------

  const generateProposalHTML = useCallback(() => {
    return `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
  <div style="border-bottom: 3px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px;">
    <div style="text-align: right; margin-bottom: 16px;">
      <h2 style="margin: 0; font-size: 18px;">Flogen AI</h2>
      <p style="margin: 4px 0 0; color: #666; font-size: 13px;">flogen.team@gmail.com</p>
    </div>
    <h1 style="margin: 0; font-size: 26px; color: #7C3AED;">PROPOSAL</h1>
    <p style="margin: 8px 0 0; font-size: 18px; font-weight: 500;">${proposalTitle || "Business Proposal"}</p>
    <p style="margin: 8px 0 0; color: #666; font-size: 13px;">Prepared for: ${clientName}${clientBusiness ? ` — ${clientBusiness}` : ""}</p>
    <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Date: ${formatDate(new Date().toISOString())}</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 18px; color: #7C3AED; border-bottom: 1px solid #eee; padding-bottom: 8px;">Scope of Work</h2>
    <div style="font-size: 14px; line-height: 1.7; color: #333; white-space: pre-wrap;">${scopeOfWork}</div>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 18px; color: #7C3AED; border-bottom: 1px solid #eee; padding-bottom: 8px;">Pricing</h2>
    ${pricingTiers
      .map(
        (tier) => `
      <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 12px; border-left: 3px solid #7C3AED;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px;">${tier.name}</h3>
          <span style="font-family: monospace; font-size: 18px; font-weight: 700; color: #7C3AED;">RM ${tier.price.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #444;">
          ${tier.features
            .filter((f) => f.trim())
            .map((f) => `<li style="margin-bottom: 4px;">${f}</li>`)
            .join("")}
        </ul>
      </div>`
      )
      .join("")}
  </div>

  ${
    timeline
      ? `<div style="margin-bottom: 30px;">
    <h2 style="font-size: 18px; color: #7C3AED; border-bottom: 1px solid #eee; padding-bottom: 8px;">Timeline</h2>
    <div style="font-size: 14px; line-height: 1.7; color: #333; white-space: pre-wrap;">${timeline}</div>
  </div>`
      : ""
  }

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 18px; color: #7C3AED; border-bottom: 1px solid #eee; padding-bottom: 8px;">Terms & Conditions</h2>
    <div style="font-size: 13px; line-height: 1.7; color: #555; white-space: pre-wrap;">${terms}</div>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
    <p>We look forward to working with you! — Flogen AI</p>
  </div>
</div>`;
  }, [proposalTitle, clientName, clientBusiness, scopeOfWork, pricingTiers, timeline, terms]);

  // --------------- Actions ---------------

  const handleSendEmail = async () => {
    if (!clientEmail) {
      toast.error("Client email is required to send");
      return;
    }
    setSending(true);
    try {
      const html = activeTab === "invoice" ? generateInvoiceHTML() : generateProposalHTML();
      const subject =
        activeTab === "invoice"
          ? `Invoice ${invoiceNumber} — Flogen AI`
          : `Proposal: ${proposalTitle || "Business Proposal"} — Flogen AI`;

      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: clientEmail,
          subject,
          body: html,
          from: "Flogen AI",
        }),
      });

      if (!res.ok) throw new Error("Send failed");

      toast.success(`${activeTab === "invoice" ? "Invoice" : "Proposal"} sent to ${clientEmail}`);

      // Add to history
      setHistory((prev) => [
        {
          id: generateId(),
          type: activeTab,
          clientName: clientName || "Unknown",
          title: activeTab === "invoice" ? invoiceNumber : proposalTitle,
          amount: activeTab === "invoice" ? total : proposalTotal,
          date: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleCopyText = () => {
    let text = "";
    if (activeTab === "invoice") {
      text = `INVOICE — ${invoiceNumber}\nFrom: Flogen AI (flogen.team@gmail.com)\n\nBill To: ${clientName}\n${clientBusiness}\n${clientEmail}\n\nDate: ${formatDate(invoiceDate)}\nDue: ${formatDate(dueDate)}\n\n${"─".repeat(50)}\n${lineItems
        .filter((li) => li.description.trim())
        .map((li) => `${li.description}\n  Qty: ${li.quantity}  |  Unit: RM ${li.unitPrice.toFixed(2)}  |  Total: RM ${(li.quantity * li.unitPrice).toFixed(2)}`)
        .join("\n\n")}\n${"─".repeat(50)}\nSubtotal: RM ${subtotal.toFixed(2)}\nTax (${taxRate}%): RM ${taxAmount.toFixed(2)}\nTOTAL: RM ${total.toFixed(2)}\n\n${invoiceNotes ? `Notes:\n${invoiceNotes}` : ""}`;
    } else {
      text = `PROPOSAL: ${proposalTitle}\nFrom: Flogen AI\nFor: ${clientName} (${clientBusiness})\nDate: ${formatDate(new Date().toISOString())}\n\n${"═".repeat(50)}\n\nSCOPE OF WORK\n${scopeOfWork}\n\nPRICING\n${pricingTiers.map((t) => `${t.name} — RM ${t.price.toFixed(2)}\n${t.features.filter((f) => f.trim()).map((f) => `  • ${f}`).join("\n")}`).join("\n\n")}\n\n${timeline ? `TIMELINE\n${timeline}\n\n` : ""}TERMS & CONDITIONS\n${terms}`;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // --------------- Render: Input Field ---------------

  const inputClass =
    "w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] transition";

  const labelClass = "block text-xs font-medium text-[#6B7280] mb-1.5";

  // --------------- Render ---------------

  return (
    <PageWrapper title="Invoice & Proposal Generator">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back button */}
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>

        {/* Tab Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab("invoice"); setShowPreview(false); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === "invoice"
                ? "bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20"
                : "bg-[#111111] text-[#6B7280] border border-[#1E1E1E] hover:text-[#F5F5F5]"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Invoice
          </button>
          <button
            onClick={() => { setActiveTab("proposal"); setShowPreview(false); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === "proposal"
                ? "bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20"
                : "bg-[#111111] text-[#6B7280] border border-[#1E1E1E] hover:text-[#F5F5F5]"
            }`}
          >
            <FileText className="h-4 w-4" />
            Proposal
          </button>
        </div>

        {/* Client Selector */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
            <User className="h-4 w-4 text-[#7C3AED]" />
            Client Information
          </div>

          {/* Dropdown */}
          <div className="relative mb-4">
            <button
              onClick={() => setClientDropdownOpen((o) => !o)}
              className={`${inputClass} flex items-center justify-between text-left`}
            >
              <span className={selectedClientId ? "text-[#F5F5F5]" : "text-[#6B7280]"}>
                {selectedClientId
                  ? clients.find((c) => c.id === selectedClientId)?.name || "Select client"
                  : "Select a client or enter manually"}
              </span>
              <ChevronDown className={`h-4 w-4 text-[#6B7280] transition-transform ${clientDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {clientDropdownOpen && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#1E1E1E] bg-[#111111] shadow-xl">
                <button
                  onClick={clearClient}
                  className="w-full px-3 py-2 text-left text-sm text-[#6B7280] hover:bg-[#1E1E1E] hover:text-[#F5F5F5]"
                >
                  — Manual entry —
                </button>
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectClient(c.id)}
                    className="w-full px-3 py-2 text-left text-sm text-[#F5F5F5] hover:bg-[#1E1E1E]"
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.business && <span className="ml-2 text-[#6B7280]">— {c.business}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Client fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                <User className="mb-0.5 mr-1 inline h-3 w-3" />
                Client Name
              </label>
              <input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className={labelClass}>
                <Building2 className="mb-0.5 mr-1 inline h-3 w-3" />
                Business Name
              </label>
              <input className={inputClass} value={clientBusiness} onChange={(e) => setClientBusiness(e.target.value)} placeholder="Acme Sdn Bhd" />
            </div>
            <div>
              <label className={labelClass}>
                <Mail className="mb-0.5 mr-1 inline h-3 w-3" />
                Email
              </label>
              <input className={inputClass} type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" />
            </div>
            <div>
              <label className={labelClass}>
                <DollarSign className="mb-0.5 mr-1 inline h-3 w-3" />
                Deal Value (MYR)
              </label>
              <input
                className={`${inputClass} font-mono`}
                type="number"
                value={clientDealValue || ""}
                onChange={(e) => setClientDealValue(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* ====== INVOICE BUILDER ====== */}
        {activeTab === "invoice" && !showPreview && (
          <div className="space-y-6">
            {/* Invoice Details */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
                <Receipt className="h-4 w-4 text-[#7C3AED]" />
                Invoice Details
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Invoice Number</label>
                  <input className={`${inputClass} font-mono`} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>
                    <Calendar className="mb-0.5 mr-1 inline h-3 w-3" />
                    Invoice Date
                  </label>
                  <input className={inputClass} type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>
                    <Calendar className="mb-0.5 mr-1 inline h-3 w-3" />
                    Due Date
                  </label>
                  <input className={inputClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
                  <DollarSign className="h-4 w-4 text-[#7C3AED]" />
                  Line Items
                </div>
                <button
                  onClick={addLineItem}
                  className="flex items-center gap-1 rounded-lg bg-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] hover:bg-[#2a2a2a] transition"
                >
                  <Plus className="h-3 w-3" />
                  Add Row
                </button>
              </div>

              {/* Table header */}
              <div className="mb-2 grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 text-xs font-medium text-[#6B7280]">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>

              {/* Rows */}
              {lineItems.map((li) => (
                <div key={li.id} className="mb-2 grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 items-center">
                  <input
                    className={inputClass}
                    value={li.description}
                    onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                    placeholder="Service description"
                  />
                  <input
                    className={`${inputClass} text-center font-mono`}
                    type="number"
                    min={1}
                    value={li.quantity}
                    onChange={(e) => updateLineItem(li.id, "quantity", Math.max(1, Number(e.target.value)))}
                  />
                  <input
                    className={`${inputClass} text-right font-mono`}
                    type="number"
                    min={0}
                    step={0.01}
                    value={li.unitPrice || ""}
                    onChange={(e) => updateLineItem(li.id, "unitPrice", Number(e.target.value))}
                    placeholder="0.00"
                  />
                  <div className="text-right font-mono text-sm text-[#F5F5F5]">
                    {formatCurrency(li.quantity * li.unitPrice)}
                  </div>
                  <button
                    onClick={() => removeLineItem(li.id)}
                    className="flex items-center justify-center text-[#6B7280] hover:text-[#EF4444] transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Subtotal</span>
                    <span className="font-mono text-[#F5F5F5]">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <span>Tax</span>
                      <input
                        className="w-16 rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-center text-xs font-mono text-[#F5F5F5] focus:border-[#7C3AED] focus:outline-none"
                        type="number"
                        min={0}
                        max={100}
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                      />
                      <span>%</span>
                    </div>
                    <span className="font-mono text-[#F5F5F5]">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#1E1E1E] pt-2 text-base font-bold">
                    <span className="text-[#F5F5F5]">Total</span>
                    <span className="font-mono text-[#7C3AED]">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <label className={labelClass}>Notes</label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Additional notes or payment instructions..."
              />
            </div>

            {/* AI + Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={generateInvoiceAI}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition shadow-lg shadow-violet-500/20"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate with AI
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] hover:bg-[#1E1E1E] transition"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] hover:bg-[#1E1E1E] transition"
              >
                {copied ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy as Text"}
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !clientEmail}
                className="flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50 transition shadow-lg shadow-emerald-500/20"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send via Email
              </button>
            </div>
          </div>
        )}

        {/* ====== PROPOSAL BUILDER ====== */}
        {activeTab === "proposal" && !showPreview && (
          <div className="space-y-6">
            {/* Proposal Title */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
                <FileText className="h-4 w-4 text-[#7C3AED]" />
                Proposal Details
              </div>
              <div>
                <label className={labelClass}>Proposal Title</label>
                <input
                  className={inputClass}
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  placeholder="AI-Powered Solutions for Your Business"
                />
              </div>
            </div>

            {/* Scope of Work */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <label className={labelClass}>Scope of Work</label>
              <textarea
                className={`${inputClass} min-h-[160px] resize-y`}
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
                placeholder="Describe the scope of work, deliverables, and objectives..."
              />
            </div>

            {/* Pricing Tiers */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
                  <DollarSign className="h-4 w-4 text-[#7C3AED]" />
                  Pricing Tiers
                </div>
                <button
                  onClick={addPricingTier}
                  className="flex items-center gap-1 rounded-lg bg-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] hover:bg-[#2a2a2a] transition"
                >
                  <Plus className="h-3 w-3" />
                  Add Tier
                </button>
              </div>

              <div className="space-y-4">
                {pricingTiers.map((tier) => (
                  <div key={tier.id} className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Tier Name</label>
                          <input
                            className={inputClass}
                            value={tier.name}
                            onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                            placeholder="e.g. Standard"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Price (MYR)</label>
                          <input
                            className={`${inputClass} font-mono`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={tier.price || ""}
                            onChange={(e) => updateTier(tier.id, "price", Number(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removePricingTier(tier.id)}
                        className="mt-5 text-[#6B7280] hover:text-[#EF4444] transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <label className={labelClass}>Features</label>
                    {tier.features.map((f, idx) => (
                      <div key={idx} className="mb-2 flex items-center gap-2">
                        <input
                          className={`${inputClass} flex-1`}
                          value={f}
                          onChange={(e) => updateTierFeature(tier.id, idx, e.target.value)}
                          placeholder="Feature description"
                        />
                        <button
                          onClick={() => removeTierFeature(tier.id, idx)}
                          className="text-[#6B7280] hover:text-[#EF4444] transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTierFeature(tier.id)}
                      className="flex items-center gap-1 text-xs text-[#7C3AED] hover:text-violet-300 transition"
                    >
                      <Plus className="h-3 w-3" />
                      Add feature
                    </button>
                  </div>
                ))}
              </div>

              {/* Proposal total */}
              <div className="mt-4 flex justify-end">
                <div className="flex items-center gap-4 rounded-lg bg-[#0A0A0A] px-4 py-2 border border-[#1E1E1E]">
                  <span className="text-sm text-[#6B7280]">Total (all tiers)</span>
                  <span className="font-mono text-lg font-bold text-[#7C3AED]">{formatCurrency(proposalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <label className={labelClass}>
                <Calendar className="mb-0.5 mr-1 inline h-3 w-3" />
                Timeline
              </label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g. Phase 1: Week 1-2 — Setup & Configuration..."
              />
            </div>

            {/* Terms */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
              <label className={labelClass}>Terms & Conditions</label>
              <textarea
                className={`${inputClass} min-h-[120px] resize-y`}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>

            {/* AI + Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={generateProposalAI}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition shadow-lg shadow-violet-500/20"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate with AI
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] hover:bg-[#1E1E1E] transition"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] hover:bg-[#1E1E1E] transition"
              >
                {copied ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy as Text"}
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !clientEmail}
                className="flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50 transition shadow-lg shadow-emerald-500/20"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send via Email
              </button>
            </div>
          </div>
        )}

        {/* ====== PREVIEW ====== */}
        {showPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F5F5F5]">
                {activeTab === "invoice" ? "Invoice" : "Proposal"} Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-1.5 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Editor
              </button>
            </div>

            {/* Rendered preview */}
            <div className="rounded-xl border border-[#1E1E1E] bg-white p-8 shadow-xl">
              <div
                dangerouslySetInnerHTML={{
                  __html: activeTab === "invoice" ? generateInvoiceHTML() : generateProposalHTML(),
                }}
              />
            </div>

            {/* Preview actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] hover:bg-[#1E1E1E] transition"
              >
                {copied ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy as Text"}
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !clientEmail}
                className="flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50 transition shadow-lg shadow-emerald-500/20"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send via Email
              </button>
            </div>
          </div>
        )}

        {/* ====== HISTORY ====== */}
        {history.length > 0 && (
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
              <FileText className="h-4 w-4 text-[#7C3AED]" />
              Recent Documents
            </div>
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {entry.type === "invoice" ? (
                      <Receipt className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <FileText className="h-4 w-4 text-violet-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#F5F5F5]">{entry.title}</p>
                      <p className="text-xs text-[#6B7280]">
                        {entry.clientName} &middot; {entry.type === "invoice" ? "Invoice" : "Proposal"} &middot;{" "}
                        {formatDate(entry.date)}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-medium text-[#F5F5F5]">
                    {formatCurrency(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
