/**
 * Database Verification Script
 * 
 * This script verifies that properties are being stored and retrieved correctly
 * from the SQLite database.
 * 
 * Usage:
 *   node verify-database.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

try {
  const db = new Database(dbPath);
  
  console.log('🔍 Verifying Database...\n');
  console.log('='.repeat(60));
  
  // Check if database file exists and is accessible
  console.log('\n✅ Database connection: SUCCESS');
  console.log(`📍 Database path: ${dbPath}\n`);
  
  // Check if properties table exists
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='properties'
  `).get();
  
  if (!tableCheck) {
    console.error('❌ Properties table does not exist!');
    process.exit(1);
  }
  
  console.log('✅ Properties table: EXISTS\n');
  
  // Count total properties
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM properties').get();
  console.log(`📊 Total Properties in Database: ${totalCount.count}\n`);
  
  if (totalCount.count === 0) {
    console.log('⚠️  No properties found in database.');
    console.log('   Add some properties through the application to see data here.\n');
  } else {
    // Get property status breakdown
    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM properties 
      GROUP BY status
    `).all();
    
    console.log('📈 Property Status Breakdown:');
    statusBreakdown.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} properties`);
    });
    console.log();
    
    // Show sample properties (first 5)
    const sampleProperties = db.prepare(`
      SELECT id, title, rent, location, status, landlordName, createdAt
      FROM properties
      ORDER BY createdAt DESC
      LIMIT 5
    `).all();
    
    console.log('📋 Sample Properties (Latest 5):');
    console.log('-'.repeat(60));
    sampleProperties.forEach((prop, index) => {
      console.log(`\n${index + 1}. ${prop.title}`);
      console.log(`   ID: ${prop.id}`);
      console.log(`   Rent: ₹${prop.rent}`);
      console.log(`   Location: ${prop.location}`);
      console.log(`   Status: ${prop.status}`);
      console.log(`   Landlord: ${prop.landlordName}`);
      console.log(`   Created: ${prop.createdAt}`);
    });
    console.log('\n' + '='.repeat(60));
  }
  
  // Verify data structure
  console.log('\n🔍 Verifying Data Structure:');
  if (totalCount.count > 0) {
    const sampleProperty = db.prepare('SELECT * FROM properties LIMIT 1').get();
    const columns = Object.keys(sampleProperty);
    
    console.log('✅ Required columns found:');
    const requiredColumns = [
      'id', 'title', 'description', 'rent', 'location', 'images',
      'landlordId', 'landlordName', 'status', 'createdAt'
    ];
    
    requiredColumns.forEach(col => {
      const exists = columns.includes(col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });
  }
  
  // Test query (same as used in API)
  console.log('\n🔍 Testing API Query Pattern:');
  try {
    const testQuery = db.prepare(`
      SELECT * FROM properties 
      WHERE status = ? 
      ORDER BY createdAt DESC
    `).all('approved');
    
    console.log(`✅ Query successful: Found ${testQuery.length} approved properties`);
    console.log('   (This is the same query used by GET /api/properties?status=approved)');
  } catch (error) {
    console.error('❌ Query test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Database Verification Complete!\n');
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error('❌ Error verifying database:', error.message);
  console.error('\nPossible issues:');
  console.error('1. Database file does not exist - Run migrations first');
  console.error('2. Database file is corrupted');
  console.error('3. Permissions issue - Check file permissions');
  process.exit(1);
}
