# AWS Lambda Audio Processor

This Lambda function processes audio files uploaded to S3, transcribes them using AWS Transcribe, extracts structured fields, and stores results in DynamoDB.

## Architecture Flow

```
S3 Upload (district-001/raw-audio/*.wav)
    ↓
S3 Event Trigger
    ↓
Lambda Handler
    ↓
Write "processing" status to DynamoDB
    ↓
Start AWS Transcribe Job
    ↓
Poll for completion (every 5 seconds, max 5 minutes)
    ↓
Extract structured fields (name, Aadhaar, phone, etc.)
    ↓
Update DynamoDB with results
    ↓
Frontend polling retrieves results
```

## Files

- **audioProcessorLambda.js** - Main Lambda handler
- **extractFields.js** - Field extraction logic using regex patterns
- **package.json** - Dependencies

## Deployment Steps

### 1. Install Dependencies

```bash
cd backend/lambda
npm install
```

### 2. Package Lambda

```bash
npm run package
# Creates: lambda-deployment.zip
```

### 3. Create Lambda Function (AWS Console)

**AWS Console → Lambda → Create Function**

Settings:
- **Name**: `gfis-audio-processor`
- **Runtime**: Node.js 20.x
- **Architecture**: x86_64
- **Memory**: 512 MB (increase if needed)
- **Timeout**: 5 minutes (300 seconds)

**Environment Variables:**
```
AWS_REGION=ap-south-1
DYNAMODB_TABLE=GFIS_Applications
```

### 4. Upload Code

- Click "Upload from" → ".zip file"
- Select `lambda-deployment.zip`
- Click "Save"

### 5. Configure IAM Permissions

Attach execution role policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::gfis-s3-78/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-south-1:652045484460:table/GFIS_Applications"
    },
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### 6. Configure S3 Event Trigger

**S3 Console → gfis-s3-78 → Properties → Event Notifications**

**Create Event Notification:**
- **Name**: `audio-upload-trigger`
- **Event types**: `PUT` (All object create events)
- **Prefix**: `district-001/raw-audio/`
- **Suffix**: `.wav`
- **Destination**: Lambda function
- **Lambda function**: `gfis-audio-processor`

### 7. Verify DynamoDB Table Schema

Ensure your DynamoDB table has the correct schema:

**Table Name**: `GFIS_Applications`

**Primary Key:**
- **Partition Key**: `DistrictID` (String)
- **Sort Key**: `ApplicationID` (String)

**Attributes (will be created automatically):**
- `fileKey` (String) - S3 file path
- `processingStatus` (String) - "processing", "completed", "failed"
- `transcription` (String) - Transcript text
- `extractedFields` (Map) - Structured data
- `confidence` (Number) - Confidence score (0-1)
- `createdAt` (String) - ISO timestamp
- `updatedAt` (String) - ISO timestamp
- `processedAt` (String) - ISO timestamp

## Testing

### Test Lambda Directly

Create test event in Lambda console:

```json
{
  "Records": [
    {
      "s3": {
        "bucket": {
          "name": "gfis-s3-78"
        },
        "object": {
          "key": "district-001/raw-audio/test-audio.wav"
        }
      }
    }
  ]
}
```

### Test End-to-End

1. Record audio in frontend
2. Check CloudWatch Logs for Lambda execution
3. Verify DynamoDB record creation
4. Watch frontend polling update in real-time

## Monitoring

**CloudWatch Logs:**
```
/aws/lambda/gfis-audio-processor
```

**Key log messages:**
- `[LAMBDA] Audio processor started`
- `[DynamoDB] Writing processing status`
- `[TRANSCRIBE] Starting job`
- `[TRANSCRIBE] Job started`
- `[TRANSCRIBE] Poll attempt X/60`
- `[TRANSCRIBE] Transcript ready`
- `[EXTRACT] Extracted fields`
- `[DynamoDB] Results updated successfully`

## Supported Field Extraction

The Lambda automatically extracts:

- **fullName** - Person's full name
- **aadhaar** - 12-digit Aadhaar number
- **phone** - 10-digit mobile number
- **age** - Age in years
- **gender** - male/female/other
- **annualIncome** - Income amount
- **pincode** - 6-digit postal code
- **state** - Indian state name

## Language Support

Currently configured for:
- **Primary**: Hindi (hi-IN)
- **Alternative**: Change `LanguageCode` in `startTranscription()` to:
  - `en-IN` - English (India)
  - `en-US` - English (US)
  - Other AWS Transcribe supported languages

## Performance

- **Transcription time**: 5-15 seconds for 30-second audio
- **Polling interval**: 5 seconds
- **Max wait time**: 5 minutes (60 attempts)
- **Memory usage**: ~100-200 MB
- **Cold start**: ~2-3 seconds
- **Warm execution**: ~0.5 seconds (before transcription)

## Troubleshooting

### Lambda times out
- Increase timeout to 10 minutes in Lambda settings
- Check Transcribe job status in AWS Console

### No records in DynamoDB
- Check Lambda CloudWatch logs for errors
- Verify IAM permissions
- Confirm S3 event trigger is configured

### Empty transcription
- Check audio file format (must be valid WAV)
- Verify audio is not silent/corrupted
- Check Transcribe job output in S3

### Field extraction returns empty
- Review transcript text in logs
- Adjust regex patterns in extractFields.js
- Add custom patterns for your use case

## Next Steps

After successful deployment:

1. **Test with real audio** - Record and verify transcript appears
2. **Monitor costs** - Transcribe charges per second of audio
3. **Optimize extraction** - Fine-tune regex patterns
4. **Add Bedrock AI** - Replace regex with LLM for better accuracy
5. **WebSocket integration** - Replace polling with real-time updates

## Cost Estimation

AWS Transcribe pricing (as of 2026):
- Standard: $0.024 per minute
- 100 audio files/day × 30 seconds = 50 minutes/day
- Monthly cost: ~$36/month

Lambda:
- 100 invocations/day × 20 seconds average
- Minimal cost (<$1/month with free tier)

DynamoDB:
- On-demand pricing
- Write: 100 items/day = $0.125/million writes
- Read: 10,000 polls/day = $0.25/million reads
- Minimal cost (<$1/month)

**Total estimated cost**: ~$40-50/month for production usage
