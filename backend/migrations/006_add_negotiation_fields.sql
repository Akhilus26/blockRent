-- Migration: 006_add_negotiation_fields.sql
-- Description: Add counterRent and finalRent fields for negotiation system
-- Created: 2024

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Add counterRent column (nullable - only set when landlord counters)
ALTER TABLE rental_requests ADD COLUMN counterRent REAL;

-- Add finalRent column (nullable - only set when request is accepted)
ALTER TABLE rental_requests ADD COLUMN finalRent REAL;

-- Update status check constraint to include 'countered'
-- Note: SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We'll need to recreate the table or handle this in application code
-- For now, we'll update the application logic to accept 'countered' status
