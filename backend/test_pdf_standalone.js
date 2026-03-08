// Standalone PDF test - doesn't require server to be running
// Tests the PDF filling service directly

const { fillPdfForm, createBlankPensionForm } = require('./services/pdfFormFiller');
const fs = require('fs');
const path = require('path');

// Sample user data
const sampleUserData = {
  name: "Raju Kumar",
  fatherName: "Vishwanath Kumar",
  age: 62,
  dateOfBirth: "15/03/1964",
  aadharNumber: "1234 5678 9012",
  gender: "Male",
  email: "raju.kumar@example.com",
  phoneNumber: "9876543210",
  maritalStatus: "Married",
  religion: "Hindu",
  address: "House No 123, Sector 22, Chandigarh",
  stateUT: "Chandigarh",
  pinCode: "160022",
  yearsInChandigarh: "15",
  occupation: "Retired Teacher",
  presentFamilyIncome: "15000"
};

async function testPdfGeneration() {
  console.log('🚀 Testing PDF Form Filling Service (Standalone)');
  console.log('================================================\n');

  try {
    // Test 1: Create a blank form
    console.log('Test 1: Creating blank pension form...');
    const blankPdfDoc = await createBlankPensionForm();
    const blankPdfBytes = await blankPdfDoc.save();
    const blankPath = path.join(__dirname, 'output_blank_form.pdf');
    fs.writeFileSync(blankPath, blankPdfBytes);
    console.log('✅ Blank form created:', blankPath);
    console.log(`   File size: ${(blankPdfBytes.length / 1024).toFixed(2)} KB\n`);

    // Test 2: Fill form with complete data
    console.log('Test 2: Filling pension form with complete data...');
    const filledPdfBytes = await fillPdfForm(sampleUserData, 'pension');
    const filledPath = path.join(__dirname, 'output_filled_pension_form.pdf');
    fs.writeFileSync(filledPath, filledPdfBytes);
    console.log('✅ Filled form created:', filledPath);
    console.log(`   File size: ${(filledPdfBytes.length / 1024).toFixed(2)} KB\n`);

    // Test 3: Fill form with minimal data
    console.log('Test 3: Filling form with minimal data...');
    const minimalData = {
      name: "John Doe",
      age: 70,
      aadharNumber: "9999 8888 7777"
    };
    const minimalPdfBytes = await fillPdfForm(minimalData, 'pension');
    const minimalPath = path.join(__dirname, 'output_minimal_data_form.pdf');
    fs.writeFileSync(minimalPath, minimalPdfBytes);
    console.log('✅ Minimal data form created:', minimalPath);
    console.log(`   File size: ${(minimalPdfBytes.length / 1024).toFixed(2)} KB\n`);

    // Test 4: Generic scheme
    console.log('Test 4: Filling generic scheme form...');
    const genericData = {
      name: "Sita Devi",
      age: 45,
      aadhar: "5555 6666 7777",
      phone: "9876543210",
      address: "Village Rampur, District XYZ",
      income: "25000"
    };
    const genericPdfBytes = await fillPdfForm(genericData, 'generic');
    const genericPath = path.join(__dirname, 'output_generic_scheme_form.pdf');
    fs.writeFileSync(genericPath, genericPdfBytes);
    console.log('✅ Generic form created:', genericPath);
    console.log(`   File size: ${(genericPdfBytes.length / 1024).toFixed(2)} KB\n`);

    console.log('================================================');
    console.log('✨ All tests passed successfully!');
    console.log('\nGenerated files:');
    console.log('  - output_blank_form.pdf');
    console.log('  - output_filled_pension_form.pdf');
    console.log('  - output_minimal_data_form.pdf');
    console.log('  - output_generic_scheme_form.pdf');
    console.log('\n📝 Open these files to verify the PDF generation works correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  testPdfGeneration();
}

module.exports = { testPdfGeneration };
