import { PageWrapper } from "@/components/layout/page-wrapper";
import { DollarSign, TrendingUp, BarChart3, Users } from "lucide-react";

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-bold font-mono">{value}</p>
      {(subtitle || trend) && (
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span className="text-xs font-medium text-[#10B981]">{trend}</span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PageWrapper title="Overview">
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="OCBC Balance"
            value="MYR 0.00"
            icon={DollarSign}
            subtitle="Last updated: —"
          />
          <MetricCard
            title="This Month Profit"
            value="MYR 0.00"
            icon={TrendingUp}
            subtitle="Apr 2026"
          />
          <MetricCard
            title="Total Profit"
            value="MYR 0.00"
            icon={BarChart3}
            subtitle="All time"
          />
          <MetricCard
            title="Active Clients"
            value="0"
            icon={Users}
            subtitle="Currently active"
          />
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tasks Widget */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Current Tasks</h2>
              <a
                href="/tasks"
                className="text-xs font-medium text-primary hover:underline"
              >
                View All
              </a>
            </div>
            <div className="mt-4 flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No tasks loaded</p>
              <p className="mt-1 text-xs">
                Connect ClickUp to see your tasks here
              </p>
            </div>
          </div>

          {/* Pipeline Summary */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Client Pipeline</h2>
              <a
                href="/clients"
                className="text-xs font-medium text-primary hover:underline"
              >
                View All
              </a>
            </div>
            <div className="mt-4 flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No clients yet</p>
              <p className="mt-1 text-xs">
                Add clients to see pipeline summary
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
