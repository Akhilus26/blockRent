-- Migration: 005_create_blockchain_blocks.sql
-- Description: Create blockchain_blocks table for storing blockchain block data
-- Created: 2024

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Create blockchain_blocks table
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    id TEXT PRIMARY KEY,
    agreementId TEXT NOT NULL,
    previousHash TEXT,
    currentHash TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (agreementId) REFERENCES agreements(id) ON DELETE CASCADE
);

-- Create index on agreementId for faster lookups
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_agreement_id ON blockchain_blocks(agreementId);

-- Create index on currentHash for blockchain verification
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_current_hash ON blockchain_blocks(currentHash);

-- Create index on timestamp for chronological queries
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_timestamp ON blockchain_blocks(timestamp);
