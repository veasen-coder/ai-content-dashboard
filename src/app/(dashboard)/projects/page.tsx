"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OperationsDashboard } from "@/components/operations/operations-dashboard";

function ProjectsInner() {
  const sp = useSearchParams();
  const tab = sp.get("tab") as "kanban" | "pipeline" | "calendar" | "agents" | "trends" | "scripts" | null;
  return (
    <div className="-m-6">
      <OperationsDashboard initialTab={tab ?? undefined} />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
