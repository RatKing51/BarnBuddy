-- Add reproduction-related tables to BarnBuddy database

-- Table for breeding/reproduction events
CREATE TABLE IF NOT EXISTS reproductions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    dam_id INTEGER, -- mother
    sire_id INTEGER, -- father
    breeding_date DATE,
    due_date DATE,
    outcome VARCHAR(50), -- 'successful', 'unsuccessful', 'aborted', etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for birth records (offspring)
CREATE TABLE IF NOT EXISTS births (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    reproduction_id INTEGER,
    offspring_id INTEGER NOT NULL, -- the newborn animal
    birth_date DATE,
    birth_weight DECIMAL(5,2),
    birth_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add parent fields to animals table if they don't exist
ALTER TABLE animals ADD COLUMN IF NOT EXISTS dam_id INTEGER;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS sire_id INTEGER;