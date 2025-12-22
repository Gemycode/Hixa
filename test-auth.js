const axios = require('axios');

async function testAuth() {
  try {
    // Register a new user
    console.log('Registering user...');
    const registerResponse = await axios.post('http://localhost:5000/api/auth/register/client', {
      fullName: 'Test User',
      email: 'test2@example.com',
      password: 'Password123',
      confirmPassword: 'Password123'
    });
    
    console.log('Registration Response:', registerResponse.data);
    
    // Login
    console.log('\nLogging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test2@example.com',
      password: 'Password123'
    });
    
    console.log('Login Response:', loginResponse.data);
    const token = loginResponse.data.token;
    
    // Access profile
    console.log('\nAccessing profile...');
    const profileResponse = await axios.get('http://localhost:5000/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Profile Response:', profileResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testAuth();