/**
 * Test comprehensive extraction for pension scheme
 */

const { extractIntroHybrid } = require('./services/intro_extractor_failproof');

// Simulate pension scheme required fields
const pensionFields = [
  { name: 'fullName', label: 'Full Name', type: 'text', required: true },
  { name: 'age', label: 'Age', type: 'number', required: true },
  { name: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female'] },
  { name: 'maritalStatus', label: 'Marital Status', type: 'select', required: true, options: ['Single', 'Married', 'Divorced', 'Widowed'] },
  { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
  { name: 'mobileNumber', label: 'Mobile Number', type: 'text', required: true },
  { name: 'annualIncome', label: 'Annual Income', type: 'number', required: true },
];

async function testExtraction() {
  console.log('\\n🧪 Testing Comprehensive Extraction for Pension Scheme\\n');
  console.log('='.repeat(70));

  const testCases = [
    {
      name: 'Pension - married man, 50 years',
      introText: 'I an a married man, i am 50 years old',
      expectedFields: ['age', 'maritalStatus', 'gender']
    },
    {
      name: 'Pension - widow with all details',
      introText: 'My name is Kamala Devi, 67 year old widow woman from Karnataka. Mobile 7345678901, Aadhaar 456789012345. My income is 20000 per year.',
      expectedFields: ['fullName', 'age', 'maritalStatus', 'gender', 'mobileNumber', 'aadhaarNumber', 'annualIncome']
    },
    {
      name: 'Pension - male with partial info',
      introText: 'I am Rajesh Kumar, 65 years old male. Aadhaar is 123456789012.',
      expectedFields: ['fullName', 'age', 'gender', 'aadhaarNumber']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\\n📝 Test: ${testCase.name}`);
    console.log(`Input: "${testCase.introText}"\\n`);

    try {
      const result = await extractIntroHybrid({
        introText: testCase.introText,
        requiredFields: pensionFields
      });

      console.log(`✅ Extraction completed!`);
      console.log(`📊 Source: ${result.source}`);
      console.log(`📈 Capture Rate: ${Math.round(result.captureRate * 100)}%`);
      console.log(`\\n🔍 Extracted Fields:`);
      
      Object.entries(result.extracted).forEach(([key, value]) => {
        const emoji = testCase.expectedFields.includes(key) ? '✓' : '?';
        console.log(`   ${emoji} ${key}: ${value}`);
      });

      if (result.extracted && Object.keys(result.extracted).length > 0) {
        const missing = testCase.expectedFields.filter(f => !result.extracted[f]);
        if (missing.length > 0) {
          console.log(`\\n⚠️  Expected but not extracted: ${missing.join(', ')}`);
        } else {
          console.log(`\\n🎉 All expected fields extracted!`);
        }
      } else {
        console.log(`\\n❌ No fields extracted!`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log('-'.repeat(70));
  }

  console.log('\\n✨ Testing complete!\\n');
}

testExtraction();
