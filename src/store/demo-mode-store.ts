import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DemoModeState {
  isDemoMode: boolean;
  demoClientName: string;
  toggleDemoMode: () => void;
  setDemoClientName: (name: string) => void;
}

export const useDemoModeStore = create<DemoModeState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      demoClientName: "Acme Restaurant Sdn Bhd",
      toggleDemoMode: () =>
        set((state) => ({ isDemoMode: !state.isDemoMode })),
      setDemoClientName: (name) => set({ demoClientName: name }),
    }),
    {
      name: "demo-mode-state",
    }
  )
);
