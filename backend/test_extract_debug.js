const { extractWithHighConfidencePatterns } = require('./services/intro_extractor_failproof');

const intro = 'Mobile is 9123456789. Aadhaar: 9876 5432 1098. My name is Amit Patel. Age 40.';
const required = ['fullName', 'age', 'aadhaarNumber', 'mobileNumber'];

// Direct test of extraction function
const result = extractWithHighConfidencePatterns(intro, required);
console.log('Extracted fields:', Object.keys(result));
console.log('Full result:', JSON.stringify(result, null, 2));
