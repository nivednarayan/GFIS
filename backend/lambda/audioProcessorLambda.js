/**
 * AWS Lambda Handler for Audio Processing Pipeline
 * 
 * Triggered by S3 PutObject events
 * Workflow:
 * 1. Write "processing" status to DynamoDB
 * 2. Start AWS Transcribe job
 * 3. Poll for transcription completion
 * 4. Extract structured fields from transcript
 * 5. Update DynamoDB with results
 * 
 * @module audioProcessorLambda
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { 
  TranscribeClient, 
  StartTranscriptionJobCommand, 
  GetTranscriptionJobCommand 
} = require('@aws-sdk/client-transcribe');
const { extractFieldsFromTranscript, calculateConfidence } = require('./extractFields');

// Initialize AWS SDK v3 clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'GFIS_Applications';
const MAX_TRANSCRIBE_POLL_ATTEMPTS = 60; // 60 attempts * 5 seconds = 5 minutes max
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

/**
 * Sleep utility for polling
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main Lambda handler
 * Triggered by S3 PutObject event
 */
exports.handler = async (event) => {
  console.log('[LAMBDA] Audio processor started');
  console.log('[LAMBDA] Event:', JSON.stringify(event, null, 2));

  try {
    // Extract S3 event details
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Defensive guard: ignore invalid legacy/non-canonical prefixes
    if (key.startsWith('APP/')) {
      console.error('Invalid S3 key prefix detected:', key);
      return {
        statusCode: 202,
        body: JSON.stringify({
          success: false,
          ignored: true,
          reason: 'Invalid S3 key prefix',
          key,
        }),
      };
    }

    console.log(`[LAMBDA] Processing audio file: s3://${bucket}/${key}`);

    // Canonical key format (must not change):
    // district-001/raw-audio/{applicationId}/{timestamp}-{random}.wav
    const keyParts = key.split('/');
    const districtId = keyParts[0];
    const applicationId = keyParts[2];
    const isCanonical =
      keyParts.length >= 4 &&
      keyParts[1] === 'raw-audio' &&
      typeof applicationId === 'string' &&
      key.toLowerCase().endsWith('.wav');

    if (!isCanonical) {
      throw new Error(`Invalid file key format. Expected: district-XXX/raw-audio/{applicationId}/file.wav, got: ${key}`);
    }
    const timestamp = new Date().toISOString();

    console.log(`[LAMBDA] DistrictID: ${districtId}, ApplicationID: ${applicationId}`);

    // Step 1: Write initial "processing" record to DynamoDB
    await writeProcessingStatus(districtId, applicationId, key, 'processing', timestamp);

    // Transcribe job names allow: letters, digits, hyphens, underscores, periods (max 200 chars).
    // We embed the full applicationId after a fixed prefix so downstream Lambdas can recover it:
    //   Lambda 2 recovery: jobName.replace(/^gfis-\d+-/, '') → original applicationId
    const safeAppId = applicationId.replace(/[^a-zA-Z0-9_-]/g, '-');
    const transcriptionJobName = `gfis-${Date.now()}-${safeAppId}`;
    const transcriptUri = await startTranscription(bucket, key, transcriptionJobName);

    // Step 3: Poll for transcription completion
    const transcript = await pollTranscriptionJob(transcriptionJobName);

    if (!transcript) {
      throw new Error('Transcription failed or returned empty result');
    }

    console.log(`[LAMBDA] Transcript: "${transcript}"`);

    // Step 4: Extract structured fields from transcript
    const extractedFields = extractFieldsFromTranscript(transcript);
    const confidence = calculateConfidence(extractedFields);

    console.log(`[LAMBDA] Extracted fields:`, extractedFields);
    console.log(`[LAMBDA] Confidence score: ${(confidence * 100).toFixed(1)}%`);

    // Step 5: Update DynamoDB with final results
    await updateProcessingResults(
      districtId,
      applicationId,
      transcript,
      extractedFields,
      confidence,
      timestamp
    );

    console.log('[LAMBDA] Processing completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        applicationId,
        districtId,
        fileKey: key,
        transcription: transcript,
        extractedFields,
        confidence
      })
    };

  } catch (error) {
    console.error('[LAMBDA] Error:', error);

    // Try to update DynamoDB with error status if we have enough context
    try {
      const record = event.Records[0];
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      const keyParts = key.split('/');
      
      if (keyParts.length >= 4 && keyParts[1] === 'raw-audio') {
        const districtId = keyParts[0];
        const applicationId = keyParts[2];
        await writeProcessingStatus(districtId, applicationId, key, 'failed', new Date().toISOString(), error.message);
      }
    } catch (dbError) {
      console.error('[LAMBDA] Failed to write error status to DynamoDB:', dbError);
    }

    throw error;
  }
};

/**
 * Merge processing status into the existing DynamoDB record.
 * Uses UpdateCommand so we never overwrite fields already on the draft row.
 */
