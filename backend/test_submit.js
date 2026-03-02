const mongoose = require('mongoose');
const Application = require('./models/application');
const UserInput = require('./models/user_input');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/gfis')
  .then(() => {
    console.log('MongoDB Connected');
    testSubmit();
  })
  .catch(err => console.log('MongoDB connection error:', err));

async function testSubmit() {
  try {
    console.log('\n=== Testing Application Submission ===\n');

    // Create a test application
    const testApp = new Application({
      applicationId: 'TEST-' + Date.now(),
      schemeId: 'ayushman',
      schemeName: 'Ayushman Bharat',
      status: 'draft',
      collectedAnswers: {
        fullName: 'Test User',
        aadhaarNumber: '123123123123',
        rationCardNumber: '123',
        familyMembers: '3',
      },
      userInputs: [],
    });

    console.log('Created test application:', testApp.applicationId);
    await testApp.save();
    console.log('✓ Application created and saved');

    // Now simulate the submit process
    console.log('\n--- Simulating Submit Process ---');

    const application = await Application.findById(testApp._id);
    console.log('Found application:', application.applicationId);

    // Update with submitted status
    application.status = 'submitted';
    application.submittedAt = new Date();

    console.log('Before save - Status:', application.status);
    await application.save();
    console.log('✓ Application saved with submitted status');

    // Verify the change
    const updated = await Application.findById(testApp._id);
    console.log('After save - Status:', updated.status);
    console.log('After save - SubmittedAt:', updated.submittedAt);

    console.log('\n✓ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error during test:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}
