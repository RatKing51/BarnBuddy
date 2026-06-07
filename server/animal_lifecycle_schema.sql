-- Add animal lifecycle fields to support active/deceased records.
ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deceased_date DATE,
  ADD COLUMN IF NOT EXISTS deceased_notes TEXT;

UPDATE animals
SET status = 'active'
WHERE status IS NULL OR status = '';
