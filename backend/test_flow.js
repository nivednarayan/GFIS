#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  try {
    console.log('\n=== Testing Application Submission Flow ===\n');

    // Step 1: Create application
    console.log('Step 1: Creating application...');
    const createResponse = await makeRequest('POST', '/applications', {
      schemeId: 'ayushman',
    });
    console.log('Response status:', createResponse.status);
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));

    if (createResponse.status !== 201) {
      throw new Error(`Failed to create application: ${createResponse.status}`);
    }

    const appId = createResponse.data.data.applicationId;
    console.log('✓ Created application:', appId);

    // Step 2: Save some answers
    console.log('\nStep 2: Saving answers...');
    const saveResponse = await makeRequest('POST', `/applications/${appId}/save-answer`, {
      fieldName: 'fullName',
      fieldLabel: 'Full Name',
      fieldType: 'string',
      answer: 'Test User',
    });
    console.log('Response status:', saveResponse.status);
    if (saveResponse.status === 200) {
      console.log('✓ Answer saved');
    }

    // Step 3: Submit application
    console.log('\nStep 3: Submitting application...');
    const submitResponse = await makeRequest('POST', `/applications/${appId}/submit`, {
      collectedAnswers: {
        fullName: 'Test User',
        aadhaarNumber: '123123123123',
      },
    });
    console.log('Response status:', submitResponse.status);
    console.log('Response:', JSON.stringify(submitResponse.data, null, 2));

    if (submitResponse.status === 200) {
      console.log('✓ Application submitted successfully');
    } else {
      console.log('✗ Submission failed with status:', submitResponse.status);
    }

    console.log('\n=== Test Complete ===\n');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
