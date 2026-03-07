const { extractIntroFailProof } = require('./services/intro_extractor_failproof');

(async () => {
  const intro = 'Mobile is 9123456789. Aadhaar: 9876 5432 1098. My name is Amit Patel. Age 40.';
  const required = ['fullName', 'age', 'aadhaarNumber', 'mobileNumber'];
  
  const result = await extractIntroFailProof({ introText: intro, requiredFields: required });
  
  console.log('=== DEBUG FULL OUTPUT ===');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n=== FIELD BY FIELD ===');
  required.forEach(field => {
    const found = result.extracted[field];
    console.log(field + ':', found ? 'FOUND: ' + found : 'NOT FOUND');
  });
})();
