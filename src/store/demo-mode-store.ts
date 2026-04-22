import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DemoModeState {
  // ─── Demo Mode (pre-built pages) ─────────────────────────────
  // When on: sidebar swaps to demo-mode nav, user is redirected to
  // a set of pristine pre-built demo pages (`/demo-mode/*`) with
  // canned data for a specific prospect.
  isDemoMode: boolean;
  demoClientName: string;
  toggleDemoMode: () => void;
  setDemoClientName: (name: string) => void;

  // ─── Censor Mode (blur real data in place) ───────────────────
  // When on: the REAL live dashboard pages stay active but sensitive
  // fields (names, emails, phones, money, notes, summaries, etc.)
  // are censored — structured fields replaced with deterministic fake
  // values, free text blurred with CSS. Good for showing a prospect
  // the real app's structure without leaking content.
  isCensorMode: boolean;
  toggleCensorMode: () => void;
  setCensorMode: (enabled: boolean) => void;
}

export const useDemoModeStore = create<DemoModeState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      demoClientName: "Acme Restaurant Sdn Bhd",
      toggleDemoMode: () =>
        set((state) => ({ isDemoMode: !state.isDemoMode })),
      setDemoClientName: (name) => set({ demoClientName: name }),

      isCensorMode: false,
      toggleCensorMode: () =>
        set((state) => ({ isCensorMode: !state.isCensorMode })),
      setCensorMode: (enabled) => set({ isCensorMode: enabled }),
    }),
    {
      name: "demo-mode-state",
    }
  )
);
