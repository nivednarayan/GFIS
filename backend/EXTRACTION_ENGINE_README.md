# Government Scheme Smart Application Engine - Setup Guide

## 📋 Overview

This backend system extracts structured user data from free text for Indian government scheme applications using a hybrid approach (Gemini LLM + Regex fallback).

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install express cors @google/generative-ai dotenv
npm install --save-dev nodemon supertest jest
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# Get your key from: https://makersuite.google.com/app/apikey
```

**Required in `.env`:**
```
GEMINI_API_KEY=your_actual_gemini_api_key
PORT=5000
NODE_ENV=development
```

### 3. Start the Server

```bash
# Production mode
node server.js

# Development mode with auto-reload
npx nodemon server.js
```

Server will start on `http://localhost:5000`

## 📡 API Usage

### Endpoint

```
POST /api/extract/:scheme
```

**Available schemes:**
- `ayushman` - Ayushman Bharat Health Scheme
- `pmkisan` - PM-KISAN Farmer Support
- `pension` - Widow/Old Age Pension

### Request Format

```json
{
  "introText": "My name is Rajesh Kumar. I am 45 years old from Mumbai, Maharashtra. My Aadhaar is 123456789012 and mobile number is 9876543210."
}
```

### Response Format

```json
{
  "scheme": "ayushman",
  "source": "gemini",
  "extracted": {
    "fullName": "Rajesh Kumar",
    "age": 45,
    "state": "Maharashtra",
    "district": "Mumbai",
    "aadhaarNumber": "123456789012",
    "mobileNumber": "9876543210"
  },
  "missingFields": [
    {
      "name": "gender",
      "label": "Gender",
      "type": "select"
    },
    {
      "name": "annualIncome",
      "label": "Annual Income",
      "type": "number"
    }
  ],
  "totalRequired": 8,
  "extractedCount": 6,
  "completeness": "75%"
}
```

## 🧪 Testing with cURL

### Test Ayushman Bharat Extraction

```bash
curl -X POST http://localhost:5000/api/extract/ayushman \
  -H "Content-Type: application/json" \
  -d '{
    "introText": "My name is Amit Patel. I am 38 years old male from Gujarat, Ahmedabad. My Aadhaar is 234567890123, mobile 9123456789, and annual income is 75000 rupees. I have 5 family members."
  }'
```

### Test PM-KISAN Extraction

```bash
curl -X POST http://localhost:5000/api/extract/pmkisan \
  -H "Content-Type: application/json" \
  -d '{
    "introText": "I am Sunita Sharma, 42 years from Punjab, Ludhiana district. Aadhaar: 345678901234, mobile: 8234567890. I am a farmer with 3 hectares land."
  }'
```

### Test Pension Extraction

```bash
curl -X POST http://localhost:5000/api/extract/pension \
  -H "Content-Type: application/json" \
  -d '{
    "introText": "My name is Kamala Devi, 67 year old widow from Karnataka, Bangalore. Mobile 7345678901, Aadhaar 456789012345. Income is 20000 per year."
  }'
```

### Health Check

```bash
curl http://localhost:5000/health
```

## 📁 Project Structure

```
backend/
├── server.js                      # Express app entry point
├── .env                           # Environment configuration
├── routes/
│   └── extractRoute.js            # Extraction API route handler
├── services/
│   ├── geminiExtractor.js         # Google Gemini LLM extraction
│   └── patternExtractor.js        # Regex fallback extraction
├── schemas/
│   ├── ayushmanSchema.js          # Ayushman Bharat field definition
│   ├── pmkisanSchema.js           # PM-KISAN field definition
│   └── pensionSchema.js           # Pension scheme field definition
├── validation/
│   └── validateFields.js          # Field type validation
├── utils/
│   └── findMissingFields.js       # Missing field detector
└── tests/
    └── test_extraction_api.js     # API integration tests
```

## 🔧 How It Works

### 1. Hybrid Extraction Flow

