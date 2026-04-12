import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM format
    const limit = parseInt(searchParams.get("limit") || "100");

    let query = supabase
      .from("finance_entries")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit);

    if (month) {
      const startDate = `${month}-01`;
      const [year, mon] = month.split("-").map(Number);
      const endDate = new Date(year, mon, 0).toISOString().split("T")[0]; // last day of month
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch finance entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { type, category, description, amount, account, date } = body;

    // Insert the finance entry
    const { data, error } = await supabase
      .from("finance_entries")
      .insert({
        type,
        category,
        description,
        amount: parseFloat(amount),
        currency: "MYR",
        account,
        date,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update account balance if account is specified
    if (account) {
      const balanceChange =
        type === "income" ? parseFloat(amount) : -parseFloat(amount);

      // Get current balance
      const { data: currentBalance } = await supabase
        .from("account_balances")
        .select("balance")
        .eq("account", account)
        .single();

      if (currentBalance) {
        await supabase
          .from("account_balances")
          .update({
            balance: (currentBalance.balance || 0) + balanceChange,
            updated_at: new Date().toISOString(),
          })
          .eq("account", account);
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to create finance entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = await request.json();

    // Get the entry first so we can reverse the balance
    const { data: entry } = await supabase
      .from("finance_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (entry && entry.account) {
      const balanceReverse =
        entry.type === "income" ? -entry.amount : entry.amount;

      const { data: currentBalance } = await supabase
        .from("account_balances")
        .select("balance")
        .eq("account", entry.account)
        .single();

      if (currentBalance) {
        await supabase
          .from("account_balances")
          .update({
            balance: (currentBalance.balance || 0) + balanceReverse,
            updated_at: new Date().toISOString(),
          })
          .eq("account", entry.account);
      }
    }

    const { error } = await supabase
      .from("finance_entries")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete finance entry" },
      { status: 500 }
    );
  }
}
