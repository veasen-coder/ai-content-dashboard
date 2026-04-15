"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

interface DemoContent {
  demo_html: string;
  pitch_deck?: { business_name?: string };
}

interface DemoScript {
  id: string;
  content: DemoContent;
}

export default function DemoViewerPage() {
  const params = useParams();
  const id = params?.id as string;

  const [script, setScript] = useState<DemoScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/supabase/demo-scripts?id=${id}`);
        if (!res.ok) throw new Error("Failed");
        const all: DemoScript[] = await res.json();
        const found = all.find((s) => s.id === id) || all[0];
        if (!found) throw new Error("Demo script not found");
        setScript(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !script) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#0A0A0A]">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{error || "Not found"}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white">
      <iframe
        srcDoc={script.content.demo_html}
        sandbox="allow-scripts"
        className="h-full w-full border-0"
        title={script.content.pitch_deck?.business_name || "Demo"}
      />
    </div>
  );
}
