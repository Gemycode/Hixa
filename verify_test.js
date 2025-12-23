const axios = require('axios');
const { io } = require('socket.io-client');

// Configuration
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Test Data
const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    name: 'Test Security',
    role: 'admin', // TRYING TO HACK TO BE ADMIN
    nationalId: `${Date.now()}`.substring(0, 14) // Unique generic ID
};

async function runTests() {
    console.log('🚀 Starting Verification Tests...\n');

    let token;
    let userId;
    let chatRoomId;

    // 1. TEST SECURITY: Register
    console.log('1️⃣  Testing Security Fix (Registering as Admin)...');
    try {
        const res = await axios.post(`${API_URL}/auth/register`, testUser);
        console.log('Status:', res.status);
        console.log('Response Role:', res.data.user.role);
        
        token = res.data.token;
        userId = res.data.user.id;

        if (res.data.user.role !== 'admin') {
            console.log('✅ PASS: Security Fix works! User was NOT created as admin.');
        } else {
            console.error('❌ FAIL: Security Vulnerability! User was created as admin.');
            return;
        }
    } catch (error) {
        if (error.response?.status === 409) {
            console.log('⚠️  User already exists, trying login...');
            // Try login if exists
            try {
                const loginRes = await axios.post(`${API_URL}/auth/login`, {
                    email: testUser.email,
                    password: testUser.password
                });
                token = loginRes.data.token;
                userId = loginRes.data.user.id;
                console.log(`Logged in. Role: ${loginRes.data.user.role}`);
                if (loginRes.data.user.role !== 'admin') {
                    console.log('✅ PASS: User is not admin.');
                }
            } catch (loginErr) {
                console.error('Login failed:', loginErr.message);
                return;
            }
        } else {
            console.error('❌ Register failed:', error.message);
            if (error.response) console.error(error.response.data);
            return;
        }
    }

    console.log('\n------------------------------------------------\n');

    // 2. TEST CHAT: Socket Connection
    console.log('2️⃣  Testing Real-time Chat (Socket.io)...');
    
    // We need a ProjectRoom and ChatRoom to test properly. 
    // For this simple test, we will just test the CONNECTION first.
    // Testing full flow requires existing project/room IPs which is hard to guess.

    const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'] // Force try websocket
    });

    socket.on('connect', () => {
        console.log('✅ PASS: Socket Connected Successfully! ID:', socket.id);
        
        // Clean exit
        socket.disconnect();
        console.log('\n🎉 All basic verifications passed!');
        process.exit(0);
    });

    socket.on('connect_error', (err) => {
        console.error('❌ FAIL: Socket Connection Error:', err.message);
        process.exit(1);
    });

    // Timeout
    setTimeout(() => {
        if (!socket.connected) {
            console.error('❌ FAIL: Socket Connection Timeout');
            process.exit(1);
        }
    }, 5000);
}

runTests();
