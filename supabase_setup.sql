-- Run this SQL in your Supabase SQL Editor to create the debtors table

CREATE TABLE IF NOT EXISTS debtors (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  original_debt        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  advance_payment      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  advance_payment_date DATE,
  receipt_numbers      TEXT[] DEFAULT '{}',
  date_borrowed        DATE NOT NULL,
  due_date             DATE,
  notes                TEXT DEFAULT '',
  status               TEXT CHECK (status IN ('active', 'partial', 'paid')) DEFAULT 'active',
  payment_history      JSONB DEFAULT '[]',
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- MIGRATION: Run this if the table already exists to add the original_debt column
-- ALTER TABLE debtors ADD COLUMN IF NOT EXISTS original_debt NUMERIC(12, 2) NOT NULL DEFAULT 0;
-- UPDATE debtors SET original_debt = balance + COALESCE((SELECT SUM((p->>'amount')::NUMERIC) FROM jsonb_array_elements(payment_history) AS p), 0) WHERE original_debt = 0;

-- Enable Row Level Security (optional but recommended)
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;

-- Allow full access for service role (backend uses this)
CREATE POLICY "Service role full access" ON debtors
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON debtors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
