const request = require('supertest');
const app = require('../server');

/**
 * Test the extraction API with various schemes
 */

describe('Government Scheme Extraction API', () => {
  
  test('Should extract Ayushman Bharat application data', async () => {
    const response = await request(app)
      .post('/api/extract/ayushman')
      .send({
        introText: 'My name is Rajesh Kumar. I am 45 years old male from Maharashtra, Mumbai district. My Aadhaar number is 123456789012 and mobile is 9876543210. My annual income is 50000 rupees and I have 4 family members.'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.extracted).toHaveProperty('fullName');
    expect(response.body.extracted).toHaveProperty('age');
    expect(response.body.extracted.age).toBe(45);
  });

  test('Should extract PM-KISAN application data', async () => {
    const response = await request(app)
      .post('/api/extract/pmkisan')
      .send({
        introText: 'I am Priya Sharma, 35 years old farmer from Punjab. My Aadhaar is 987654321098, mobile 8765432109. I have 2 hectares of land.'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.extracted).toHaveProperty('fullName');
    expect(response.body.extracted.fullName).toContain('Priya Sharma');
  });

  test('Should identify missing required fields', async () => {
    const response = await request(app)
      .post('/api/extract/pension')
      .send({
        introText: 'I am Lakshmi Devi, 65 years old widow.'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.missingFields).toBeDefined();
    expect(response.body.missingFields.length).toBeGreaterThan(0);
  });

  test('Should return 404 for unknown scheme', async () => {
    const response = await request(app)
      .post('/api/extract/unknown_scheme')
      .send({
        introText: 'Test text'
      });
    
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('not found');
  });

  test('Should validate Aadhaar number format', async () => {
    const response = await request(app)
      .post('/api/extract/ayushman')
      .send({
        introText: 'My name is Test User. Aadhaar: 12345 (invalid)'
      });
    
    expect(response.status).toBe(200);
    // Invalid Aadhaar should not be extracted
    expect(response.body.extracted.aadhaarNumber).toBeUndefined();
  });

});
