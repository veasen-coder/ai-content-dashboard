"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  ClipboardCopy,
  Loader2,
  Presentation,
  MessageSquare,
  ListChecks,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PasteBridge, parseDelimitedBlocks } from "./paste-bridge";

// Local shape (mirrors types/index.ts but local to avoid import tangles)
interface ClientLite {
  id: string;
  name: string;
  business: string | null;
  email: string | null;
  industry: string | null;
  stage: string;
  source: string | null;
  notes: string | null;
  ai_summary: string | null;
  deal_value: string | null;
}

interface PitchSlide {
  slide_number: number;
  type: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  speaker_notes: string;
  visual_suggestion?: string;
}

interface DemoContent {
  pitch_deck: {
    client_name: string;
    business_name: string;
    slides: PitchSlide[];
  };
  demo_html: string;
  scenarios_covered: Array<{
    title: string;
    description: string;
    trigger: string;
  }>;
  presenter_notes: string;
}

interface DemoScript {
  id: string;
  client_id: string;
  duration_minutes: number;
  focus: string | null;
  tone: string | null;
  content: DemoContent;
  generated_via: "api" | "paste_bridge";
  created_at: string;
}

type Mode = "none" | "instant" | "paste" | "view";
type Tab = "deck" | "demo" | "scenarios" | "notes";

