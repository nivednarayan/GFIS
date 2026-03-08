# PDF Form Filling Feature

## Overview
The PDF Form Filling feature allows GFIS to automatically fill government scheme application forms (like pension, PM-KISAN, etc.) with extracted user data and generate a downloadable/printable PDF.

## Features
- ✅ Auto-fill PDF forms with extracted user data
- ✅ Support for multiple schemes (Pension, PM-KISAN, Ayushman, etc.)
- ✅ Upload custom PDF templates
- ✅ Generate pre-filled forms ready for printing
- ✅ Preview filled forms before download
- ✅ Interactive PDF form field support

## API Endpoints

### 1. Fill PDF Form
**POST** `/api/pdf/fill`

Fills a PDF form with user data and returns a downloadable PDF.

**Request Body (JSON):**
```json
{
  "userData": {
    "name": "Raju Kumar",
    "age": 62,
    "aadharNumber": "1234 5678 9012",
    "fatherName": "Vishwanath Kumar",
    "dateOfBirth": "15/03/1964",
    "gender": "Male",
    "email": "raju.kumar@example.com",
    "phoneNumber": "9876543210",
    "maritalStatus": "Married",
    "religion": "Hindu",
    "address": "House No 123, Sector 22, Chandigarh",
    "stateUT": "Chandigarh",
    "pinCode": "160022",
    "income": "15000",
    "occupation": "Retired Teacher"
  },
  "scheme": "pension"
}
```

**Optional - Upload Custom Template (multipart/form-data):**
```
POST /api/pdf/fill
Content-Type: multipart/form-data

template: [PDF file]
userData: [JSON string]
scheme: pension
```

**Response:**
- Content-Type: `application/pdf`
- Returns filled PDF file for download

**Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/pdf/fill \
  -H "Content-Type: application/json" \
  -d '{
    "userData": {
      "name": "Raju Kumar",
      "age": 62,
      "aadharNumber": "1234567890"
    },
    "scheme": "pension"
  }' \
  --output filled_form.pdf
```

### 2. Preview PDF Form
**POST** `/api/pdf/preview`

Same as `/fill` but displays the PDF inline for preview instead of downloading.

**Usage:** Same as `/fill` endpoint

### 3. Fill Interactive PDF Form
**POST** `/api/pdf/fill-interactive`

Fills a PDF that has interactive form fields (requires custom PDF template).

**Request (multipart/form-data):**
```
template: [PDF file with form fields]
userData: {"name": "John", "age": 65, ...}
fieldMapping: {"name": "ApplicantName", "age": "ApplicantAge", ...}
```

**Field Mapping:** Maps your data keys to the actual field names in the PDF template.

### 4. Get Blank Test Form
**GET** `/api/pdf/test`

Downloads a blank pension form template for testing.

**Example:**
```bash
curl http://localhost:5000/api/pdf/test --output blank_form.pdf
```

## Supported Schemes

### Pension Scheme
Fields supported:
- Applicant's Name
- Father's/Husband's Name
- Date of Birth
- Aadhaar No.
- Gender
- Email
- Mobile No.
- Marital Status
- Religion
- Address (Current & Permanent)
- Pin Code
- Income Details
- Occupation
- Property Details

### Generic Scheme
Basic fields for other schemes:
- Name
- Age
- Aadhaar
- Phone
- Email
- Address
- Income

## Integration with GFIS Backend

### From Text/Voice Input
```javascript
// Extract data from user input
const response = await fetch('http://localhost:5000/api/input/text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rawText: "My name is Raju and I am 62 years old..."
  })
});

const { extractedData } = await response.json();

// Fill PDF with extracted data
const pdfResponse = await fetch('http://localhost:5000/api/pdf/fill', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userData: extractedData,
    scheme: 'pension'
  })
});

const pdfBlob = await pdfResponse.blob();
// Download or display the filled PDF
```

### From Document Upload
```javascript
// Extract data from uploaded documents
const formData = new FormData();
formData.append('file', uploadedFile);

const extractResponse = await fetch('http://localhost:5000/api/documents/extract', {
  method: 'POST',
  body: formData
});

