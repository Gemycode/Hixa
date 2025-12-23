const axios = require('axios');

const URL = 'http://localhost:5000/api/auth/register';

async function test() {
    console.log(`Target: ${URL}`);

    // 1. Try POST (Expected to work or fail with validation error, NOT 404)
    console.log('\n--- Attempting POST ---');
    try {
        await axios.post(URL, {
            email: "test@test.com",
            password: "password123", 
            name: "Test"
        });
        console.log("POST Success (200/201)");
    } catch (err) {
        if (err.response) {
            console.log(`POST Response: ${err.response.status} - ${err.response.data.message || JSON.stringify(err.response.data)}`);
        } else {
            console.log(`POST Error: ${err.message}`);
        }
    }

    // 2. Try GET (Expected 404)
    console.log('\n--- Attempting GET ---');
    try {
        await axios.get(URL);
        console.log("GET Success");
    } catch (err) {
        if (err.response) {
            console.log(`GET Response: ${err.response.status} - ${err.response.data.message || JSON.stringify(err.response.data)}`);
        } else {
            console.log(`GET Error: ${err.message}`);
        }
    }
}

test();
