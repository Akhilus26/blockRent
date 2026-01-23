-- Add payment fields to rental_requests table
ALTER TABLE rental_requests ADD COLUMN paymentStatus TEXT DEFAULT 'pending';
ALTER TABLE rental_requests ADD COLUMN advanceAmount REAL;
ALTER TABLE rental_requests ADD COLUMN approvalTimestamp TEXT;
