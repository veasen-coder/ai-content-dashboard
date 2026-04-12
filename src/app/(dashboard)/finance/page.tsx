"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { DollarSign } from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "balance_sheet", label: "Balance Sheet" },
  { id: "statements", label: "Financial Statements" },
  { id: "add_new", label: "Add New" },
];

const accounts = [
  { name: "OCBC", balance: 0 },
  { name: "PayPal", balance: 0 },
  { name: "Stripe", balance: 0 },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <PageWrapper title="Finance">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-[#111111] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Account Balance Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {accounts.map((acc) => (
                <div
                  key={acc.name}
                  className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {acc.name} Balance
                    </p>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-2xl font-bold font-mono">
                    MYR {acc.balance.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last updated: —
                  </p>
                </div>
              ))}
            </div>

            {/* Income / Expense / Net */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Income
                </p>
                <p className="mt-2 text-2xl font-bold font-mono text-[#10B981]">
                  MYR 0.00
                </p>
              </div>
              <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Expenses
                </p>
                <p className="mt-2 text-2xl font-bold font-mono text-[#EF4444]">
                  MYR 0.00
                </p>
              </div>
              <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </p>
                <p className="mt-2 text-2xl font-bold font-mono">MYR 0.00</p>
              </div>
            </div>

            {/* Chart placeholder */}
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111]">
              <p className="text-sm text-muted-foreground">
                Income vs Expenses chart — add data to populate
              </p>
            </div>
          </div>
        )}

        {activeTab === "add_new" && (
          <div className="mx-auto max-w-lg rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="text-lg font-semibold">New Finance Entry</h2>
            <form className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Type
                </label>
                <select className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <select className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="client_payment">Client Payment</option>
                  <option value="tools_subscriptions">
                    Tools/Subscriptions
                  </option>
                  <option value="marketing">Marketing</option>
                  <option value="operations">Operations</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="What is this entry for?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                    Amount (MYR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm font-mono outline-none focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                    Account
                  </label>
                  <select className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none focus:border-primary">
                    <option value="ocbc">OCBC</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add Entry
              </button>
            </form>
          </div>
        )}

        {(activeTab === "balance_sheet" || activeTab === "statements") && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
            <p className="text-sm text-muted-foreground">
              {activeTab === "balance_sheet"
                ? "Balance sheet will populate with finance data"
                : "Financial statements will populate with data"}
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