async function writeProcessingStatus(districtId, applicationId, fileKey, status, timestamp, errorMessage = null) {
  console.log(`[DynamoDB] Writing status '${status}' for ApplicationID: ${applicationId}`);

  let updateExpression = 'SET ApplicationStatus = :status, fileKey = :fileKey, updatedAt = :updatedAt';
  const expressionValues = {
    ':status': status,
    ':fileKey': fileKey,
    ':updatedAt': timestamp,
  };

  if (errorMessage) {
    updateExpression += ', errorMessage = :errorMessage';
    expressionValues[':errorMessage'] = errorMessage;
  }

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      DistrictID: districtId,
      ApplicationID: applicationId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionValues,
  });

  await docClient.send(command);
  console.log(`[DynamoDB] Status '${status}' written for ApplicationID: ${applicationId}`);
}

/**
 * Start AWS Transcribe job
 */
async function startTranscription(bucket, key, jobName) {
  console.log(`[TRANSCRIBE] Starting job: ${jobName}`);

  const command = new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    LanguageCode: 'hi-IN', // Hindi-India (or use 'en-IN' for English-India)
    MediaFormat: 'wav',
    Media: {
      MediaFileUri: `s3://${bucket}/${key}`
    },
    OutputBucketName: bucket, // Store transcription output in same bucket
    Settings: {
      ShowSpeakerLabels: false,
      MaxSpeakerLabels: 1
    }
  });

  const response = await transcribeClient.send(command);
  console.log(`[TRANSCRIBE] Job started:`, response.TranscriptionJob.TranscriptionJobName);

  return response.TranscriptionJob.TranscriptionJobName;
}

/**
 * Poll transcription job until completion
 */
async function pollTranscriptionJob(jobName) {
  console.log(`[TRANSCRIBE] Polling job: ${jobName}`);

  for (let attempt = 0; attempt < MAX_TRANSCRIBE_POLL_ATTEMPTS; attempt++) {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName
    });

    const response = await transcribeClient.send(command);
    const job = response.TranscriptionJob;
    const status = job.TranscriptionJobStatus;

    console.log(`[TRANSCRIBE] Poll attempt ${attempt + 1}/${MAX_TRANSCRIBE_POLL_ATTEMPTS}, Status: ${status}`);

    if (status === 'COMPLETED') {
      // Download and parse transcript
      const transcriptUri = job.Transcript.TranscriptFileUri;
      console.log(`[TRANSCRIBE] Transcript ready at: ${transcriptUri}`);

      const transcript = await fetchTranscript(transcriptUri);
      return transcript;
    } else if (status === 'FAILED') {
      throw new Error(`Transcription job failed: ${job.FailureReason}`);
    }

    // Wait before next poll
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Transcription job timed out after ${MAX_TRANSCRIBE_POLL_ATTEMPTS} attempts`);
}

/**
 * Fetch and parse transcript from S3 URI
 */
async function fetchTranscript(transcriptUri) {
  console.log(`[TRANSCRIBE] Fetching transcript from: ${transcriptUri}`);

  // Parse S3 URI (format: https://s3.region.amazonaws.com/bucket/key)
  const urlMatch = transcriptUri.match(/https:\/\/s3[.-]([^.]+)\.amazonaws\.com\/([^/]+)\/(.+)/);
  if (!urlMatch) {
    throw new Error(`Invalid transcript URI format: ${transcriptUri}`);
  }

  const bucket = urlMatch[2];
  const key = urlMatch[3];

  // Fetch transcript JSON from S3
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);

  // Read stream to string
  const streamToString = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });

  const jsonString = await streamToString(response.Body);
  const transcriptJson = JSON.parse(jsonString);

  // Extract transcript text
  const transcript = transcriptJson.results.transcripts[0].transcript;
  console.log(`[TRANSCRIBE] Extracted transcript: "${transcript}"`);

  return transcript;
}

/**
 * Write final analysis results back into the existing DynamoDB record.
 * Field names must match what the backend /audio-result endpoint reads:
 *   ApplicationStatus = "ANALYZED"  ← FilterExpression
 *   Transcript                       ← item.Transcript
 *   aiAnalysis                       ← item.aiAnalysis
 */
async function updateProcessingResults(districtId, applicationId, transcript, extractedFields, confidence, createdAt) {
  console.log(`[DynamoDB] Updating results for ApplicationID: ${applicationId}`);

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      DistrictID: districtId,
      ApplicationID: applicationId,
    },
    UpdateExpression: 'SET ApplicationStatus = :status, Transcript = :transcript, aiAnalysis = :analysis, confidence = :confidence, processedAt = :processedAt, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':status': 'STRUCTURED',   // Lambda 3 (DynamoDB Streams) triggers on this; it writes "ANALYZED"
      ':transcript': transcript,
      ':analysis': extractedFields,
      ':confidence': confidence,
      ':processedAt': new Date().toISOString(),
      ':updatedAt': new Date().toISOString(),
    },
  });

  await docClient.send(command);
  console.log(`[DynamoDB] Results written — ApplicationID: ${applicationId} is now STRUCTURED (Lambda 3 will complete to ANALYZED)`);
}
