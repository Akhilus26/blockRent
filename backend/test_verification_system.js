import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

process.env.NODE_ENV = 'test';
process.env.PORT = '5055';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import express app
import app from './server.js';
import db from './database.js';

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;

// Helper to create a dummy valid PDF buffer
function createDummyPdfBuffer() {
  const content = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
  return Buffer.from(content, 'utf-8');
}

// Helper to create a dummy valid PNG buffer
function createDummyPngBuffer() {
  // Valid 8-byte PNG header + minimal chunks
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89
  ]);
}

// Test runner function
async function runAllTests() {
  console.log('===============================================================');
  console.log('   BLOCKRENT VERIFICATION SYSTEM - 10 SCENARIO TEST SUITE     ');
  console.log('===============================================================\n');

  // Start HTTP server on test port
  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Test Server] Listening on http://localhost:${PORT}`);
      resolve();
    });
  });

  const results = [];
  let testNum = 1;

  function record(title, passed, details) {
    results.push({ testNum, title, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${mark} [Scenario ${testNum}]: ${title}`);
    if (details) console.log(`   Details: ${details}`);
    testNum++;
  }

  try {
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
    const existingLandlord = db.prepare("SELECT * FROM users WHERE role = 'landlord'").get();
    const existingApprovedProperty = db.prepare("SELECT * FROM properties WHERE status = 'approved'").get();

    // -------------------------------------------------------------
    // Scenario 1: A new tenant registers with a dummy identity document and receives 'pending' status
    // -------------------------------------------------------------
    const tenant1Email = `tenant_auto_${Date.now()}@test.com`;
    const pdfBlob = new Blob([createDummyPdfBuffer()], { type: 'application/pdf' });
    const regForm1 = new FormData();
    regForm1.append('name', 'Scenario1 Tenant');
    regForm1.append('email', tenant1Email);
    regForm1.append('password', 'password123');
    regForm1.append('role', 'tenant');
    regForm1.append('phone', '9876543210');
    regForm1.append('identityDocumentType', 'Aadhaar Card (Demo)');
    regForm1.append('identityDocument', pdfBlob, 'dummy_aadhaar.pdf');

    const regRes1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: regForm1
    });
    const regData1 = await regRes1.json();

    const registeredTenantId = regData1.user?.id;
    const dbTenant1 = db.prepare('SELECT * FROM users WHERE id = ?').get(registeredTenantId);

    const s1Passed = regRes1.status === 201 &&
                     regData1.user?.verificationStatus === 'pending' &&
                     dbTenant1?.verificationStatus === 'pending' &&
                     Boolean(dbTenant1?.identityDocument);
    record(
      'New tenant registers with dummy identity document -> verificationStatus = pending',
      s1Passed,
      `HTTP ${regRes1.status}, verificationStatus: ${dbTenant1?.verificationStatus}, stored doc: ${dbTenant1?.identityDocument}`
    );

    // -------------------------------------------------------------
    // Scenario 2: A pending tenant cannot submit a rental request using direct API call
    // -------------------------------------------------------------
    const reqRes2 = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': registeredTenantId
      },
      body: JSON.stringify({
        propertyId: existingApprovedProperty.id,
        proposedRent: 15000,
        message: 'Request while pending verification'
      })
    });
    const reqData2 = await reqRes2.json();
    const s2Passed = reqRes2.status === 403 && reqData2.error?.toLowerCase().includes('verification required');
    record(
      'Pending tenant cannot submit a rental request (returns 403)',
      s2Passed,
      `HTTP ${reqRes2.status}, error message: "${reqData2.error}"`
    );

    // -------------------------------------------------------------
    // Scenario 3: An admin can securely review, approve, or reject the tenant
    // -------------------------------------------------------------
    // 3a. Admin downloads the document
    const docRes3 = await fetch(`${BASE_URL}/admin/documents/identity/${registeredTenantId}`, {
      headers: { 'x-user-id': adminUser.id }
    });
    const docBuffer3 = await docRes3.arrayBuffer();

    // 3b. Admin rejects tenant with rejection reason
    const rejectRes3 = await fetch(`${BASE_URL}/admin/users/${registeredTenantId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminUser.id
      },
      body: JSON.stringify({ rejectionReason: 'Dummy Aadhaar number unreadable' })
    });
    const rejectData3 = await rejectRes3.json();
    const dbTenant3 = db.prepare('SELECT verificationStatus, rejectionReason FROM users WHERE id = ?').get(registeredTenantId);

    const s3Passed = docRes3.status === 200 &&
                     docBuffer3.byteLength > 0 &&
                     rejectRes3.status === 200 &&
                     dbTenant3.verificationStatus === 'rejected' &&
                     dbTenant3.rejectionReason === 'Dummy Aadhaar number unreadable';
    record(
      'Admin securely reviews document and rejects tenant with rejection reason',
      s3Passed,
      `Doc fetch HTTP ${docRes3.status} (${docBuffer3.byteLength} bytes), reject HTTP ${rejectRes3.status}, reason: "${dbTenant3.rejectionReason}"`
    );

    // -------------------------------------------------------------
    // Scenario 4: A rejected tenant cannot regain access simply by resubmitting a document
    // -------------------------------------------------------------
    // 4a. Verify rejected tenant still cannot submit request
    const rejectedReqRes4 = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': registeredTenantId
      },
      body: JSON.stringify({
        propertyId: existingApprovedProperty.id,
        proposedRent: 15000
      })
    });

    // 4b. Tenant resubmits document
    const resubmitForm4 = new FormData();
    resubmitForm4.append('identityDocumentType', 'Voter ID (Demo)');
    resubmitForm4.append('identityDocument', new Blob([createDummyPdfBuffer()], { type: 'application/pdf' }), 'new_aadhaar.pdf');

    const resubmitRes4 = await fetch(`${BASE_URL}/auth/resubmit-identity`, {
      method: 'POST',
      headers: { 'x-user-id': registeredTenantId },
      body: resubmitForm4
    });
    const resubmitData4 = await resubmitRes4.json();

    // 4c. Verify tenant is now 'pending', NOT 'verified'
    const dbTenant4 = db.prepare('SELECT verificationStatus FROM users WHERE id = ?').get(registeredTenantId);

    // 4d. Verify tenant STILL cannot submit rental requests after resubmission
    const pendingReqRes4 = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': registeredTenantId
      },
      body: JSON.stringify({
        propertyId: existingApprovedProperty.id,
        proposedRent: 15000
      })
    });

    const s4Passed = rejectedReqRes4.status === 403 &&
                     resubmitRes4.status === 200 &&
                     dbTenant4.verificationStatus === 'pending' &&
                     pendingReqRes4.status === 403;
    record(
      'Rejected tenant resets to pending on resubmission and still cannot submit requests until admin approves',
      s4Passed,
      `Rejected request HTTP ${rejectedReqRes4.status}, Resubmit HTTP ${resubmitRes4.status}, DB status: ${dbTenant4.verificationStatus}, Post-resubmit request HTTP ${pendingReqRes4.status}`
    );

    // -------------------------------------------------------------
    // Scenario 5: Landlord submits property with ownership document, remains hidden until approval
    // -------------------------------------------------------------
    // 5a. Landlord uploads ownership document
    const ownDocForm = new FormData();
    ownDocForm.append('ownershipDocument', new Blob([createDummyPdfBuffer()], { type: 'application/pdf' }), 'property_deed.pdf');

    const uploadOwnRes5 = await fetch(`${BASE_URL}/properties/upload-ownership`, {
      method: 'POST',
      headers: { 'x-user-id': existingLandlord.id },
      body: ownDocForm
    });
    const uploadOwnData5 = await uploadOwnRes5.json();

    // 5b. Landlord creates property
    const createPropRes5 = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': existingLandlord.id
      },
      body: JSON.stringify({
        title: 'Auto Test Villa for Verification',
        description: 'Exclusive villa awaiting ownership verification',
        rent: 45000,
        location: 'Kochi Waterfront',
        district: 'Ernakulam',
        bedrooms: 3,
        bathrooms: 3,
        area: 2100,
        ownershipDocument: uploadOwnData5.ownershipDocument,
        ownershipDocumentName: uploadOwnData5.ownershipDocumentName
      })
    });
    const createPropData5 = await createPropRes5.json();
    const newPropertyId = createPropData5.property?.id;

    // 5c. Tenant views public properties
    const publicPropsRes5 = await fetch(`${BASE_URL}/properties`, {
      headers: { 'x-user-id': registeredTenantId }
    });
    const publicPropsData5 = await publicPropsRes5.json();
    const isHiddenFromPublic = !publicPropsData5.properties.some(p => p.id === newPropertyId);

    const s5Passed = uploadOwnRes5.status === 200 &&
                     createPropRes5.status === 201 &&
                     createPropData5.property?.status === 'pending' &&
                     isHiddenFromPublic;
    record(
      'Landlord property with ownership document defaults to pending and remains hidden from public listings',
      s5Passed,
      `Created property status: ${createPropData5.property?.status}, Hidden from public list: ${isHiddenFromPublic}`
    );

    // -------------------------------------------------------------
    // Scenario 6: Unapproved property cannot be accessed through direct API requests by tenants
    // -------------------------------------------------------------
    const directAccessRes6 = await fetch(`${BASE_URL}/properties/${newPropertyId}`, {
      headers: { 'x-user-id': registeredTenantId }
    });
    const directAccessData6 = await directAccessRes6.json();

    // But owning landlord CAN access it
    const landlordAccessRes6 = await fetch(`${BASE_URL}/properties/${newPropertyId}`, {
      headers: { 'x-user-id': existingLandlord.id }
    });

    const s6Passed = directAccessRes6.status === 403 &&
                     directAccessData6.error?.toLowerCase().includes('pending verification') &&
                     landlordAccessRes6.status === 200;
    record(
      'Unapproved property returns 403 to tenants on direct GET, but owner landlord can view it',
      s6Passed,
      `Tenant direct GET HTTP ${directAccessRes6.status} ("${directAccessData6.error}"), Landlord GET HTTP ${landlordAccessRes6.status}`
    );

    // -------------------------------------------------------------
    // Scenario 7: Unauthorized user cannot download identity or ownership documents
    // -------------------------------------------------------------
    // Another tenant tries to download tenant 1's identity document
    const unauthorizedTenantRes7 = await fetch(`${BASE_URL}/admin/documents/identity/${registeredTenantId}`, {
      headers: { 'x-user-id': existingLandlord.id } // Landlord is not admin and not the tenant
    });

    // Unauthenticated user
    const unauthenticatedRes7 = await fetch(`${BASE_URL}/admin/documents/identity/${registeredTenantId}`);

    // Unauthorized tenant tries to download landlord's ownership document
    const unauthorizedOwnershipRes7 = await fetch(`${BASE_URL}/admin/documents/ownership/${newPropertyId}`, {
      headers: { 'x-user-id': registeredTenantId }
    });

    const s7Passed = unauthorizedTenantRes7.status === 403 &&
                     unauthenticatedRes7.status === 401 &&
                     unauthorizedOwnershipRes7.status === 403;
    record(
      'Unauthorized user cannot download identity or ownership documents (returns 401/403)',
      s7Passed,
      `Landlord viewing tenant identity HTTP ${unauthorizedTenantRes7.status}, Anonymous HTTP ${unauthenticatedRes7.status}, Tenant viewing ownership HTTP ${unauthorizedOwnershipRes7.status}`
    );

    // -------------------------------------------------------------
    // Scenario 8: Approved tenant can request an approved property
    // -------------------------------------------------------------
    // 8a. Admin approves tenant
    await fetch(`${BASE_URL}/admin/users/${registeredTenantId}/approve`, {
      method: 'PATCH',
      headers: { 'x-user-id': adminUser.id }
    });

    // 8b. Admin approves the new property
    await fetch(`${BASE_URL}/admin/properties/${newPropertyId}/approve`, {
      method: 'PATCH',
      headers: { 'x-user-id': adminUser.id }
    });

    // 8c. Verified tenant now requests the approved property
    const approvedReqRes8 = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': registeredTenantId
      },
      body: JSON.stringify({
        propertyId: newPropertyId,
        proposedRent: 42000,
        message: 'Verified tenant formal request'
      })
    });
    const approvedReqData8 = await approvedReqRes8.json();
    const createdRequestId8 = approvedReqData8.request?.id;

    const s8Passed = approvedReqRes8.status === 201 && Boolean(createdRequestId8);
    record(
      'Approved tenant can request an approved property (returns 201)',
      s8Passed,
      `HTTP ${approvedReqRes8.status}, Created Request ID: ${createdRequestId8}`
    );

    // -------------------------------------------------------------
    // Scenario 9: Existing rent negotiation, payment, and blockchain agreement workflows continue to work correctly
    // -------------------------------------------------------------
    // 9a. Landlord counters offer
    const counterRes9 = await fetch(`${BASE_URL}/requests/${createdRequestId8}/respond`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': existingLandlord.id
      },
      body: JSON.stringify({
        action: 'counter',
        counterRent: 43500,
        message: 'Best offer 43500'
      })
    });
    const counterData9 = await counterRes9.json();

    // 9b. Tenant accepts counter offer
    const confirmRes9 = await fetch(`${BASE_URL}/requests/${createdRequestId8}/confirm`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': registeredTenantId
      },
      body: JSON.stringify({ action: 'accept' })
    });
    const confirmData9 = await confirmRes9.json();

    // 9c. Tenant initiates payment
    const payRes9 = await fetch(`${BASE_URL}/requests/${createdRequestId8}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': registeredTenantId
      }
    });
    const payData9 = await payRes9.json();

    // 9d. Verify agreement in database with blockchain hash and finalRent
    const dbAgreement = db.prepare('SELECT * FROM agreements WHERE propertyId = ? AND tenantId = ?').get(newPropertyId, registeredTenantId);

    const s9Passed = counterRes9.status === 200 &&
                     confirmRes9.status === 200 &&
                     confirmData9.request?.status === 'approved' &&
                     payRes9.status === 200 &&
                     payData9.success === true &&
                     Boolean(dbAgreement?.blockchainHash) &&
                     dbAgreement?.finalRent === 43500;
    record(
      'Full rent negotiation, payment processing, and blockchain agreement generation complete successfully',
      s9Passed,
      `Counter HTTP ${counterRes9.status}, Confirm HTTP ${confirmRes9.status}, Payment HTTP ${payRes9.status}, Agreement Hash: ${dbAgreement?.blockchainHash?.substring(0, 16)}... Final Rent: ₹${dbAgreement?.finalRent}`
    );

    // -------------------------------------------------------------
    // Scenario 10: Upload validation rejects oversized files, unsupported formats, and unauthorized upload attempts
    // -------------------------------------------------------------
    // 10a. Unsupported extension (.exe)
    const exeForm = new FormData();
    exeForm.append('name', 'Exe Hacker');
    exeForm.append('email', `hacker_${Date.now()}@test.com`);
    exeForm.append('password', 'password123');
    exeForm.append('role', 'tenant');
    exeForm.append('identityDocument', new Blob(['MZ...'], { type: 'application/x-msdownload' }), 'virus.exe');

    const exeRes10 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: exeForm
    });

    // 10b. Extension spoofing (plain text named .pdf failing magic bytes)
    const spoofForm = new FormData();
    spoofForm.append('name', 'Spoofer');
    spoofForm.append('email', `spoofer_${Date.now()}@test.com`);
    spoofForm.append('password', 'password123');
    spoofForm.append('role', 'tenant');
    spoofForm.append('identityDocument', new Blob(['Plain text not a real pdf'], { type: 'application/pdf' }), 'fake.pdf');

    const spoofRes10 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: spoofForm
    });
    const spoofData10 = await spoofRes10.json();

    // 10c. Oversized file (> 5MB identity document)
    const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x25); // 5.5 MB
    const largeForm = new FormData();
    largeForm.append('name', 'Large File User');
    largeForm.append('email', `large_${Date.now()}@test.com`);
    largeForm.append('password', 'password123');
    largeForm.append('role', 'tenant');
    largeForm.append('identityDocument', new Blob([largeBuffer], { type: 'application/pdf' }), 'large.pdf');

    const largeRes10 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: largeForm
    });

    // 10d. Tenant trying to upload property ownership document (unauthorized)
    const unauthUploadForm = new FormData();
    unauthUploadForm.append('ownershipDocument', new Blob([createDummyPdfBuffer()], { type: 'application/pdf' }), 'deed.pdf');
    const unauthOwnRes10 = await fetch(`${BASE_URL}/properties/upload-ownership`, {
      method: 'POST',
      headers: { 'x-user-id': registeredTenantId }, // Tenant trying to upload ownership
      body: unauthUploadForm
    });

    const s10Passed = exeRes10.status === 400 &&
                      spoofRes10.status === 400 &&
                      spoofData10.error?.includes('Corrupted or unsupported file format') &&
                      largeRes10.status === 400 &&
                      unauthOwnRes10.status === 403;
    record(
      'Upload validation rejects unsupported formats, extension spoofing, oversized files, and unauthorized upload attempts',
      s10Passed,
      `EXE HTTP ${exeRes10.status}, Spoof HTTP ${spoofRes10.status} ("${spoofData10.error}"), Oversized HTTP ${largeRes10.status}, Tenant ownership upload HTTP ${unauthOwnRes10.status}`
    );

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    if (server) {
      server.close();
      console.log('\n[Test Server] Closed.');
    }
  }

  // Summary
  const passCount = results.filter(r => r.passed).length;
  console.log('\n===============================================================');
  console.log(`   TEST EXECUTION SUMMARY: ${passCount} / ${results.length} PASSED`);
  console.log('===============================================================');
  if (passCount === results.length) {
    console.log('🎉 ALL 10 MANDATORY VERIFICATION SCENARIOS PASSED WITH ACTUAL RESULTS!');
  } else {
    console.log(`⚠️ Some tests failed.`);
  }
}

runAllTests();
