// Smart status labels derived from client stage + context (demo script, etc.)

export interface StatusBadge {
  label: string;
  tone: "neutral" | "warning" | "success" | "info" | "danger";
}

interface Ctx {
  stage: string;
  has_ai_summary: boolean;
  has_demo_script: boolean;
  close_probability?: number | null;
  status?: string | null; // "active" | "stalled"
}

export function getClientStatus(ctx: Ctx): StatusBadge {
  if (ctx.status === "stalled") {
    return { label: "Stalled", tone: "warning" };
  }

  switch (ctx.stage) {
    case "lead":
      return ctx.has_ai_summary
        ? { label: "Lead: Reviewed", tone: "info" }
        : { label: "Lead: New", tone: "neutral" };

    case "contacted":
      return ctx.has_demo_script
        ? { label: "Demo: Ready", tone: "success" }
        : { label: "Demo: Unprepared", tone: "warning" };

    case "demo_sent":
      return ctx.has_demo_script
        ? { label: "Demo: Sent", tone: "info" }
        : { label: "Demo Sent (no script)", tone: "warning" };

    case "negotiation": {
      const prob = ctx.close_probability ?? 0;
      if (prob >= 70)
        return { label: `Negotiating ${prob}%`, tone: "success" };
      if (prob >= 40)
        return { label: `Negotiating ${prob}%`, tone: "info" };
      return { label: `Negotiating ${prob}%`, tone: "warning" };
    }

    case "closed":
      return { label: "Closed — Won", tone: "success" };

    default:
      return { label: ctx.stage, tone: "neutral" };
  }
}

export const STATUS_TONE_CLASSES: Record<StatusBadge["tone"], string> = {
  success: "bg-[#10B981]/15 text-[#10B981]",
  warning: "bg-[#F59E0B]/15 text-[#F59E0B]",
  info: "bg-[#3B82F6]/15 text-[#3B82F6]",
  danger: "bg-[#EF4444]/15 text-[#EF4444]",
  neutral: "bg-[#1E1E1E] text-muted-foreground",
};

// Demo button should show from "contacted" onward (after initial call)
export function shouldShowDemoButton(stage: string): boolean {
  return ["contacted", "demo_sent", "negotiation"].includes(stage);
}
