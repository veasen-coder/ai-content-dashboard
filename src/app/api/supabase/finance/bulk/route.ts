import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface BulkEntry {
  type: "income" | "expense";
  category: string;
  description: string | null;
  amount: number;
  account: string;
  date: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { entries } = (await request.json()) as { entries: BulkEntry[] };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "No entries provided" }, { status: 400 });
    }

    if (entries.length > 200) {
      return NextResponse.json({ error: "Maximum 200 entries per upload" }, { status: 400 });
    }

    // Validate all entries
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.type || !["income", "expense"].includes(e.type)) {
        return NextResponse.json({ error: `Row ${i + 1}: Invalid type "${e.type}"` }, { status: 400 });
      }
      if (!e.amount || isNaN(e.amount) || e.amount <= 0) {
        return NextResponse.json({ error: `Row ${i + 1}: Invalid amount` }, { status: 400 });
      }
      if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
        return NextResponse.json({ error: `Row ${i + 1}: Invalid date format (need YYYY-MM-DD)` }, { status: 400 });
      }
    }

    // Insert all entries
    const rows = entries.map((e) => ({
      type: e.type,
      category: e.category || null,
      description: e.description || null,
      amount: e.amount,
      currency: "MYR",
      account: e.account || null,
      date: e.date,
    }));

    const { data, error } = await supabase
      .from("finance_entries")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update account balances
    const balanceChanges = new Map<string, number>();
    for (const e of entries) {
      if (e.account) {
        const current = balanceChanges.get(e.account) || 0;
        balanceChanges.set(
          e.account,
          current + (e.type === "income" ? e.amount : -e.amount)
        );
      }
    }

    for (const [account, change] of Array.from(balanceChanges.entries())) {
      const { data: currentBalance } = await supabase
        .from("account_balances")
        .select("balance")
        .eq("account", account)
        .single();

      if (currentBalance) {
        await supabase
          .from("account_balances")
          .update({
            balance: (currentBalance.balance || 0) + change,
            updated_at: new Date().toISOString(),
          })
          .eq("account", account);
      }
    }

    // Sync all entries to Google Sheets (fire-and-forget)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const sheetRows = entries.map((e) => [
        e.date,
        e.description || "",
        e.type,
        e.category || "",
        String(e.amount),
        "MYR",
        e.account || "",
      ]);
      fetch(`${baseUrl}/api/google/sheets/append`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: sheetRows }),
      }).catch(() => {});
    } catch {
      // Google Sheets sync is optional
    }

    return NextResponse.json({
      success: true,
      count: data?.length || entries.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to bulk insert finance entries" },
      { status: 500 }
    );
  }
}