```
User Text Input
      ↓
[Try Gemini LLM]
      ↓
   Success? → Extract fields → Validate
      ↓ No
[Fallback to Regex Patterns]
      ↓
Extract fields → Validate
      ↓
Find Missing Fields
      ↓
Return Response
```

### 2. Validation Rules

- **Aadhaar**: Exactly 12 digits
- **Mobile**: 10 digits starting with 6-9
- **Age**: 0-120 years
- **Name**: Must have at least 2 words, no status words
- **Income**: Numeric, max 10 crore
- **Gender**: male/female only
- **Marital Status**: single/married/widowed/divorced

### 3. Supported Fields

- `fullName` - Full name (minimum 2 words)
- `age` - Age in years (numeric)
- `gender` - male or female
- `mobileNumber` - 10-digit Indian mobile
- `aadhaarNumber` - 12-digit Aadhaar
- `annualIncome` - Yearly income (numeric)
- `state` - Indian state name
- `district` - District name
- `maritalStatus` - Marital status (enum)
- `familyMembers` - Number of family members

## 🎯 Key Features

✅ **Multi-scheme support**: Easily add new schemes by creating schema files
✅ **Hybrid extraction**: Gemini LLM primary, regex fallback
✅ **Smart validation**: Prevents field confusion (age ≠ income, name ≠ status)
✅ **Missing field detection**: Identifies what data is still needed
✅ **Fail-proof**: Works even when API quota is exhausted
✅ **Type-safe**: Strict validation for Aadhaar, mobile, etc.

## 🛠️ Adding a New Scheme

Create a new schema file in `schemas/`:

```javascript
// schemas/newSchemeSchema.js
const requiredFields = [
  {
    name: 'fullName',
    label: 'Full Name',
    type: 'text',
    required: true,
    validation: {
      pattern: '^[A-Za-z]+(\\s+[A-Za-z]+)+$'
    }
  },
  // ... add more fields
];

const schemeInfo = {
  name: 'New Scheme Name',
  description: 'Scheme description',
  eligibility: 'Who can apply',
  benefits: 'What benefits provided'
};

module.exports = { requiredFields, schemeInfo };
```

Then access via: `POST /api/extract/newScheme`

## 🐛 Troubleshooting

### "GEMINI_API_KEY not configured"
- Ensure `.env` file exists in `backend/` directory
- Verify `GEMINI_API_KEY=your_key` is set correctly
- Restart the server after changing `.env`

### "Gemini API quota exceeded"
- The system automatically falls back to regex patterns
- Response will show `"source": "pattern-fallback"`
- Wait for quota reset or upgrade API plan

### "Scheme not found"
- Check that the scheme name matches the schema filename
- `ayushman` → `ayushmanSchema.js`
- `pmkisan` → `pmkisanSchema.js`
- Scheme names are case-sensitive

## 📊 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

## 🔒 Security Notes

- Never commit `.env` file to version control
- Use environment variables for all sensitive keys
- Implement rate limiting in production
- Add authentication middleware for production deployment

## 📝 Example Response Analysis

**High Confidence (90-100%)**:
```json
{
  "source": "gemini",
  "completeness": "100%"
}
```
→ All required fields extracted via Gemini

**Partial Extraction (50-89%)**:
```json
{
  "source": "pattern-fallback",
  "completeness": "75%"
}
```
→ Some fields found via regex patterns

**Low Extraction (<50%)**:
```json
{
  "source": "pattern-fallback",
  "completeness": "25%",
  "missingFields": [...]
}
```
→ Prompt user to provide missing information

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name govt-scheme-engine
   ```
3. Configure nginx reverse proxy
4. Set up SSL certificate
5. Implement rate limiting
6. Add monitoring and logging

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review the API response for error messages
- Ensure all dependencies are installed
- Verify environment variables are set correctly

---

**Ready to run!** Execute `node server.js` and start extracting government scheme data! 🎉
