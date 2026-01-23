-- Migration: 002_create_properties.sql
-- Description: Create properties table for property listings
-- Created: 2024

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rent REAL NOT NULL,
    location TEXT NOT NULL,
    images TEXT NOT NULL,
    videoUrl TEXT,
    youtubeUrl TEXT,
    landlordId TEXT NOT NULL,
    landlordName TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    bedrooms INTEGER,
    bathrooms INTEGER,
    area INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (landlordId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on landlordId for faster queries
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlordId);

-- Create index on status for filtering approved properties
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Create index on location for search functionality
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
