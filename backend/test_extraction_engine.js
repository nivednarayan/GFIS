/**
 * Quick Test Script for Government Scheme Extraction Engine
 * Run this to verify the system is working correctly
 */

const testCases = [
  {
    scheme: 'ayushman',
    name: 'Ayushman Bharat - Complete Data',
    introText: 'My name is Rajesh Kumar. I am 45 years old male from Maharashtra, Mumbai district. My Aadhaar number is 123456789012 and mobile is 9876543210. My annual income is 50000 rupees and I have 4 family members.'
  },
  {
    scheme: 'pmkisan',
    name: 'PM-KISAN - Farmer Application',
    introText: 'I am Priya Sharma, 35 years old female farmer from Punjab, Ludhiana. My Aadhaar is 987654321098, mobile 8765432109. I have agricultural land.'
  },
  {
    scheme: 'pension',
    name: 'Pension - Widow Application',
    introText: 'My name is Kamala Devi, 67 year old widow from Karnataka, Bangalore. Mobile 7345678901, Aadhaar 456789012345. My income is 20000 per year.'
  },
  {
    scheme: 'ayushman',
    name: 'Partial Data - Testing Missing Fields',
    introText: 'I am Amit Verma, 28 years old from Delhi. My mobile is 9123456789.'
  }
];

async function runTests() {
  console.log('\n🧪 Testing Government Scheme Extraction Engine\n');
  console.log('='.repeat(70));
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Scheme: ${testCase.scheme}`);
    console.log(`   Input: ${testCase.introText.substring(0, 80)}...`);
    
    try {
      const response = await fetch(`http://localhost:5000/api/extract/${testCase.scheme}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ introText: testCase.introText })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Status: ${response.status} OK`);
        console.log(`   📊 Source: ${result.source}`);
        console.log(`   📈 Completeness: ${result.completeness}`);
        console.log(`   ✓ Extracted ${result.extractedCount}/${result.totalRequired} fields`);
        console.log(`   📝 Fields: ${Object.keys(result.extracted).join(', ')}`);
        
        if (result.missingFields.length > 0) {
          console.log(`   ⚠️  Missing: ${result.missingFields.map(f => f.name).join(', ')}`);
        }
      } else {
        console.log(`   ❌ Status: ${response.status} ERROR`);
        console.log(`   Error: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
      console.log(`   💡 Make sure the server is running: node server.js`);
    }
    
    console.log('-'.repeat(70));
  }
  
  console.log('\n✨ Testing complete!\n');
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:5000/health');
    if (response.ok) {
      console.log('✅ Server is running!\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running!');
    console.log('💡 Start the server first: node server.js');
    console.log('   Or run: npm run extract-server\n');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
})();
