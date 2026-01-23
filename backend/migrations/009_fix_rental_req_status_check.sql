-- Migration: 009_fix_rental_req_status_check.sql
-- Description: Recreate rental_requests table to update CHECK constraint to include 'countered'
-- Created: 2024

-- Disable foreign keys temporarily
PRAGMA foreign_keys = OFF;

-- Start transaction
BEGIN TRANSACTION;

-- Create new table with correct constraint
CREATE TABLE rental_requests_new (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    propertyTitle TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    tenantName TEXT NOT NULL,
    landlordId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'countered', 'negotiating', 'finalized')),
    proposedRent REAL NOT NULL,
    originalRent REAL NOT NULL,
    counterRent REAL,
    finalRent REAL,
    message TEXT,
    blockchainHash TEXT, 
    blockchainTimestamp TEXT, 
    pdfPath TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenantId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlordId) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO rental_requests_new (
    id, propertyId, propertyTitle, tenantId, tenantName, landlordId,
    status, proposedRent, originalRent, counterRent, finalRent,
    message, blockchainHash, blockchainTimestamp, pdfPath, createdAt
)
SELECT 
    id, propertyId, propertyTitle, tenantId, tenantName, landlordId,
    status, proposedRent, originalRent, counterRent, finalRent,
    message, blockchainHash, blockchainTimestamp, pdfPath, createdAt
FROM rental_requests;

-- Drop old table
DROP TABLE rental_requests;

-- Rename new table to old table name
ALTER TABLE rental_requests_new RENAME TO rental_requests;

-- Recreate indices
CREATE INDEX IF NOT EXISTS idx_rental_requests_property_id ON rental_requests(propertyId);
CREATE INDEX IF NOT EXISTS idx_rental_requests_tenant_id ON rental_requests(tenantId);
CREATE INDEX IF NOT EXISTS idx_rental_requests_landlord_id ON rental_requests(landlordId);
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON rental_requests(status);

-- Commit transaction
COMMIT;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
