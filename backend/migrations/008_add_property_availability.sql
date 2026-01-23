-- Migration: 008_add_property_availability.sql
-- Description: Add availability status to properties table
-- Created: 2024

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Add availability column (rented or available)
ALTER TABLE properties ADD COLUMN availability TEXT DEFAULT 'available' CHECK(availability IN ('available', 'rented'));

-- Create index on availability for faster queries
CREATE INDEX IF NOT EXISTS idx_properties_availability ON properties(availability);
