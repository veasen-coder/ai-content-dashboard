"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { User, Key, Palette, Bell, Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "@/store/theme-store";
import { useCensor } from "@/hooks/use-censor";
import { cn } from "@/lib/utils";

const INTEGRATIONS = [
  { name: "Supabase", status: "Connected", description: "Database & Auth" },
  { name: "ClickUp", status: "Connected", description: "Task Management" },
  { name: "Facebook", status: "Connected", description: "Page Metrics" },
  { name: "Instagram", status: "Connected", description: "via Facebook Graph API" },
  { name: "Google Sheets", status: "Connected", description: "Finance Data" },
  { name: "Anthropic", status: "Connected", description: "AI Assistant & Agents" },
];

function SettingSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111]">
      <div className="flex items-center gap-2 border-b border-[#1E1E1E] px-5 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const censor = useCensor();

  return (
    <PageWrapper title="Settings">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Account */}
        <SettingSection title="Account" icon={User}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Business Name
              </label>
              <p className="text-sm text-foreground">{censor.business("Flogen AI", "account-business")}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Owner
              </label>
              <p className="text-sm text-foreground">{censor.name("Haikal", "account-owner")}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <p className="text-sm text-foreground">{censor.email("flogen.team@gmail.com", "account-email")}</p>
            </div>
          </div>
        </SettingSection>

        {/* Integrations */}
        <SettingSection title="Integrations" icon={Key}>
          <div className="space-y-3">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
                <span className="rounded-md bg-[#10B981]/10 px-2 py-1 text-xs font-semibold text-[#10B981]">
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </SettingSection>

        {/* Appearance */}
        <SettingSection title="Appearance" icon={Palette}>
          <div>
            <p className="text-sm font-medium mb-3">Theme</p>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                    theme === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  )}
                >
                  {t === "light" && <Sun className="h-4 w-4" />}
                  {t === "dark" && <Moon className="h-4 w-4" />}
                  {t === "system" && <Monitor className="h-4 w-4" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications" icon={Bell}>
          <p className="text-sm text-muted-foreground">
            Notification preferences coming soon.
          </p>
        </SettingSection>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pb-8">
          Flogen AI Dashboard v1.0 &middot; Built with Next.js + Supabase
        </div>
      </div>
    </PageWrapper>
  );
}
