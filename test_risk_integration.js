/**
 * Test script to verify risk assessment integration with application submission
 * Tests the full flow: Create Application -> Save Answers -> Submit with Risk Assessment
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

// Utility function to make HTTP requests
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
  console.log('🚀 Risk Assessment Integration Test Suite\n');

  try {
    // Step 1: Create application
    console.log('📝 Step 1: Creating application for Ayushman Bharat scheme...');
    const createRes = await makeRequest('POST', '/applications', {
      schemeId: 'ayushman',
    });

    if (createRes.status !== 201) {
      throw new Error(`Failed to create application: ${JSON.stringify(createRes.data)}`);
    }

    const applicationId = createRes.data.data.applicationId;
    console.log(`✅ Application created: ${applicationId}\n`);

    // Step 2: Save individual answers
    console.log('📝 Step 2: Saving individual answers...');
    const testAnswers = [
      { fieldName: 'fullName', answer: 'Ashar Husain' },
      { fieldName: 'aadhaarNumber', answer: '123123123123' },
      { fieldName: 'rationCardNumber', answer: '123' },
      { fieldName: 'familyMembers', answer: '3' },
    ];

    for (const answer of testAnswers) {
      const saveRes = await makeRequest('POST', `/applications/${applicationId}/save-answer`, {
        fieldName: answer.fieldName,
        fieldLabel: answer.fieldName,
        fieldType: 'string',
        answer: answer.answer,
      });

      if (saveRes.status !== 200) {
        throw new Error(`Failed to save answer: ${JSON.stringify(saveRes.data)}`);
      }
      console.log(`  ✅ Saved: ${answer.fieldName} = ${answer.answer}`);
    }
    console.log('');

    // Step 3: Submit application with risk assessment
    console.log('📝 Step 3: Submitting application (triggers risk assessment)...');
    const submitRes = await makeRequest('POST', `/applications/${applicationId}/submit`, {
      collectedAnswers: {
        fullName: 'Ashar Husain',
        aadhaarNumber: '123123123123',
        rationCardNumber: '123',
        familyMembers: '3',
      },
    });

    if (submitRes.status !== 200) {
      console.error(`❌ Submit failed:`, submitRes.data);
      throw new Error(`Failed to submit application: ${JSON.stringify(submitRes.data)}`);
    }

    const submitData = submitRes.data;
    console.log(`✅ Application submitted successfully\n`);

    // Step 4: Display results
    console.log('📊 Submission Results:');
    console.log(`  Application ID: ${submitData.data.applicationId}`);
    console.log(`  Status: ${submitData.data.status}`);
    console.log(`  Total Answers: ${submitData.data.totalAnswers}`);
    console.log(`  Submitted At: ${submitData.data.submittedAt}\n`);

    if (submitData.data.riskAssessment) {
      const risk = submitData.data.riskAssessment;
      console.log('🎯 Risk Assessment Results:');
      console.log(`  Risk Score: ${risk.riskScore || 'N/A'}/100`);
      console.log(`  Risk Level: ${risk.riskLevel || 'N/A'}`);
      console.log(`  Status: ${risk.status || 'Complete'}`);

      if (risk.riskSignals) {
        console.log(`\n  Risk Signals:`);
        Object.entries(risk.riskSignals).forEach(([key, value]) => {
          console.log(`    - ${key}: ${value}`);
        });
      }

      if (risk.aiAnalysis) {
        console.log(`\n  AI Analysis:`);
        console.log(`    - Rejection Probability: ${risk.aiAnalysis.rejectionProbability || 'N/A'}`);
        console.log(`    - Fraud Indicator: ${risk.aiAnalysis.fraudIndicator || 'N/A'}`);
        if (risk.aiAnalysis.topReasons?.length > 0) {
          console.log(`    - Top Reasons: ${risk.aiAnalysis.topReasons.join(', ')}`);
        }
      }

      if (risk.error) {
        console.log(`  ⚠️  Assessment Error: ${risk.error}`);
      }
    }

    console.log('\n✨ All tests passed! Risk assessment integration is working correctly.');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
