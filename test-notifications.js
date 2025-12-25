const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test Users
let adminToken;
let engineerToken;
let clientToken;
let adminId;
let engineerId;
let clientId;
let chatRoomId;
let notificationId;

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`\n${colors.cyan}🧪 ${msg}${colors.reset}`),
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNotifications() {
  console.log('\n🚀 Starting Notifications System Tests...\n');

  try {
    // ============================================
    // Test 1: Create Test Users (if needed)
    // ============================================
    log.test('Test 1: Setting up test users...');
    
    try {
      // Register Admin
      const adminReg = await axios.post(`${API_URL}/auth/register`, {
        email: `admin_test_${Date.now()}@test.com`,
        password: 'Admin123!@#',
        name: 'Test Admin',
        role: 'admin',
      });
      adminToken = adminReg.data.token;
      adminId = adminReg.data.user.id;
      log.success('Admin user created');
    } catch (err) {
      if (err.response?.status === 409) {
        // Try login
        const login = await axios.post(`${API_URL}/auth/login`, {
          email: 'admin_test@test.com',
          password: 'Admin123!@#',
        });
        adminToken = login.data.token;
        adminId = login.data.user.id;
        log.info('Admin user logged in');
      } else {
        throw err;
      }
    }

    try {
      // Register Engineer
      const engReg = await axios.post(`${API_URL}/auth/register/engineer`, {
        fullName: 'Test Engineer',
        email: `engineer_test_${Date.now()}@test.com`,
        password: 'Engineer123!@#',
        specialization: 'Civil Engineering',
        licenseNumber: `LIC${Date.now()}`,
      });
      engineerToken = engReg.data.token;
      engineerId = engReg.data.user.id;
      log.success('Engineer user created');
    } catch (err) {
      if (err.response?.status === 409) {
        log.info('Engineer user already exists');
      } else {
        throw err;
      }
    }

    try {
      // Register Client
      const clientReg = await axios.post(`${API_URL}/auth/register/client`, {
        fullName: 'Test Client',
        email: `client_test_${Date.now()}@test.com`,
        password: 'Client123!@#',
      });
      clientToken = clientReg.data.token;
      clientId = clientReg.data.user.id;
      log.success('Client user created');
    } catch (err) {
      if (err.response?.status === 409) {
        log.info('Client user already exists');
      } else {
        throw err;
      }
    }

    // ============================================
    // Test 2: Get Notifications (Empty)
    // ============================================
    log.test('Test 2: Get notifications (should be empty initially)...');
    try {
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${engineerToken}` },
      });
      if (res.data.data.length === 0) {
        log.success('Notifications list is empty (expected)');
      } else {
        log.info(`Found ${res.data.data.length} existing notifications`);
      }
    } catch (err) {
      log.error(`Failed: ${err.response?.data?.message || err.message}`);
    }

    // ============================================
    // Test 3: Get Unread Count
    // ============================================
    log.test('Test 3: Get unread notifications count...');
    try {
      const res = await axios.get(`${API_URL}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${engineerToken}` },
      });
      log.success(`Unread count: ${res.data.data.unreadCount}`);
    } catch (err) {
      log.error(`Failed: ${err.response?.data?.message || err.message}`);
    }

    // ============================================
    // Test 4: Create a Chat Room (for testing messages)
    // ============================================
    log.test('Test 4: Create a chat room...');
    try {
      // First, create a project
      const projectRes = await axios.post(
        `${API_URL}/projects`,
        {
          title: 'Test Project for Notifications',
          description: 'Test project description',
          location: 'Riyadh',
          projectType: 'Construction',
          budget: { amount: 10000, currency: 'SAR' },
        },
        {
          headers: { Authorization: `Bearer ${clientToken}` },
        }
      );
      const projectId = projectRes.data.data.id;
      log.success(`Project created: ${projectId}`);

      // Approve project (as admin)
      await axios.patch(
        `${API_URL}/projects/${projectId}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      log.success('Project approved');

      // Wait a bit for ProjectRoom creation
      await sleep(1000);

      // Get chat rooms
      const chatRoomsRes = await axios.get(`${API_URL}/chat-rooms`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      
      if (chatRoomsRes.data.data.length > 0) {
        chatRoomId = chatRoomsRes.data.data[0]._id || chatRoomsRes.data.data[0].id;
        log.success(`Chat room found: ${chatRoomId}`);
      } else {
        log.info('No chat rooms found yet (this is okay if no proposals submitted)');
      }
    } catch (err) {
      log.error(`Failed: ${err.response?.data?.message || err.message}`);
      if (err.response?.data) {
        console.log('Error details:', JSON.stringify(err.response.data, null, 2));
      }
    }

    // ============================================
    // Test 5: Send Message (should create notification)
    // ============================================
    if (chatRoomId) {
      log.test('Test 5: Send a message (should create notification)...');
      try {
        const messageRes = await axios.post(
          `${API_URL}/messages`,
          {
            chatRoomId: chatRoomId,
            content: 'Hello! This is a test message',
            type: 'text',
          },
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );
        log.success('Message sent successfully');
        
        // Wait for notification to be created
        await sleep(1000);

        // Check notifications
        const notificationsRes = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${engineerToken || clientToken}` },
          params: { unreadOnly: true },
        });
        
        if (notificationsRes.data.data.length > 0) {
          notificationId = notificationsRes.data.data[0]._id || notificationsRes.data.data[0].id;
          log.success(`Notification created: ${notificationId}`);
          log.info(`Notification: ${JSON.stringify(notificationsRes.data.data[0], null, 2)}`);
        } else {
          log.info('No notifications found (this might be okay if engineer/client not in room)');
        }
      } catch (err) {
        log.error(`Failed: ${err.response?.data?.message || err.message}`);
      }
    } else {
      log.info('Skipping message test (no chat room available)');
    }

    // ============================================
    // Test 6: Mark Notification as Read
    // ============================================
    if (notificationId) {
      log.test('Test 6: Mark notification as read...');
      try {
        const res = await axios.patch(
          `${API_URL}/notifications/${notificationId}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${engineerToken || clientToken}` },
          }
        );
        log.success('Notification marked as read');
        log.info(`Updated notification: ${JSON.stringify(res.data.data, null, 2)}`);
      } catch (err) {
        log.error(`Failed: ${err.response?.data?.message || err.message}`);
      }
    }

    // ============================================
    // Test 7: Mark All as Read
    // ============================================
    log.test('Test 7: Mark all notifications as read...');
    try {
      const res = await axios.patch(
        `${API_URL}/notifications/read-all`,
        {},
        {
          headers: { Authorization: `Bearer ${engineerToken || clientToken}` },
        }
      );
      log.success(`Marked ${res.data.data.updatedCount} notifications as read`);
    } catch (err) {
      log.error(`Failed: ${err.response?.data?.message || err.message}`);
    }

    // ============================================
    // Test 8: Get Notification by ID
    // ============================================
    if (notificationId) {
      log.test('Test 8: Get notification by ID...');
      try {
        const res = await axios.get(`${API_URL}/notifications/${notificationId}`, {
          headers: { Authorization: `Bearer ${engineerToken || clientToken}` },
        });
        log.success('Notification retrieved successfully');
        log.info(`Notification details: ${JSON.stringify(res.data.data, null, 2)}`);
      } catch (err) {
        log.error(`Failed: ${err.response?.data?.message || err.message}`);
      }
    }

    // ============================================
    // Test 9: Delete Notification
    // ============================================
    if (notificationId) {
      log.test('Test 9: Delete notification...');
      try {
        await axios.delete(`${API_URL}/notifications/${notificationId}`, {
          headers: { Authorization: `Bearer ${engineerToken || clientToken}` },
        });
        log.success('Notification deleted successfully');
      } catch (err) {
        log.error(`Failed: ${err.response?.data?.message || err.message}`);
      }
    }

    // ============================================
    // Test 10: Final Unread Count Check
    // ============================================
    log.test('Test 10: Final unread count check...');
    try {
      const res = await axios.get(`${API_URL}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${engineerToken || clientToken}` },
      });
      log.success(`Final unread count: ${res.data.data.unreadCount}`);
    } catch (err) {
      log.error(`Failed: ${err.response?.data?.message || err.message}`);
    }

    console.log('\n✨ All tests completed!\n');

  } catch (error) {
    log.error(`Test failed with error: ${error.message}`);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testNotifications().catch(console.error);
}

module.exports = { testNotifications };


