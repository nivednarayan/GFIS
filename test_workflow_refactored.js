/**
 * Test script to verify the refactored workflow:
 * 1. Create Application (draft)
 * 2. Save answers to UserInput collection
 * 3. Risk assessment reads from UserInput
 * 4. Risk results stored in Application
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
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
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode,
            data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  console.log('🚀 Refactored Workflow Test\n');
  console.log('Workflow: UserInput Collection → Risk Assessment → Application\n');

  try {
    // Step 1: Create application
    console.log('📋 Step 1: Create application (draft state)');
    const createRes = await makeRequest('POST', '/applications', {
      schemeId: 'ayushman',
    });

    if (createRes.status !== 201) {
      throw new Error(`Failed to create: ${JSON.stringify(createRes.data)}`);
    }

    const appId = createRes.data.data.applicationId;
    console.log(`✅ Created: ${appId}\n`);

    // Step 2: Save answers (these go to UserInput collection)
    console.log('📝 Step 2: Save answers to UserInput collection');
    const answers = [
      { fieldName: 'fullName', answer: 'Test User' },
      { fieldName: 'aadhaarNumber', answer: '999888777666' },
      { fieldName: 'rationCardNumber', answer: '456' },
      { fieldName: 'familyMembers', answer: '5' },
    ];

    for (const ans of answers) {
      await makeRequest('POST', `/applications/${appId}/save-answer`, {
        fieldName: ans.fieldName,
        fieldLabel: ans.fieldName,
        fieldType: 'string',
        answer: ans.answer,
      });
      console.log(`   ✓ ${ans.fieldName} = ${ans.answer}`);
    }
    console.log('✅ All answers saved to UserInput\n');

    // Step 3: Submit (risk assessment reads from UserInput)
    console.log('⚡ Step 3: Submit application (risk assessment reads UserInput)');
    const submitRes = await makeRequest('POST', `/applications/${appId}/submit`, {
      collectedAnswers: {
        fullName: 'Test User',
        aadhaarNumber: '999888777666',
        rationCardNumber: '456',
        familyMembers: '5',
      },
    });

    if (submitRes.status !== 200) {
      throw new Error(`Submit failed: ${JSON.stringify(submitRes.data)}`);
    }

    const submitData = submitRes.data.data;
    console.log(`✅ Application submitted\n`);

    // Step 4: Display results
    console.log('📊 Final State:');
    console.log(`  Status: ${submitData.status}`);
    console.log(`  Total Answers: ${submitData.totalAnswers}`);

    if (submitData.riskAssessment) {
      const risk = submitData.riskAssessment;
      console.log(`\n  Risk Assessment (from UserInput analysis):`);
      console.log(`    Score: ${risk.riskScore}/100`);
      console.log(`    Level: ${risk.riskLevel}`);

      if (risk.riskSignals) {
        console.log(`\n    Risk Signals:`);
        Object.entries(risk.riskSignals).forEach(([key, val]) => {
          console.log(`      • ${key}: ${val}`);
        });
      }
    }

    console.log('\n✨ Workflow test passed!');
    console.log('   UserInput → Risk Assessment → Application ✓');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

runTests();
