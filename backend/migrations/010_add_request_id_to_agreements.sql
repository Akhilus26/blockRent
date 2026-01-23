-- Migration: 010_add_request_id_to_agreements.sql
-- Description: Add requestId column to agreements table to link agreements to specific rental requests
-- Created: 2024

-- Disable foreign keys temporarily
PRAGMA foreign_keys = OFF;

-- Start transaction
BEGIN TRANSACTION;

-- Create new table with requestId column
CREATE TABLE agreements_new (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    propertyTitle TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    tenantName TEXT NOT NULL,
    landlordId TEXT NOT NULL,
    landlordName TEXT NOT NULL,
    requestId TEXT,
    finalRent REAL NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    blockchainHash TEXT NOT NULL,
    blockchainTimestamp TEXT NOT NULL,
    pdfPath TEXT,
    status TEXT NOT NULL DEFAULT 'finalized',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (propertyId) REFERENCES properties(id),
    FOREIGN KEY (tenantId) REFERENCES users(id),
    FOREIGN KEY (landlordId) REFERENCES users(id),
    FOREIGN KEY (requestId) REFERENCES rental_requests(id)
);

-- Copy data from old table to new table
INSERT INTO agreements_new (
    id, propertyId, propertyTitle, tenantId, tenantName, landlordId, landlordName,
    finalRent, startDate, endDate, blockchainHash, blockchainTimestamp, pdfPath, status, createdAt
)
SELECT 
    id, propertyId, propertyTitle, tenantId, tenantName, landlordId, landlordName,
    finalRent, startDate, endDate, blockchainHash, blockchainTimestamp, pdfPath, status, createdAt
FROM agreements;

-- Drop old table
DROP TABLE agreements;

-- Rename new table to old table name
ALTER TABLE agreements_new RENAME TO agreements;

-- Recreate indices if any (none explicitly created in previous migrations for agreements, but good practice to index FKs)
CREATE INDEX IF NOT EXISTS idx_agreements_property_id ON agreements(propertyId);
CREATE INDEX IF NOT EXISTS idx_agreements_tenant_id ON agreements(tenantId);
CREATE INDEX IF NOT EXISTS idx_agreements_landlord_id ON agreements(landlordId);
CREATE INDEX IF NOT EXISTS idx_agreements_request_id ON agreements(requestId);

-- Commit transaction
COMMIT;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
