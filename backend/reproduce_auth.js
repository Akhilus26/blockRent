// fetch is global in Node 25

const BASE_URL = 'http://localhost:5000/api';

async function testAuth() {
    const timestamp = Date.now();
    const testUser = {
        name: `Test User ${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'password123',
        role: 'tenant'
    };

    console.log('1. Testing Registration...');
    try {
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        if (!regRes.ok) {
            const err = await regRes.text();
            console.error('Registration failed:', regRes.status, err);
            process.exit(1);
        }
        const regData = await regRes.json();
        console.log('Registration success:', regData.user.email);

        console.log('2. Testing Login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });

        if (!loginRes.ok) {
            const err = await loginRes.text();
            console.error('Login failed:', loginRes.status, err);
            process.exit(1);
        }
        const loginData = await loginRes.json();
        console.log('Login success:', loginData.user.email);
        console.log('User ID:', loginData.user.id);

    } catch (error) {
        console.error('Test failed with error:', error);
        process.exit(1);
    }
}

testAuth();
