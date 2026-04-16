"use client";

import { useState, useRef, useEffect } from "react";
import { Wallet, Check } from "lucide-react";
import { toast } from "sonner";

export function ClaudeBalance() {
  const [data, setData] = useState<{
    budget: number;
    totalSpend: number;
    remaining: number;
    period: { spend: number; calls: number };
  } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/claude/usage?period=month")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) {
        setShowDetail(false);
        setEditingBudget(false);
      }
    }
    if (showDetail) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDetail]);

  async function updateBudget() {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val < 0) return;
    try {
      await fetch("/api/claude/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: val }),
      });
      setData((prev) =>
        prev ? { ...prev, budget: val, remaining: Math.max(0, val - prev.totalSpend) } : prev
      );
      setEditingBudget(false);
      toast.success("Budget updated!");
    } catch {
      toast.error("Failed to update budget");
    }
  }

  if (!data) return null;

  const pct = data.budget > 0 ? (data.remaining / data.budget) * 100 : 0;
  const barColor =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    pct > 50 ? "text-emerald-400" : pct > 20 ? "text-amber-400" : "text-red-400";

  return (
    <div className="relative" ref={detailRef}>
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-1.5 text-xs transition-colors hover:bg-[#1A1A1A]"
      >
        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={`font-mono font-semibold ${textColor}`}>
          ${data.remaining.toFixed(2)}
        </span>
        <div className="h-1.5 w-12 rounded-full bg-[#1E1E1E]">
          <div
            className={`h-full rounded-full ${barColor} transition-all`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </button>

      {showDetail && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
          <div className="border-b border-[#1E1E1E] px-4 py-3">
            <h3 className="text-sm font-semibold">Claude API Usage</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* Budget */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Budget
              </span>
              {editingBudget ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateBudget();
                      if (e.key === "Escape") setEditingBudget(false);
                    }}
                    className="w-16 rounded border border-[#1E1E1E] bg-[#0A0A0A] px-1.5 py-0.5 text-xs font-mono text-foreground focus:border-violet-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={updateBudget}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setBudgetInput(String(data.budget));
                    setEditingBudget(true);
                  }}
                  className="text-xs font-mono font-semibold text-foreground hover:text-violet-400 transition-colors"
                >
                  ${data.budget.toFixed(2)}
                </button>
              )}
            </div>

            {/* Remaining */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Remaining
              </span>
              <span className={`text-xs font-mono font-semibold ${textColor}`}>
                ${data.remaining.toFixed(2)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-[#1E1E1E]">
              <div
                className={`h-full rounded-full ${barColor} transition-all`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>

            {/* Total Spent */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Total Spent
              </span>
              <span className="text-xs font-mono text-foreground">
                ${data.totalSpend.toFixed(4)}
              </span>
            </div>

            {/* This Month */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                This Month
              </span>
              <span className="text-xs font-mono text-foreground">
                ${data.period.spend.toFixed(4)}
              </span>
            </div>

            {/* API Calls */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                API Calls
              </span>
              <span className="text-xs font-mono text-foreground">
                {data.period.calls}
              </span>
            </div>
          </div>
          <div className="border-t border-[#1E1E1E] px-4 py-2">
            <p className="text-[9px] text-muted-foreground/60">
              Click budget to edit · Sonnet 4: $3/MTok in, $15/MTok out
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
