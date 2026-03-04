const { extractIntroFailProof } = require('./services/intro_extractor_failproof');

(async () => {
  console.log('=== SCHEME-AWARE EXTRACTION TEST ===\n');

  // Test 1: Ayushman Bharat scheme fields
  console.log('TEST 1: Ayushman Bharat - Required fields specific to this scheme');
  const ayushmanFields = [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true, validation: { pattern: '12 digits' } },
    { name: 'age', label: 'Age', type: 'number', required: false },
    { name: 'maritalStatus', label: 'Marital Status', type: 'select', required: false, options: ['Single', 'Married', 'Divorced', 'Widowed'] },
  ];

  const ayushmanIntro = 'My name is Rajesh Kumar. My aadhaar is 1234 5678 9012. I am 35 years old and married.';
  let result = await extractIntroFailProof({ introText: ayushmanIntro, requiredFields: ayushmanFields });
  console.log('Intro:', ayushmanIntro);
  console.log('Fields to extract:', ayushmanFields.map(f => f.name).join(', '));
  console.log('Extracted:', Object.keys(result.extracted));
  console.log('Source:', result.source);
  console.log('Capture rate:', (result.captureRate * 100).toFixed(1) + '%');
  console.log('');

  // Test 2: Scholarship scheme with different fields
  console.log('TEST 2: Scholarship Scheme - Different required fields');
  const scholarshipFields = [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'mobileNumber', label: 'Mobile Number', type: 'text', required: true },
    { name: 'age', label: 'Age', type: 'number', required: true },
    { name: 'familyMembers', label: 'Family Members Count', type: 'number', required: false },
    { name: 'income', label: 'Annual Income', type: 'number', required: true },
  ];

  const scholarshipIntro = 'I am Priya Sharma. My age is 22. Mobile is 9876543210. My family has 4 members. Annual income is 250000.';
  result = await extractIntroFailProof({ introText: scholarshipIntro, requiredFields: scholarshipFields });
  console.log('Intro:', scholarshipIntro);
  console.log('Fields to extract:', scholarshipFields.map(f => f.name).join(', '));
  console.log('Extracted:', Object.keys(result.extracted));
  console.log('Source:', result.source);
  console.log('Capture rate:', (result.captureRate * 100).toFixed(1) + '%');
  console.log('');

  // Test 3: Pension scheme
  console.log('TEST 3: Pension Scheme - Age-based registration');
  const pensionFields = [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'age', label: 'Age (must be 60+)', type: 'number', required: true, validation: { min: 60, max: 120 } },
    { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
    { name: 'mobileNumber', label: 'Mobile Number', type: 'text', required: false },
  ];

  const pensionIntro = 'My name is Ramesh Singh. I am 65 years old. Aadhaar 9876 5432 1098. Contact me at 9123456789.';
  result = await extractIntroFailProof({ introText: pensionIntro, requiredFields: pensionFields });
  console.log('Intro:', pensionIntro);
  console.log('Fields to extract:', pensionFields.map(f => f.name).join(', '));
  console.log('Extracted:', Object.keys(result.extracted));
  console.log('Source:', result.source);
  console.log('Capture rate:', (result.captureRate * 100).toFixed(1) + '%');
  console.log('');

  // Test 4: Ambiguous intro (should NOT confuse fields)
  console.log('TEST 4: Ambiguous input - NO field confusion');
  const ambiguousIntro = 'I am married and my family has 3 people and I am 35 and my aadhaar is 1111 2222 3333.';
  result = await extractIntroFailProof({ introText: ambiguousIntro, requiredFields: ayushmanFields });
  console.log('Intro:', ambiguousIntro);
  console.log('Extracted maritalStatus:', result.extracted.maritalStatus, '(should be Married, NOT family count)');
  console.log('Extracted familyMembers:', result.extracted.familyMembers, '(should be undefined for Ayushman)');
  console.log('Extracted age:', result.extracted.age, '(should be 35)');
  console.log('Extracted aadhaarNumber:', result.extracted.aadhaarNumber, '(should be 111122223333)');
  console.log('');

  console.log('✅ All scheme-aware tests completed. Prompt now dynamically adapts to each scheme.');
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
