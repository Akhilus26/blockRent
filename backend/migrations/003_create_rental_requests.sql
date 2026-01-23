-- Migration: 003_create_rental_requests.sql
-- Description: Create rental_requests table for tenant rental negotiations
-- Created: 2024

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Create rental_requests table
CREATE TABLE IF NOT EXISTS rental_requests (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    propertyTitle TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    tenantName TEXT NOT NULL,
    landlordId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'countered', 'negotiating', 'finalized')),
    proposedRent REAL NOT NULL,
    originalRent REAL NOT NULL,
    message TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenantId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlordId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on propertyId for faster lookups
CREATE INDEX IF NOT EXISTS idx_rental_requests_property_id ON rental_requests(propertyId);

-- Create index on tenantId for user requests
CREATE INDEX IF NOT EXISTS idx_rental_requests_tenant_id ON rental_requests(tenantId);

-- Create index on landlordId for landlord requests
CREATE INDEX IF NOT EXISTS idx_rental_requests_landlord_id ON rental_requests(landlordId);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON rental_requests(status);
