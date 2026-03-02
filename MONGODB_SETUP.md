# MongoDB Setup & Backend Integration Guide

## ✅ What's Been Completed

### Backend Setup
- ✅ **Mongoose Models Created**:
  - `Application` - Stores application data with answers, status, and metadata
  - `User` - For user information storage
  - `UserInput` - For audit trail of each answer
  - `DocumentData` - For tracking required documents

### API Endpoints Created
- ✅ **Scheme Routes** (`/api/schemes`):
  - `GET /api/schemes` - List all available schemes
  - `GET /api/schemes/:schemeId` - Get specific scheme details
  - `GET /api/schemes/:schemeId/fields` - Get only scheme fields and requirements

- ✅ **Application Routes** (`/api/applications`):
  - `POST /api/applications` - Create new application draft
  - `POST /api/applications/:applicationId/save-answer` - Save individual answers
  - `POST /api/applications/:applicationId/submit` - Submit completed application
  - `GET /api/applications/:applicationId` - Retrieve application data
  - `GET /api/applications` - List applications with filters

### Frontend Updates
- ✅ **SchemeAssist Component** - Now fetches scheme data from backend instead of hardcoding
- ✅ **Data Persistence** - Application answers are saved to MongoDB in real-time
- ✅ **Error Handling** - Graceful fallbacks if API is unavailable

## 🚀 How to Run

### Prerequisites
- Node.js 14+ installed
- MongoDB 4.4+ running locally on `mongodb://127.0.0.1:27017`

### Start Backend
```bash
cd backend
npm install  # (Already done)
npm start
```
Expected output:
```
Server running on port 5000
MongoDB Connected
```

### Start Frontend (Development)
```bash
cd frontend
npm run dev
```
Or build for production:
```bash
npm run build
```

## 📊 Data Flow

### Creating & Submitting an Application

1. **User selects a scheme** on Apply page
   - Frontend navigates to `/citizen/apply/:schemeId`

2. **SchemeAssist component loads**:
   - Fetches scheme fields from `GET /api/schemes/:schemeId/fields`
   - Creates new application draft: `POST /api/applications` → Gets `applicationId`
   - Initializes chat with first question

3. **User answers questions**:
   - Voice input or manual typing
   - Each answer validated and saved: `POST /api/applications/:applicationId/save-answer`
   - MongoDB stores in `Application.userInputs[]` and `Application.collectedAnswers{}`

4. **User submits application**:
   - Final submit: `POST /api/applications/:applicationId/submit`
   - Status changes from "draft" to "submitted"
   - `submittedAt` timestamp recorded

5. **Application stored in MongoDB**:
   - Reference ID shows to user (e.g., "APP-61901095-SEQDMX")
   - Data persisted permanently in MongoDB

## 📋 MongoDB Collections

### `applications` Collection
```javascript
{
  _id: ObjectId,
  applicationId: "APP-61901095-SEQDMX",  // User-friendly reference
  schemeId: "pmay",
  schemeName: "Pradhan Mantri Awas Yojana",
  collectedAnswers: {
    fullName: "John Doe",
    aadhaar: "123456789012",
    ...
  },
  userInputs: [
    {
      fieldName: "fullName",
      fieldLabel: "Full Name",
      answer: "John Doe",
      answeredAt: Timestamp
    },
    ...
  ],
  documents: [],
  status: "submitted",  // draft, submitted, under_review, approved, rejected
  submittedAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `users` Collection
```javascript
{
  _id: ObjectId,
  aadhaar: "123456789012",
  fullName: "John Doe",
  email: "john@example.com",
  mobileNumber: "9876543210",
  userType: "citizen",  // citizen, officer, admin
  address: "Village, District, State",
  createdAt: Timestamp
}
```

## 🔍 Testing the API

### Test listing schemes:
```bash
curl http://localhost:5000/api/schemes
```

### Test creating an application:
```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"schemeId":"pmay"}'
```

### Test saving an answer:
```bash
curl -X POST http://localhost:5000/api/applications/APP-61901095-SEQDMX/save-answer \
  -H "Content-Type: application/json" \
  -d '{
    "fieldName":"fullName",
    "fieldLabel":"Full Name",
    "fieldType":"text",
    "answer":"John Doe"
  }'
```

### Test retrieving application:
```bash
curl http://localhost:5000/api/applications/APP-61901095-SEQDMX
```

## 🗄️ MongoDB Installation (if needed)

### Option 1: Using Windows Installer
- Download from https://www.mongodb.com/try/download/community
- Run installer, accept defaults
- MongoDB runs as Windows Service

### Option 2: Using MongoDB Atlas (Cloud)
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get connection string
- Update in `backend/app.js`:
```javascript
// Old:
mongoose.connect("mongodb://127.0.0.1:27017/gfis")

// New (with Atlas):
mongoose.connect("mongodb+srv://username:password@cluster.mongodb.net/gfis")
```

## 📱 Frontend URL
```
http://localhost:5173  (Development with Vite)
or
http://localhost:3000  (if using different port)
```

## 🔧 Environment Variables (Optional)

Create `.env` file in `backend/` directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/gfis
```

Then update `backend/app.js`:
```javascript
require('dotenv').config();
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gfis";
mongoose.connect(mongoUri)
```

## 📈 Next Steps

1. **Document Upload**: Add file upload to store documents in MongoDB
2. **Officer Review Dashboard**: Create interface for officers to review submitted applications
3. **Email Notifications**: Send confirmation emails on submission
4. **Admin Analytics**: Dashboard showing application statistics
5. **Validation Rules Engine**: Implement eligibility checks from scheme rules
6. **Multi-language Support**: Translate scheme fields and chat messages

## ✨ Current Limitations & TODOs

- [ ] Document upload not yet implemented
- [ ] Email notifications not configured
- [ ] Officer review dashboard not built
- [ ] Admin analytics dashboard not built
- [ ] Mobile-optimized document upload
- [ ] Application status tracking dashboard for citizens
- [ ] Bulk application import/export for admin

## 📞 Support

If MongoDB fails to connect:
1. Verify MongoDB is running: `mongosh` command should work
2. Check port 27017 is not blocked
3. Use MongoDB Atlas cloud version for reliable hosting
4. Check logs in `backend/app.js` for connection errors

