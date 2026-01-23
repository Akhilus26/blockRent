import db from '../database.js';

console.log('Clearing all data except Admin...');

try {
    db.transaction(() => {
        // Delete all agreements
        db.prepare('DELETE FROM agreements').run();

        // Delete all requests
        db.prepare('DELETE FROM rental_requests').run();

        // Delete all properties
        db.prepare('DELETE FROM properties').run();

        // Delete all users except admin
        db.prepare('DELETE FROM users WHERE role != ?').run('admin');
    })();

    console.log('Data cleared successfully.');
} catch (error) {
    console.error('Error clearing data:', error);
}
