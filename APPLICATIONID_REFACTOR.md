# ApplicationID Refactor - Eliminating APP-* Duplicates

## Problem Fixed

**Before:** The system was creating duplicate DynamoDB records:
1. Frontend created `APP-*` draft records (e.g., `APP-58170515-ZI392V`)
2. Lambda created real UUID records (e.g., `f8a241d6-cebf-40db-8a75-...`)
3. Frontend polled the wrong record → stuck in "processing..." forever

**After:** Single source of truth with real UUIDs throughout the pipeline.

---

## Changes Made

### 1. Backend: New Draft Creation Endpoint
**File:** `backend/routes/application_routes.js`

Added `/api/applications/create` endpoint that:
- Generates real UUID using `uuid` package
- Creates DynamoDB draft record immediately
- Returns the UUID to frontend

```javascript
POST /api/applications/create
Body: { "districtId": "district-001" }
Response: { "applicationId": "f8a241d6-cebf-40db-8a75-...", "districtId": "district-001" }
```

### 2. Frontend: Use Backend for Draft Creation
**File:** `frontend/src/pages/citizen/SchemeAssist.jsx`

Changed `createApplicationDraft()` to:
- Call `/api/applications/create` instead of generating `APP-*` locally
- Receive real UUID from backend
- Store UUID in localStorage

### 3. Backend: Audio Upload Route
**File:** `backend/routes/document_routes.js`

Updated `/api/upload-url` to:
- Accept `applicationId` query parameter (now a UUID)
- Generate S3 key: `district-001/raw-audio/{UUID}/audio.wav`
- Update DynamoDB with processing status
- Return `applicationId` in response

### 4. Backend: Audio Result Lookup
**File:** `backend/routes/application_routes.js`

Simplified `/api/audio-result` to:
- Accept `applicationId` query parameter
- Query DynamoDB directly by `ApplicationID`
- Return `processingStatus: "ANALYZED"` when Lambda completes
- Return `transcription` and `extractedFields` from Lambda

### 5. Frontend: Recorder Polling
**File:** `frontend/src/components/AudioRecorder.jsx`

Updated polling logic to:
- Poll using `applicationId` (UUID) instead of `fileKey`
- Check for `processingStatus === "ANALYZED"` (not "completed")
- Stop polling when ANALYZED status is detected
- Call `onTranscriptReady()` with extracted data

---

## Data Flow After Refactor

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Page Load                                                │
│    → createApplicationDraft()                               │
│    → POST /api/applications/create                          │
│    → Backend generates UUID: f8a241d6-cebf-40db-8a75-...    │
│    → Backend creates DynamoDB draft record                  │
│    → Frontend receives & stores UUID                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Audio Recording                                          │
│    → GET /api/upload-url?applicationId={UUID}               │
│    → Backend generates S3 presigned URL                     │
│    → S3 Key: district-001/raw-audio/{UUID}/audio.wav        │
│    → Frontend uploads audio to S3                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Lambda Processing (triggered by S3 upload)               │
│    → Extracts ApplicationID from S3 key: key.split("/")[2]  │
│    → Transcribes audio                                      │
│    → Extracts fields with AI                                │
│    → Updates SAME DynamoDB record:                          │
│      {                                                      │
│        DistrictID: "district-001",                          │
│        ApplicationID: f8a241d6-cebf-40db-8a75-...,          │
│        ApplicationStatus: "ANALYZED",                       │
│        Transcript: "...",                                   │
│        aiAnalysis: {...}                                    │
│      }                                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend Polling                                         │
│    → GET /api/audio-result?applicationId={UUID}             │
│    → Backend queries DynamoDB by ApplicationID              │
│    → Returns processingStatus="ANALYZED"                    │
│    → Frontend detects completion                            │
│    → Displays transcript in chat                            │
└─────────────────────────────────────────────────────────────┘
```

---

## DynamoDB Structure

### Before (WRONG - Two Records)
```
Record 1 (Frontend Draft):
{
  DistrictID: "district-001",
  ApplicationID: "APP-58170515-ZI392V",     ← Frontend-generated
  processingStatus: "processing"             ← Never updated
}

Record 2 (Lambda Result):
{
  DistrictID: "district-001",
  ApplicationID: "f8a241d6-cebf-40db-8a75-...",  ← Lambda-extracted UUID
  ApplicationStatus: "ANALYZED",                  ← Real status
  Transcript: "My name is John...",
  aiAnalysis: { fullName: "John", ... }
}
```

### After (CORRECT - One Record)
```
Record 1 (Complete Lifecycle):
{
  DistrictID: "district-001",
  ApplicationID: "f8a241d6-cebf-40db-8a75-...",  ← Same UUID everywhere
  processingStatus: "draft"                       ← Initially
  → processingStatus: "processing"                ← After audio upload
  → ApplicationStatus: "ANALYZED"                 ← After Lambda
  → Transcript: "My name is John...",
  → aiAnalysis: { fullName: "John", ... }
}
```

---

## Key Benefits

✅ **No duplicate records** - One ApplicationID throughout entire lifecycle
✅ **No polling mismatch** - Frontend polls the same record Lambda updates
✅ **No endless "processing"** - Status updates are actually visible
✅ **Clean DynamoDB** - Only one row per application
✅ **Predictable S3 keys** - Lambda can reliably extract ApplicationID
✅ **Real UUIDs** - Professional, collision-free identifiers

---

## Testing Checklist

- [ ] Page load creates draft with UUID (check console logs)
- [ ] Audio upload uses UUID in S3 key
- [ ] Lambda processes audio and updates correct DynamoDB record
- [ ] Frontend polling detects ANALYZED status
- [ ] Transcript appears in chat after processing
- [ ] DynamoDB contains only ONE record per application
- [ ] No `APP-*` IDs anywhere in the system

---

## Dependencies Added

**Backend:** `uuid` package for generating ApplicationIDs
```bash
cd backend && npm install uuid
```

---

## Migration Notes

### Existing Data
Old `APP-*` draft records in DynamoDB can be safely ignored or deleted. They were never used by Lambda.

### localStorage Cleanup
Users who had `APP-*` IDs in localStorage will automatically get new UUIDs on next page load.

### No Breaking Changes
The old `/api/applications` endpoint still exists for legacy MongoDB operations if needed.
