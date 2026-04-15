import { createClient } from "@supabase/supabase-js";

// Claude Sonnet 4 pricing (USD per million tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-sonnet-4-latest": { input: 3, output: 15 },
  // Add more models as needed
};

const DEFAULT_PRICING = { input: 3, output: 15 };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Log a Claude API call's token usage to Supabase.
 * Call this after every successful Anthropic API response.
 *
 * For non-streaming responses, pass the response JSON directly.
 * For streaming responses, pass input_tokens and output_tokens manually.
 */
export async function logClaudeUsage(params: {
  endpoint: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
}) {
  try {
    const model = params.model || "claude-sonnet-4-20250514";
    const pricing = PRICING[model] || DEFAULT_PRICING;
    const costUsd =
      (params.input_tokens / 1_000_000) * pricing.input +
      (params.output_tokens / 1_000_000) * pricing.output;

    const supabase = getSupabase();
    await supabase.from("claude_usage").insert({
      endpoint: params.endpoint,
      model,
      input_tokens: params.input_tokens,
      output_tokens: params.output_tokens,
      cost_usd: costUsd,
    });
  } catch {
    // Usage logging should never break the main flow
    console.error("Failed to log Claude usage");
  }
}