const { extractedData } = await extractResponse.json();

// Fill PDF
const pdfResponse = await fetch('http://localhost:5000/api/pdf/fill', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userData: extractedData,
    scheme: extractedData.scheme || 'pension'
  })
});
```

## Frontend Integration Example

### React Component
```jsx
import React, { useState } from 'react';

function PdfFormFiller({ userData, scheme = 'pension' }) {
  const [loading, setLoading] = useState(false);

  const handleFillForm = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/pdf/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, scheme })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scheme}_application_${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error filling PDF:', error);
      alert('Failed to generate PDF form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleFillForm} disabled={loading}>
      {loading ? 'Generating PDF...' : 'Download Filled PDF Form'}
    </button>
  );
}
```

### Browser Extension Integration
```javascript
// In popup.js
async function downloadFilledPDF(extractedData) {
  try {
    const response = await fetch('http://localhost:5000/api/pdf/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userData: extractedData,
        scheme: 'pension'
      })
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Download via Chrome downloads API
    chrome.downloads.download({
      url: url,
      filename: `pension_form_${Date.now()}.pdf`,
      saveAs: true
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
  }
}
```

## Testing

Run the test script:
```bash
cd backend
node test_pdf_filling.js
```

This will:
1. Generate a filled pension form with sample data
2. Test preview functionality
3. Download a blank form template
4. Test with minimal data
5. Test error handling

Test files will be saved in the `backend/` directory with names like:
- `test_output_pension_filled.pdf`
- `test_preview.pdf`
- `test_blank_form.pdf`

## How It Works

1. **Data Mapping**: User data is mapped to form field positions/names
2. **PDF Generation**: Either:
   - Uses an uploaded PDF template, or
   - Creates a new PDF from scratch based on the scheme
3. **Field Filling**: Fills text fields at specified coordinates or using interactive form fields
4. **Output**: Returns the filled PDF as a buffer/stream

## Field Mapping

The system uses intelligent field mapping that recognizes various field name variations:

```javascript
// These all map to the same field:
userData.phoneNumber
userData.mobileNo
userData.phone
userData.mobile

// Aadhaar variations:
userData.aadharNumber
userData.aadhaarNumber
userData.aadhar
userData.aadhaar
```

## Adding Support for New Schemes

1. Add field mapping in `services/pdfFormFiller.js`:
```javascript
const NEW_SCHEME_FIELD_MAPPING = {
  fieldName: { x: 180, y: 745, fontSize: 10 },
  // ... more fields
};
```

2. Update the `mapDataToFormFields` function to handle your scheme

3. Test with your scheme-specific data

## Limitations

- Current implementation draws text at fixed coordinates (works for consistent forms)
- For complex forms with tables/checkboxes, you may need to upload an interactive PDF template
- Maximum file upload size: 10MB
- Only supports PDF format

## Future Enhancements

- [ ] Support for checkboxes and radio buttons
- [ ] Table/grid filling for family member details
- [ ] Signature embedding
- [ ] Photo embedding
- [ ] Multi-page complex forms
- [ ] QR code generation for verification
- [ ] Digital signature support
- [ ] Batch processing (fill multiple forms)
- [ ] Form validation before filling

## Dependencies

- **pdf-lib**: PDF creation and manipulation
- **multer**: File upload handling

## Security Considerations

- Always validate and sanitize user input
- Set appropriate file size limits
- Validate PDF templates before processing
- Don't store sensitive data in logs
- Use HTTPS in production
- Implement rate limiting for API endpoints

## Troubleshooting

### "Only PDF files are allowed"
- Ensure you're uploading a valid PDF file
- Check the file mimetype

### "Failed to fill PDF form"
- Check that userData contains valid data
- Verify the scheme name is correct
- Check backend logs for detailed error messages

### Fields not filling correctly
- Verify field names in your PDF template
- Use `/api/pdf/test` to see field positions
- Check console logs for field mapping warnings

## Support

For issues or questions, check:
- Backend logs: `console` output when running the server
- Test script output: Run `test_pdf_filling.js`
- API response error messages
