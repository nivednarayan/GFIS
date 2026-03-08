# Testing Guide - ApplicationID Refactor

## Quick Verification Steps

### 1. Test Draft Creation
**Expected:** Backend creates UUID, not APP-*

```bash
# Open browser console on SchemeAssist page
# Should see:
[APP] Draft created with real UUID: f8a241d6-cebf-40db-8a75-...

# Verify in DynamoDB:
# DistrictID: district-001
# ApplicationID: f8a241d6-cebf-40db-8a75-... (NOT APP-*)
# processingStatus: draft
```

### 2. Test Audio Upload
**Expected:** S3 key contains UUID

```bash
# After recording audio, check console:
[AUDIO-RECORDER] Audio uploaded successfully. FileKey: district-001/raw-audio/f8a241d6-cebf-40db-8a75-.../1234567890.wav

# Verify in S3:
# Bucket: your-bucket
# Key: district-001/raw-audio/{UUID}/audio.wav

# Verify in DynamoDB:
# processingStatus should change to: processing
```

### 3. Test Lambda Processing
**Expected:** Lambda updates the SAME record

```bash
# Lambda should:
# 1. Extract ApplicationID from S3 key: key.split("/")[2]
# 2. Update DynamoDB with ApplicationStatus: "ANALYZED"

# Verify in DynamoDB:
# ApplicationID: f8a241d6-cebf-40db-8a75-... (SAME as draft)
# ApplicationStatus: ANALYZED
# Transcript: "My name is..."
# aiAnalysis: { fullName: "...", ... }
```

### 4. Test Frontend Polling
**Expected:** Frontend detects ANALYZED status

```bash
# Browser console should show:
[AUDIO-RECORDER] Poll result - Status: processing
[AUDIO-RECORDER] Poll result - Status: processing
[AUDIO-RECORDER] Poll result - Status: ANALYZED
[AUDIO-RECORDER] Audio processing completed!
[AUDIO-RECORDER] Transcription: My name is John...
[AUDIO-RECORDER] Extracted fields: { fullName: "John", ... }
[AUDIO-RECORDER] Calling onTranscriptReady callback

# UI should:
# - Stop showing "Processing..."
# - Display transcript in chat
# - Auto-populate fields
```

### 5. Verify No Duplicates
**Expected:** Only ONE record in DynamoDB per application

```bash
# Query DynamoDB for DistrictID: district-001
# Should see only ONE record per application
# ApplicationID should be UUID, not APP-*

# NO duplicate records like:
# ❌ APP-58170515-ZI392V (processingStatus: processing)
# ❌ f8a241d6-... (ApplicationStatus: ANALYZED)

# ONLY one record:
# ✅ f8a241d6-... (ApplicationStatus: ANALYZED)
```

---

## Manual Testing Flow

### Step-by-Step Test

1. **Clear localStorage**
   ```javascript
   localStorage.clear();
   ```

2. **Open SchemeAssist page**
   - Navigate to `/citizen/scheme-assist/pmkisan`
   - Check console for: `[APP] Draft created with real UUID: ...`

3. **Check DynamoDB**
   - Query: `DistrictID = district-001`
   - Verify: `ApplicationID` is a UUID (not APP-*)
   - Verify: `processingStatus = "draft"`

4. **Record audio**
   - Click microphone button
   - Speak: "My name is John Smith, my Aadhaar is 123456789012"
   - Click stop

5. **Monitor console during upload**
   ```
   [AUDIO-RECORDER] Audio uploaded successfully. FileKey: district-001/raw-audio/{UUID}/...
   [AUDIO-RECORDER] Starting to poll for result of applicationId: {UUID}
   [AUDIO-RECORDER] Poll result - Status: processing
   ```

6. **Wait for Lambda processing** (30-60 seconds)
   - Console should show status changing to ANALYZED
   - Transcript should appear in chat

7. **Verify DynamoDB final state**
   - Same `ApplicationID` as initial draft
   - `ApplicationStatus = "ANALYZED"`
   - `Transcript` field populated
   - `aiAnalysis` field populated

8. **Verify NO duplicate records**
   - Only ONE record for this application
   - No `APP-*` records

---

## Troubleshooting

### Issue: Frontend shows "processing..." forever

**Check:**
1. Does DynamoDB have the record with correct UUID?
   ```
   GET DistrictID=district-001, ApplicationID={UUID}
   ```

2. Is frontend polling the correct UUID?
   ```javascript
   // In browser console:
   console.log(applicationId); // Should be UUID, not APP-*
   ```

3. Did Lambda update the record?
   ```
   ApplicationStatus should be ANALYZED
   Transcript should exist
   ```

### Issue: Lambda can't find ApplicationID

**Check:**
1. S3 key format:
   ```
   ✅ district-001/raw-audio/{UUID}/audio.wav
   ❌ district-001/raw-audio/APP-*/audio.wav
   ```

2. Lambda extraction logic:
   ```javascript
   const applicationId = key.split("/")[2]; // Should be UUID
   ```

### Issue: Multiple records in DynamoDB

**Check:**
1. Is frontend calling `/api/applications/create`?
   ```javascript
   // Should call:
   POST /api/applications/create
   
   // NOT:
   Generating APP-* locally
   ```

2. Is Lambda using the UUID from S3 key?
   ```javascript
   // Lambda should extract from:
   key.split("/")[2]
   
   // NOT generate new UUID
   ```

---

## Success Criteria

✅ Only ONE DynamoDB record per application
✅ ApplicationID is UUID format (not APP-*)
✅ Frontend polls correct record
✅ Lambda updates correct record
✅ Transcript appears in chat after processing
✅ No "processing..." stuck state
✅ S3 keys contain UUID
✅ Console logs show UUID throughout pipeline
