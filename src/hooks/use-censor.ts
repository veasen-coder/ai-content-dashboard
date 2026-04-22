"use client";

import { useDemoModeStore } from "@/store/demo-mode-store";
import {
  censorName,
  censorBusiness,
  censorEmail,
  censorPhone,
  censorAmount,
  censorUrl,
  censorShort,
  BLUR_CLASS,
} from "@/lib/censor";

/**
 * useCensor — conditional censoring based on demo mode.
 *
 * Every function returns the ORIGINAL value when demo mode is off,
 * and a deterministic FAKE value when demo mode is on.
 *
 * For free-form text (notes, summaries, chat), use `blurClass`
 * to apply a CSS blur effect via globals.css `.demo-blur`.
 */
export function useCensor() {
  const enabled = useDemoModeStore((s) => s.enabled);

  return {
    enabled,
    name: (value: string | null | undefined, seed?: string) =>
      !enabled || !value ? value || "" : censorName(value, seed),
    business: (
      value: string | null | undefined,
      seed?: string,
      industry?: string | null
    ) =>
      !enabled || !value
        ? value || ""
        : censorBusiness(value, seed, industry),
    email: (value: string | null | undefined, seed?: string) =>
      !enabled || !value ? value || "" : censorEmail(value, seed),
    phone: (value: string | null | undefined, seed?: string) =>
      !enabled || !value ? value || "" : censorPhone(value, seed),
    amount: (value: string | number | null | undefined) =>
      !enabled || value == null || value === ""
        ? (value ?? "").toString()
        : censorAmount(value),
    url: (value: string | null | undefined) =>
      !enabled || !value ? value || "" : censorUrl(value),
    short: (value: string | null | undefined, keep?: number) =>
      !enabled || !value ? value || "" : censorShort(value, keep),
    /**
     * Apply this class to elements containing free-form sensitive text
     * (notes, summaries, chat, long descriptions).
     * Returns "demo-blur" when enabled, "" otherwise.
     */
    blurClass: enabled ? BLUR_CLASS : "",
    /**
     * For images / screenshots — applies stronger blur.
     */
    imageBlurClass: enabled ? "demo-blur-strong" : "",
  };
}
