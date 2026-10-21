/**
 * Comprehensive Automated Test Suite: Foreign Key Deletion & Deactivation Handling
 * Tests user and property deletion, relations checking, soft deletion / deactivation,
 * access prevention, and database foreign key integrity using native Node.js fetch.
 */

import express from 'express';
import crypto from 'crypto';
import db, { initDatabase } from './database.js';
import adminRoutes from './routes/admin.js';
import propertyRoutes from './routes/properties.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import agreementRoutes from './routes/agreements.js';

const PORT = 5098;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Setup Express app
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/agreements', agreementRoutes);

let server;

async function runTests() {
  console.log('🧪 Starting Foreign Key Deletion & Deactivation Handling Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      resolve();
    });
  });

  try {
    // Verify foreign keys are strictly enabled
    const fkStatus = db.prepare('PRAGMA foreign_keys').get();
    assert(fkStatus.foreign_keys === 1, 'SQLite PRAGMA foreign_keys is strictly ENABLED (=1)');

    // Ensure database is initialized with migrations
    initDatabase();

    // 1. Setup Test Admin
    const adminId = 'test_admin_fk_' + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status, verificationStatus, isDeleted, isActive)
      VALUES (?, ?, 'Admin FK Test', 'dummy', 'admin', 'approved', 'verified', 0, 1)
    `).run(adminId, `admin_fk_${Date.now()}@test.com`);

    // =========================================================================
    // SCENARIO 1: Permanent User Deletion (No Relations)
    // =========================================================================
    console.log('\n--- Scenario 1: Permanent User Deletion (Zero Relations) ---');
    const orphanTenantId = 'orphan_tenant_' + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status, verificationStatus, isDeleted, isActive)
      VALUES (?, ?, 'Orphan Tenant', 'dummy', 'tenant', 'approved', 'verified', 0, 1)
    `).run(orphanTenantId, `orphan_${Date.now()}@test.com`);

    const res1 = await fetch(`${BASE_URL}/api/admin/users/${orphanTenantId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId }
    });
    const body1 = await res1.json();

    assert(res1.status === 200, `DELETE /api/admin/users/:id returned 200 OK (Got ${res1.status})`);
    assert(body1.permanent === true, 'Response confirms permanent deletion');

    const checkUser1 = db.prepare('SELECT * FROM users WHERE id = ?').get(orphanTenantId);
    assert(!checkUser1, 'User record is completely removed from database');

    const fkCheck1 = db.prepare('PRAGMA foreign_key_check').all();
    assert(fkCheck1.length === 0, 'Zero foreign key violations after permanent user delete');

    // =========================================================================
    // SCENARIO 2: Permanent Property Deletion (Zero Relations)
    // =========================================================================
    console.log('\n--- Scenario 2: Permanent Property Deletion (Zero Relations) ---');
    const tempLandlordId = 'landlord_temp_' + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status, verificationStatus, isDeleted, isActive)
      VALUES (?, ?, 'Temp Landlord', 'dummy', 'landlord', 'approved', 'verified', 0, 1)
    `).run(tempLandlordId, `landlord_temp_${Date.now()}@test.com`);

    const orphanPropId = 'orphan_prop_' + Date.now();
    db.prepare(`
      INSERT INTO properties (id, title, description, rent, location, images, landlordId, landlordName, status, availability, isDeleted, isActive)
      VALUES (?, 'Orphan Villa', 'No requests ever', 25000, 'Kochi', '[]', ?, 'Temp Landlord', 'approved', 'available', 0, 1)
    `).run(orphanPropId, tempLandlordId);

    const res2 = await fetch(`${BASE_URL}/api/properties/${orphanPropId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId }
    });
    const body2 = await res2.json();

    assert(res2.status === 200, `DELETE /api/properties/:id returned 200 OK (Got ${res2.status})`);
    assert(body2.permanent === true, 'Response confirms permanent property deletion');

    const checkProp2 = db.prepare('SELECT * FROM properties WHERE id = ?').get(orphanPropId);
    assert(!checkProp2, 'Property record is completely removed from database');

    const fkCheck2 = db.prepare('PRAGMA foreign_key_check').all();
    assert(fkCheck2.length === 0, 'Zero foreign key violations after permanent property delete');

    // =========================================================================
    // SCENARIO 3: User Deletion with Relations (Agreements / Requests Exist)
    // =========================================================================
    console.log('\n--- Scenario 3: User Soft-Deletion & Deactivation with Relations ---');
    const relTenantId = 'rel_tenant_' + Date.now();
    const relLandlordId = 'rel_landlord_' + Date.now();
    const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');

    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status, verificationStatus, isDeleted, isActive)
      VALUES (?, ?, 'Active Rel Tenant', ?, 'tenant', 'approved', 'verified', 0, 1)
    `).run(relTenantId, `rel_tenant_${Date.now()}@test.com`, passwordHash);

    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status, verificationStatus, isDeleted, isActive)
      VALUES (?, ?, 'Active Rel Landlord', ?, 'landlord', 'approved', 'verified', 0, 1)
    `).run(relLandlordId, `rel_landlord_${Date.now()}@test.com`, passwordHash);

    const relPropId = 'rel_prop_' + Date.now();
    db.prepare(`
      INSERT INTO properties (id, title, description, rent, location, images, landlordId, landlordName, status, availability, isDeleted, isActive)
      VALUES (?, 'Heritage House', 'With rental history', 30000, 'Alappuzha', '[]', ?, 'Active Rel Landlord', 'approved', 'available', 0, 1)
    `).run(relPropId, relLandlordId);

    const relReqId = 'rel_req_' + Date.now();
    db.prepare(`
      INSERT INTO rental_requests (id, propertyId, propertyTitle, tenantId, tenantName, landlordId, proposedRent, originalRent, status)
      VALUES (?, ?, 'Heritage House', ?, 'Active Rel Tenant', ?, 28000, 30000, 'accepted')
    `).run(relReqId, relPropId, relTenantId, relLandlordId);

    const relAgId = 'rel_agreement_' + Date.now();
    db.prepare(`
      INSERT INTO agreements (id, propertyId, propertyTitle, tenantId, tenantName, landlordId, landlordName, finalRent, startDate, endDate, status, requestId, blockchainHash, blockchainTimestamp, createdAt)
      VALUES (?, ?, 'Heritage House', ?, 'Active Rel Tenant', ?, 'Active Rel Landlord', 28000, '2026-01-01', '2027-01-01', 'active', ?, 'hash123', datetime('now'), datetime('now'))
    `).run(relAgId, relPropId, relTenantId, relLandlordId, relReqId);

    // 3a. Explicit permanent delete should return 409 Conflict because relations exist
    const res3a = await fetch(`${BASE_URL}/api/admin/users/${relTenantId}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId }
    });
    const body3a = await res3a.json();

    assert(res3a.status === 409, `DELETE with ?permanent=true returned 409 Conflict (Got ${res3a.status})`);
    assert(body3a.hasRelatedRecords === true, '409 response indicates related records exist');

    // 3b. Standard delete safely deactivates the user WITHOUT foreign key error
    const res3b = await fetch(`${BASE_URL}/api/admin/users/${relTenantId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId }
    });
    const body3b = await res3b.json();

    assert(res3b.status === 200, `DELETE /api/admin/users/:id returned 200 OK without FK error (Got ${res3b.status})`);
    assert(body3b.softDeleted === true, 'Response indicates soft deletion/deactivation');

    const checkUser3 = db.prepare('SELECT isDeleted, isActive, deletedAt FROM users WHERE id = ?').get(relTenantId);
    assert(checkUser3.isDeleted === 1, 'User is marked isDeleted = 1');
    assert(checkUser3.isActive === 0, 'User is marked isActive = 0');
    assert(checkUser3.deletedAt !== null, 'User has deletedAt timestamp set');

    // Verify related agreements and requests remain fully intact for legal & blockchain audit
    const checkAg3 = db.prepare('SELECT * FROM agreements WHERE id = ?').get(relAgId);
    assert(checkAg3 !== undefined, 'Agreement record preserved intact');
    const checkReq3 = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(relReqId);
    assert(checkReq3 !== undefined, 'Rental request record preserved intact');

    const fkCheck3 = db.prepare('PRAGMA foreign_key_check').all();
    assert(fkCheck3.length === 0, 'Zero foreign key violations after user deactivation');

    // =========================================================================
    // SCENARIO 4: Deactivated User Access Prevention
    // =========================================================================
    console.log('\n--- Scenario 4: Deactivated User Access & Action Prevention ---');
    // 4a. Login blocked
    const res4a = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: db.prepare('SELECT email FROM users WHERE id = ?').get(relTenantId).email,
        password: 'password123'
      })
    });
    assert(res4a.status === 403, `Deactivated user login rejected with 403 Forbidden (Got ${res4a.status})`);

    // 4b. Profile update blocked
    const res4b = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': relTenantId },
      body: JSON.stringify({ name: 'Hacked Name' })
    });
    assert(res4b.status === 403, `Deactivated user profile update rejected with 403 Forbidden (Got ${res4b.status})`);

    // 4c. New rental request creation blocked
    const res4c = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': relTenantId },
      body: JSON.stringify({ propertyId: relPropId, proposedRent: 25000 })
    });
    assert(res4c.status === 403, `Deactivated user cannot create new rental request (Got ${res4c.status})`);

    // =========================================================================
    // SCENARIO 5: Property Deletion with Relations (Agreements / Requests Exist)
    // =========================================================================
    console.log('\n--- Scenario 5: Property Soft-Deletion & Listing Exclusion ---');
    // 5a. Explicit permanent delete should return 409 Conflict
    const res5a = await fetch(`${BASE_URL}/api/properties/${relPropId}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId }
    });
    assert(res5a.status === 409, `Property permanent delete blocked with 409 Conflict (Got ${res5a.status})`);

    // 5b. Safe deactivation without FK error
    const res5b = await fetch(`${BASE_URL}/api/properties/${relPropId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId }
    });
    const body5b = await res5b.json();

    assert(res5b.status === 200, `Property safely deactivated without FK error (Got ${res5b.status})`);
    assert(body5b.softDeleted === true, 'Property soft-delete response flag is true');

    const checkProp5 = db.prepare('SELECT isDeleted, isActive FROM properties WHERE id = ?').get(relPropId);
    assert(checkProp5.isDeleted === 1, 'Property marked isDeleted = 1');
    assert(checkProp5.isActive === 0, 'Property marked isActive = 0');

    // 5c. Deactivated property does NOT appear in tenant browse search
    const res5c = await fetch(`${BASE_URL}/api/properties`);
    const body5c = await res5c.json();
    const foundInSearch = body5c.properties?.some(p => p.id === relPropId);
    assert(!foundInSearch, 'Deactivated property is completely excluded from tenant search listings');

    // 5d. Submitting request to deactivated property is rejected
    const activeTenantId = 'active_tenant_' + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status, verificationStatus, isDeleted, isActive)
      VALUES (?, ?, 'Active Tenant 2', 'dummy', 'tenant', 'approved', 'verified', 0, 1)
    `).run(activeTenantId, `active_t2_${Date.now()}@test.com`);

    const res5d = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': activeTenantId },
      body: JSON.stringify({ propertyId: relPropId, proposedRent: 30000 })
    });
    assert(res5d.status === 400, `New rental request on deactivated property is rejected with 400 (Got ${res5d.status})`);

    // =========================================================================
    // SCENARIO 6: Landlord Deletion with Relations cascades deactivation to listings
    // =========================================================================
    console.log('\n--- Scenario 6: Landlord Deactivation & Associated Property Cascade ---');
    const res6 = await fetch(`${BASE_URL}/api/admin/users/${relLandlordId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId }
    });
    const body6 = await res6.json();

    assert(res6.status === 200, `Landlord deletion succeeds without FK error (Got ${res6.status})`);
    assert(body6.softDeleted === true, 'Landlord soft-deleted due to rental history');

    const landlordUser = db.prepare('SELECT isDeleted, isActive FROM users WHERE id = ?').get(relLandlordId);
    assert(landlordUser.isDeleted === 1 && landlordUser.isActive === 0, 'Landlord user deactivated');

    // Final check: Foreign key integrity
    const finalFkCheck = db.prepare('PRAGMA foreign_key_check').all();
    assert(finalFkCheck.length === 0, 'Overall database foreign key integrity is 100% clean (0 errors)');

    console.log(`\n========================================`);
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
