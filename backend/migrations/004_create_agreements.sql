-- Migration: 004_create_agreements.sql
-- Description: Create agreements table for finalized rental agreements
-- Created: 2024

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Create agreements table
CREATE TABLE IF NOT EXISTS agreements (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    propertyTitle TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    tenantName TEXT NOT NULL,
    landlordId TEXT NOT NULL,
    landlordName TEXT NOT NULL,
    finalRent REAL NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    blockchainHash TEXT NOT NULL,
    blockchainTimestamp TEXT NOT NULL,
    pdfPath TEXT,
    status TEXT NOT NULL DEFAULT 'finalized',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenantId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlordId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on propertyId
CREATE INDEX IF NOT EXISTS idx_agreements_property_id ON agreements(propertyId);

-- Create index on tenantId for user agreements
CREATE INDEX IF NOT EXISTS idx_agreements_tenant_id ON agreements(tenantId);

-- Create index on landlordId for landlord agreements
CREATE INDEX IF NOT EXISTS idx_agreements_landlord_id ON agreements(landlordId);

-- Create index on blockchainHash for blockchain verification
CREATE INDEX IF NOT EXISTS idx_agreements_blockchain_hash ON agreements(blockchainHash);
