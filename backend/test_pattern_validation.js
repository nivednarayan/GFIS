// Test the patterns directly with the exact logic from the extractor
const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanValue = (value = "") => String(value).replace(/^[\s:,-]+|[\s:,-]+$/g, "").trim();

const FIELD_PATTERNS = {
  fullName: [
    /\bmy\s+name\s+is\s+([A-Z][a-zA-Z\s'-]{2,40})(?=\s*(?:[,.]|and|from|my|$))/i,
    /\bcall\s+me\s+([A-Z][a-zA-Z\s'-]{2,40})(?=\s*(?:[,.]|and|$))/i,
    /\b(?:this\s+is|i'm|im)\s+(?!(?:married|single|divorced|widowed))([A-Z][a-zA-Z\s'-]{2,40})(?=\s*(?:[,.]|and|$))/i,
    /\b(?:name|called|known\s+as)\s*[:=]\s*([A-Z][a-zA-Z\s'-]{2,40})(?=\s*[,.]|$)/i,
  ],
};

const intro = 'Mobile is 9123456789. Aadhaar: 9876 5432 1098. My name is Amit Patel. Age 40.';
const field = 'fullName';

console.log('Testing fullName extraction');
console.log('Input text:', intro);
console.log('Field:', field);
console.log('');

const patterns = FIELD_PATTERNS.fullName;
console.log('Number of patterns:', patterns.length);

for (let i = 0; i < patterns.length; i++) {
  const pattern = patterns[i];
  const match = intro.match(pattern);
  console.log(`Pattern ${i}:`, pattern.toString());
  if (match) {
    let value = match[1] || match[2] || "";
    console.log('  ✓ MATCHED -', match[0]);
   console.log('  Captured value:', value);
    
    if (value) {
      value = cleanValue(value);
      console.log('  After cleanValue:', value);
      
      // Check validation
      const v = String(value).trim();
      if (!/^[A-Z]/.test(v)) {
        console.log('  ✗ VALIDATION FAILED: Does not start with capital');
        continue;
      }
      if (!/[A-Za-z]{2,}/.test(v)) {
        console.log('  ✗ VALIDATION FAILED: Less than 2 letters');
        continue;
      }
      if (/\d/.test(v)) {
        console.log('  ✗ VALIDATION FAILED: Contains numbers');
        continue;
      }
      if (v.length > 40) {
        console.log('  ✗ VALIDATION FAILED: Exceeds 40 chars');
        continue;
      }
      
      const rejectedWords = [
        "married", "single", "divorced", "widowed", "old", "years", 
        "male", "female", "mr", "ms", "mrs", "dr", "sir", "madam",
        "from", "and", "the", "is", "am", "are", "was", "were",
      ];
      
      let rejected = false;
      for (const word of rejectedWords) {
        if (normalizeText(v).includes(word)) {
          console.log('  ✗ VALIDATION FAILED: Contains rejected word:', word);
          rejected = true;
          break;
        }
      }
      
      if (!rejected && v.length >= 3) {
        console.log('  ✅ VALIDATION PASSED!');
        console.log('  FINAL VALUE:', value);
        break;
      }
    } else {
      console.log('  ✗ NO VALUE CAPTURED');
    }
  } else {
    console.log('  ✗ NO MATCH');
  }
  console.log('');
}