export function DemoScriptSection({ client }: { client: ClientLite }) {
  const [scripts, setScripts] = useState<DemoScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("none");
  const [generating, setGenerating] = useState(false);
  const [activeScript, setActiveScript] = useState<DemoScript | null>(null);
  const [tab, setTab] = useState<Tab>("deck");
  const [slideIdx, setSlideIdx] = useState(0);

  // Demo parameters
  const [duration, setDuration] = useState(30);
  const [focus, setFocus] = useState("ROI and practical automation wins");
  const [tone, setTone] = useState("consultative");
  const [includePricing, setIncludePricing] = useState("soft");

  // Paste bridge
  const [prompt, setPrompt] = useState("");
  const [submittingPaste, setSubmittingPaste] = useState(false);

  const fetchScripts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/supabase/demo-scripts?client_id=${client.id}`
      );
      if (!res.ok) throw new Error("Failed");
      const data: DemoScript[] = await res.json();
      setScripts(data || []);
      if (data && data.length > 0) {
        setActiveScript(data[0]);
        setMode("view");
      }
    } catch {
      toast.error("Failed to load demo scripts");
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  async function handleInstantGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/claude/generate-demo-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client,
          duration_minutes: duration,
          focus,
          tone,
          include_pricing: includePricing,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }

      const { content } = await res.json();

      // Save to db
      const saveRes = await fetch("/api/supabase/demo-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: client.id,
          duration_minutes: duration,
          focus,
          tone,
          content,
          generated_via: "api",
        }),
      });

      if (!saveRes.ok) throw new Error("Failed to save script");
      const saved: DemoScript = await saveRes.json();

      setScripts([saved, ...scripts]);
      setActiveScript(saved);
      setMode("view");
      setTab("deck");
      setSlideIdx(0);
      toast.success("Demo script generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleOpenPasteMode() {
    setGenerating(true);
    try {
      const res = await fetch("/api/claude/build-demo-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client,
          duration_minutes: duration,
          focus,
          tone,
          include_pricing: includePricing,
        }),
      });
      if (!res.ok) throw new Error("Failed to build prompt");
      const { prompt: p } = await res.json();
      setPrompt(p);
      setMode("paste");
    } catch {
      toast.error("Failed to build prompt");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePasteSubmit(raw: string) {
    setSubmittingPaste(true);
    try {
      const blocks = parseDelimitedBlocks(raw, {
        pitch_deck: {
          start: "---PITCH_DECK_START---",
          end: "---PITCH_DECK_END---",
        },
        demo_html: {
          start: "---DEMO_HTML_START---",
          end: "---DEMO_HTML_END---",
        },
        scenarios_covered: {
          start: "---SCENARIOS_START---",
          end: "---SCENARIOS_END---",
        },
        presenter_notes: {
          start: "---PRESENTER_NOTES_START---",
          end: "---PRESENTER_NOTES_END---",
        },
      });

      if (!blocks) {
        toast.error("Missing delimiters — Claude must return all 4 blocks");
        return;
      }

      const cleanJson = (s: string) =>
        s.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

      let pitch_deck;
      let scenarios_covered;
      try {
        pitch_deck = JSON.parse(cleanJson(blocks.pitch_deck));
      } catch {
        toast.error("Pitch deck JSON didn't parse — check formatting");
        return;
      }
      try {
        scenarios_covered = JSON.parse(cleanJson(blocks.scenarios_covered));
      } catch {
        toast.error("Scenarios JSON didn't parse");
        return;
      }

      const content = {
        pitch_deck,
        demo_html: blocks.demo_html,
        scenarios_covered,
        presenter_notes: blocks.presenter_notes,
      };

      const saveRes = await fetch("/api/supabase/demo-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: client.id,
          duration_minutes: duration,
          focus,
          tone,
          content,
          generated_via: "paste_bridge",
        }),
      });

      if (!saveRes.ok) throw new Error("Save failed");
      const saved: DemoScript = await saveRes.json();

      setScripts([saved, ...scripts]);
      setActiveScript(saved);
      setMode("view");
      setTab("deck");
      setSlideIdx(0);
      toast.success("Demo script saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setSubmittingPaste(false);
    }
  }

  async function handleDeleteScript(id: string) {
    if (!confirm("Delete this demo script? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/supabase/demo-scripts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      const remaining = scripts.filter((s) => s.id !== id);
      setScripts(remaining);
      if (remaining.length > 0) {
        setActiveScript(remaining[0]);
      } else {
        setActiveScript(null);
        setMode("none");
      }
      toast.success("Demo script deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading demo scripts...
      </div>
    );
  }

  // View mode: render the saved script
  if (mode === "view" && activeScript) {
    return (
      <DemoScriptViewer
        script={activeScript}
        allScripts={scripts}
        onSwitch={(s) => {
          setActiveScript(s);
          setTab("deck");
          setSlideIdx(0);
        }}
        onNew={() => {
          setActiveScript(null);
          setMode("none");
        }}
        onDelete={handleDeleteScript}
        tab={tab}
        setTab={setTab}
        slideIdx={slideIdx}
        setSlideIdx={setSlideIdx}
      />
    );
  }

  // Paste bridge UI
  if (mode === "paste") {
    return (
      <div className="space-y-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Paste Bridge — use your own Claude
          </p>
          <button
            onClick={() => setMode("none")}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        </div>
        <PasteBridge
          prompt={prompt}
          onSubmit={handlePasteSubmit}
          submitting={submittingPaste}
        />
      </div>
    );
  }

  // Generator UI — no script yet
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-[#1E1E1E] bg-[#0A0A0A] p-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          No demo script yet
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Generate a full pitch deck + working HTML chatbot demo tailored to{" "}
          {client.name}.
        </p>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-xs outline-none focus:border-primary"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tone
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-xs outline-none focus:border-primary"
          >
            <option value="consultative">Consultative</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="technical">Technical</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Focus
          </label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pricing
          </label>
          <select
            value={includePricing}
            onChange={(e) => setIncludePricing(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-xs outline-none focus:border-primary"
          >
            <option value="none">Skip pricing</option>
            <option value="soft">Soft mention</option>
            <option value="firm">Firm discussion</option>
          </select>
        </div>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={handleInstantGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          Generate Instantly
        </button>
        <button
          onClick={handleOpenPasteMode}
          disabled={generating}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Generate Claude Prompt
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground/60">
        <span>Uses API token (~$0.05/run)</span>
        <span>Free — uses your Max plan</span>
      </div>
    </div>
  );
}

// --------------- Viewer ---------------

function DemoScriptViewer({
  script,
  allScripts,
  onSwitch,
  onNew,
  onDelete,
  tab,
  setTab,
  slideIdx,
  setSlideIdx,
}: {
  script: DemoScript;
  allScripts: DemoScript[];
  onSwitch: (s: DemoScript) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  slideIdx: number;
  setSlideIdx: (n: number) => void;
}) {
  const content = script.content;
  const slides = content.pitch_deck?.slides || [];
  const currentSlide = slides[slideIdx];

  return (
    <div className="space-y-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {content.pitch_deck?.business_name || "Demo Package"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {script.duration_minutes} min ·{" "}
            {script.generated_via === "api"
              ? "Generated via API"
              : "Generated via Claude Code"}{" "}
            · {new Date(script.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {allScripts.length > 1 && (
            <select
              value={script.id}
              onChange={(e) => {
                const s = allScripts.find((x) => x.id === e.target.value);
                if (s) onSwitch(s);
              }}
              className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[10px] outline-none"
            >
              {allScripts.map((s, i) => (
                <option key={s.id} value={s.id}>
                  v{allScripts.length - i} ·{" "}
                  {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
          <a
            href={`/demo/${script.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] p-1.5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            title="Open full-screen viewer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={onNew}
            className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] p-1.5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            title="Generate another"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(script.id)}
            className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] p-1.5 text-muted-foreground transition-colors hover:!bg-red-500/20 hover:!text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1E1E1E] -mx-4 px-4">
        <TabBtn
          active={tab === "deck"}
          onClick={() => setTab("deck")}
          icon={<Presentation className="h-3 w-3" />}
          label="Pitch Deck"
          count={slides.length}
        />
        <TabBtn
          active={tab === "demo"}
          onClick={() => setTab("demo")}
          icon={<MessageSquare className="h-3 w-3" />}
          label="Live Demo"
        />
        <TabBtn
          active={tab === "scenarios"}
          onClick={() => setTab("scenarios")}
          icon={<ListChecks className="h-3 w-3" />}
          label="Scenarios"
          count={content.scenarios_covered?.length}
        />
        <TabBtn
          active={tab === "notes"}
          onClick={() => setTab("notes")}
          icon={<StickyNote className="h-3 w-3" />}
          label="Notes"
        />
      </div>

      {/* Tab content */}
      {tab === "deck" && currentSlide && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary">
                {currentSlide.type}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Slide {slideIdx + 1} of {slides.length}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {currentSlide.title}
            </h3>
            {currentSlide.subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {currentSlide.subtitle}
              </p>
            )}
            {currentSlide.bullets?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {currentSlide.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs text-foreground/90"
                  >
                    <span className="text-primary">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {currentSlide.visual_suggestion && (
              <p className="mt-3 rounded-md bg-[#0A0A0A] px-2 py-1.5 text-[10px] italic text-muted-foreground">
                Visual: {currentSlide.visual_suggestion}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Speaker Notes
            </p>
            <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
              {currentSlide.speaker_notes}
            </p>
          </div>

          {/* Slide navigator */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSlideIdx(Math.max(0, slideIdx - 1))}
              disabled={slideIdx === 0}
              className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIdx(i)}
                  className={`h-1.5 w-5 rounded-full transition-colors ${
                    i === slideIdx ? "bg-primary" : "bg-[#1E1E1E]"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setSlideIdx(Math.min(slides.length - 1, slideIdx + 1))}
              disabled={slideIdx === slides.length - 1}
              className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-30"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {tab === "demo" && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-[#1E1E1E] bg-white">
            <iframe
              srcDoc={content.demo_html}
              sandbox="allow-scripts"
              className="h-[500px] w-full"
              title="Demo preview"
            />
          </div>
          <a
            href={`/demo/${script.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            Open full-screen (for live demo)
          </a>
        </div>
      )}

      {tab === "scenarios" && (
        <div className="space-y-2">
          {content.scenarios_covered?.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {i + 1}.
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {s.title}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                {s.description}
              </p>
              {s.trigger && (
                <p className="mt-1 text-[10px] text-primary/80">
                  Trigger: {s.trigger}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "notes" && (
        <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3">
          <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
            {content.presenter_notes}
          </p>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {count}
        </span>
      )}
    </button>
  );
}
