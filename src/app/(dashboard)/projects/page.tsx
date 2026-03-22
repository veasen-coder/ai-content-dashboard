import { ProjectsDashboard } from "@/components/projects/projects-dashboard";

export default function ProjectsPage() {
  // -m-6 cancels the layout's p-6 so the dashboard runs edge-to-edge
  return (
    <div className="-m-6">
      <ProjectsDashboard />
    </div>
  );
}
