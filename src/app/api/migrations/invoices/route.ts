import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'invoice' CHECK (type IN ('invoice', 'proposal')),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
        invoice_number TEXT,
        title TEXT,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        client_name TEXT NOT NULL,
        client_business TEXT,
        client_email TEXT,
        client_industry TEXT,
        invoice_date DATE,
        due_date DATE,
        line_items JSONB DEFAULT '[]'::jsonb,
        tax_rate NUMERIC DEFAULT 0,
        subtotal NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        proposal_title TEXT,
        scope_of_work TEXT,
        pricing_tiers JSONB DEFAULT '[]'::jsonb,
        timeline TEXT,
        terms TEXT,
        html_content TEXT,
        sent_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated" ON invoices FOR ALL USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
    `,
  });

  if (error) {
    // Try direct SQL if rpc doesn't exist
    const queries = [
      `CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'invoice',
        status TEXT NOT NULL DEFAULT 'draft',
        invoice_number TEXT,
        title TEXT,
        client_id UUID,
        client_name TEXT NOT NULL,
        client_business TEXT,
        client_email TEXT,
        client_industry TEXT,
        invoice_date DATE,
        due_date DATE,
        line_items JSONB DEFAULT '[]'::jsonb,
        tax_rate NUMERIC DEFAULT 0,
        subtotal NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        proposal_title TEXT,
        scope_of_work TEXT,
        pricing_tiers JSONB DEFAULT '[]'::jsonb,
        timeline TEXT,
        terms TEXT,
        html_content TEXT,
        sent_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ];

    const { error: qErr } = await supabase.from("invoices").select("id").limit(0);
    if (qErr) {
      return NextResponse.json(
        {
          error: "Could not create table via RPC. Please run the SQL manually in Supabase Dashboard.",
          sql: queries[0],
          rpcError: error.message,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, message: "Invoices table created" });
}
