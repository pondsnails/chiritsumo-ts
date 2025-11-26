/*
  # Add chunk_size column to books table

  1. Changes
    - Add `chunk_size` column to `books` table with default value of 1
    - This allows users to specify how many units should be grouped together as one card

  2. Purpose
    - Prevents creating too many cards for large books (e.g., 300 pages = 300 cards)
    - Users can set chunk_size to group multiple units (e.g., chunk_size=10 means 10 pages per card)
    - Default value of 1 maintains backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'chunk_size'
  ) THEN
    ALTER TABLE books ADD COLUMN chunk_size integer DEFAULT 1;
  END IF;
END $$;