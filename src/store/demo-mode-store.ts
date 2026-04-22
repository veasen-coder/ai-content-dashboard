import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DemoModeState {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

export const useDemoModeStore = create<DemoModeState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "flogen-demo-mode",
    }
  )
);
