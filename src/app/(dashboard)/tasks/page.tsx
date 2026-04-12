import { PageWrapper } from "@/components/layout/page-wrapper";

const columns = [
  { id: "urgent", label: "Urgent", color: "#EF4444" },
  { id: "ongoing", label: "On-Going", color: "#F59E0B" },
  { id: "todo", label: "To Do", color: "#6B7280" },
  { id: "done", label: "Done", color: "#10B981" },
];

export default function TasksPage() {
  return (
    <PageWrapper title="Tasks">
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-64 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none focus:border-primary"
            readOnly
          />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            + Add Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="ml-auto rounded-md bg-[#1E1E1E] px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                  0
                </span>
              </div>
              <div className="min-h-[200px] rounded-xl border border-dashed border-[#1E1E1E] p-3">
                <p className="text-center text-xs text-muted-foreground">
                  No tasks
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
