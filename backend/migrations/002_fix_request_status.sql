-- Recreate rental_requests table to update CHECK constraint
PRAGMA foreign_keys=OFF;

CREATE TABLE rental_requests_new (
  id TEXT PRIMARY KEY,
  propertyId TEXT NOT NULL,
  propertyTitle TEXT NOT NULL,
  tenantId TEXT NOT NULL,
  tenantName TEXT NOT NULL,
  landlordId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'countered', 'approved', 'accepted', 'rejected', 'finalized', 'rented')),
  paymentStatus TEXT DEFAULT 'pending',
  proposedRent REAL NOT NULL,
  originalRent REAL NOT NULL,
  counterRent REAL,
  finalRent REAL,
  advanceAmount REAL,
  approvalTimestamp TEXT,
  message TEXT,
  blockchainHash TEXT,
  blockchainTimestamp TEXT,
  pdfPath TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (propertyId) REFERENCES properties(id),
  FOREIGN KEY (tenantId) REFERENCES users(id),
  FOREIGN KEY (landlordId) REFERENCES users(id)
);

-- Copy data
INSERT INTO rental_requests_new (
  id, propertyId, propertyTitle, tenantId, tenantName, landlordId,
  status, paymentStatus, proposedRent, originalRent, counterRent, finalRent,
  advanceAmount, approvalTimestamp, message, blockchainHash, blockchainTimestamp, pdfPath, createdAt
)
SELECT 
  id, propertyId, propertyTitle, tenantId, tenantName, landlordId,
  status, paymentStatus, proposedRent, originalRent, counterRent, finalRent,
  advanceAmount, approvalTimestamp, message, blockchainHash, blockchainTimestamp, pdfPath, createdAt
FROM rental_requests;

DROP TABLE rental_requests;
ALTER TABLE rental_requests_new RENAME TO rental_requests;

PRAGMA foreign_keys=ON;
