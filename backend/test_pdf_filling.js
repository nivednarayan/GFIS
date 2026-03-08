// Test script for PDF Form Filling feature
// Run with: node test_pdf_filling.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000';

// Sample user data (similar to what would be extracted from documents)
const sampleUserData = {
  name: "Raju Kumar",
  fatherName: "Vishwanath Kumar",
  age: 62,
  dateOfBirth: "15/03/1964",
  aadharNumber: "1234 5678 9012",
  gender: "Male",
  email: "raju.kumar@example.com",
  phoneNumber: "9876543210",
  mobileNo: "9876543210",
  maritalStatus: "Married",
  religion: "Hindu",
  address: "House No 123, Sector 22",
  sectorVillage: "Sector 22",
  stateUT: "Chandigarh",
  pinCode: "160022",
  yearsInChandigarh: "15",
  occupation: "Retired Teacher",
  presentFamilyIncome: "15000",
  maintainingYourself: "Pension and savings",
  pensionReceipt: "Yes",
  realEstateValue: "2000000",
  govtSecuritiesValue: "500000"
};

/**
 * Test 1: Fill a pension form with user data (using auto-generated template)
 */
async function testFillPensionForm() {
  console.log('\n=== Test 1: Fill Pension Form ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/pdf/fill`, {
      userData: sampleUserData,
      scheme: 'pension'
    }, {
      responseType: 'arraybuffer'
    });

    // Save the filled PDF
    const outputPath = path.join(__dirname, 'test_output_pension_filled.pdf');
    fs.writeFileSync(outputPath, response.data);
    
    console.log('✅ Success! Filled PDF saved to:', outputPath);
    console.log('File size:', (response.data.length / 1024).toFixed(2), 'KB');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 2: Preview a filled form
 */
async function testPreviewForm() {
  console.log('\n=== Test 2: Preview Form ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/pdf/preview`, {
      userData: {
        name: "Test User",
        age: 65,
        aadharNumber: "1111 2222 3333",
        phone: "9999888877"
      },
      scheme: 'pension'
    }, {
      responseType: 'arraybuffer'
    });

    const outputPath = path.join(__dirname, 'test_preview.pdf');
    fs.writeFileSync(outputPath, response.data);
    
    console.log('✅ Success! Preview PDF saved to:', outputPath);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 3: Get a blank test form
 */
async function testBlankForm() {
  console.log('\n=== Test 3: Download Blank Form ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/pdf/test`, {
      responseType: 'arraybuffer'
    });

    const outputPath = path.join(__dirname, 'test_blank_form.pdf');
    fs.writeFileSync(outputPath, response.data);
    
    console.log('✅ Success! Blank form saved to:', outputPath);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 4: Fill form with minimal data
 */
async function testMinimalData() {
  console.log('\n=== Test 4: Fill Form with Minimal Data ===');
  
  try {
    const minimalData = {
      name: "John Doe",
      age: 70,
      aadharNumber: "9999 8888 7777"
    };

    const response = await axios.post(`${API_BASE_URL}/api/pdf/fill`, {
      userData: minimalData,
      scheme: 'pension'
    }, {
      responseType: 'arraybuffer'
    });

    const outputPath = path.join(__dirname, 'test_minimal_data.pdf');
    fs.writeFileSync(outputPath, response.data);
    
    console.log('✅ Success! Minimal data PDF saved to:', outputPath);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 5: Error handling - empty data
 */
async function testErrorHandling() {
  console.log('\n=== Test 5: Error Handling - Empty Data ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/pdf/fill`, {
      userData: {},
      scheme: 'pension'
    });

    console.log('❌ Should have failed but got:', response.status);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected empty data with status 400');
      console.log('Error message:', error.response.data.error);
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting PDF Form Filling Tests');
  console.log('Make sure the backend server is running on', API_BASE_URL);
  
  await testFillPensionForm();
  await testPreviewForm();
  await testBlankForm();
  await testMinimalData();
  await testErrorHandling();
  
  console.log('\n✨ All tests completed!');
  console.log('Check the backend directory for generated PDF files.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testFillPensionForm,
  testPreviewForm,
  testBlankForm,
  testMinimalData,
  testErrorHandling
};
