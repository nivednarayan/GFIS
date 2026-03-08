/**
 * DynamoDB Service Module
 * Handles all interactions with AWS DynamoDB for audio processing results
 * Uses AWS SDK v3 with DynamoDBDocumentClient for simplified operations
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize DynamoDB client (SDK v3)
 * Uses credentials from environment or IAM role
 */
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

/**
 * Create DynamoDB Document Client wrapper
 * Simplifies working with native JavaScript types
 */
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_NAME = process.env.DYNAMODB_TABLE || "GFIS_Applications";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate DynamoDB response structure
 * @param {Object} item - Item from DynamoDB
 * @returns {Boolean} True if valid
 */
const isValidAudioProcessingResult = (item = {}) => {
  return (
    typeof item === "object" &&
    (typeof item.fileKey === "string" || item.fileKey !== undefined) &&
    (
      typeof item.transcription === "string" ||
      item.transcription === null ||
      typeof item.transcript === "string" ||
      item.transcript === null
    ) &&
    (typeof item.extractedFields === "object" || item.extractedFields === null)
  );
};

/**
 * Format DynamoDB response for API consumption
 * @param {Object} item - Raw DynamoDB item
 * @returns {Object} Formatted result
 */
const formatAudioProcessingResult = (item = {}) => {
  if (!item) {
    return null;
  }

  return {
    fileKey: item.fileKey || null,
    transcription: item.transcription || item.transcript || null,
    extractedFields: item.extractedFields || {},
    confidence: item.confidence || null,
    processingStatus: item.processingStatus || "unknown",
    processedAt: item.processedAt || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    errorMessage: item.errorMessage || null,
  };
};

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get audio processing result by file key
 * Retrieves transcript and extracted fields from DynamoDB
 *
 * @param {String} fileKey - S3 file key (e.g., "district-001/raw-audio/1704067200000-a1b2c3d4.wav")
 * @returns {Promise<Object>} Audio processing result with transcript and extracted fields
 * @throws {Error} If query fails
 *
 * @example
 * const result = await getAudioProcessingResult('district-001/raw-audio/1704067200000-a1b2c3d4.wav');
 * // Returns: { fileKey, transcription, extractedFields, processingStatus, ... }
 */
const getAudioProcessingResult = async (fileKey) => {
  if (!fileKey || typeof fileKey !== "string") {
    throw new Error("fileKey is required and must be a string");
  }

  try {
    console.log(`[DynamoDB] Querying audio processing result for fileKey: ${fileKey}`);

    // Extract districtId from fileKey (e.g., "district-001" from "district-001/raw-audio/file.wav")
    const districtId = fileKey.split("/")[0];
    console.log(`[DynamoDB] Extracted districtId: ${districtId}`);

    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "DistrictID = :districtId",
      ExpressionAttributeValues: {
        ":districtId": districtId,
      },
    };

    const command = new QueryCommand(params);
    const response = await docClient.send(command);

    console.log(`[DynamoDB] Query returned ${response.Items?.length || 0} items for district ${districtId}`);

    if (!response.Items || response.Items.length === 0) {
      console.warn(`[DynamoDB] No processing results found for district: ${districtId}`);
      return {
        success: false,
        data: null,
        error: "Audio processing result not found",
      };
    }

    // Filter results to find the exact fileKey match
    const item = response.Items.find(item => item.fileKey === fileKey);

    if (!item) {
      console.warn(`[DynamoDB] No matching fileKey found in district ${districtId} results`);
      return {
        success: false,
        data: null,
        error: "Audio processing result not found",
      };
    }

    if (!isValidAudioProcessingResult(item)) {
      console.error(`[DynamoDB] Invalid item structure for fileKey: ${fileKey}`);
      return {
        success: false,
        data: null,
        error: "Invalid audio processing result structure",
      };
    }

    const formattedResult = formatAudioProcessingResult(item);

    console.log(`[DynamoDB] Successfully retrieved result:`, {
      fileKey: formattedResult.fileKey,
      status: formattedResult.processingStatus,
      hasTranscription: !!formattedResult.transcription,
      extractedFieldsCount: Object.keys(formattedResult.extractedFields || {}).length,
    });

    return {
      success: true,
      data: formattedResult,
      error: null,
    };
  } catch (error) {
    console.error(`[DynamoDB] Error querying audio processing result:`, error);
    return {
      success: false,
      data: null,
      error: `DynamoDB query failed: ${error.message}`,
    };
  }
};

/**
 * Get audio processing result by application ID
 * Retrieves the latest transcript and extracted fields for an application
 *
 * @param {String} applicationId - Application ID
 * @returns {Promise<Object>} Latest audio processing result
 * @throws {Error} If query fails
 *
 * @example
 * const result = await getAudioProcessingByApplicationId('APP-12345678-ABC123');
 */
const getAudioProcessingByApplicationId = async (applicationId) => {
  if (!applicationId || typeof applicationId !== "string") {
    throw new Error("applicationId is required and must be a string");
  }

  try {
    console.log(`[DynamoDB] Querying audio processing for applicationId: ${applicationId}`);

    const params = {
      TableName: TABLE_NAME,
      IndexName: "applicationId-processedAt-index", // Assumes GSI exists
      KeyConditionExpression: "applicationId = :appId",
      ExpressionAttributeValues: {
        ":appId": applicationId,
      },
      ScanIndexForward: false, // Sort by processedAt descending (newest first)
      Limit: 1, // Get only the most recent
    };

    const command = new QueryCommand(params);
    const response = await docClient.send(command);

    console.log(`[DynamoDB] Query returned ${response.Items?.length || 0} items`);

    if (!response.Items || response.Items.length === 0) {
      console.warn(`[DynamoDB] No processing result found for applicationId: ${applicationId}`);
      return {
        success: false,
        data: null,
        error: "No audio processing results found for this application",
      };
    }

    const item = response.Items[0];

    if (!isValidAudioProcessingResult(item)) {
      console.error(`[DynamoDB] Invalid item structure for applicationId: ${applicationId}`);
      return {
        success: false,
        data: null,
        error: "Invalid audio processing result structure",
      };
    }

    const formattedResult = formatAudioProcessingResult(item);

    console.log(`[DynamoDB] Successfully retrieved result for applicationId:`, {
      applicationId: applicationId,
      fileKey: formattedResult.fileKey,
      status: formattedResult.processingStatus,
    });

    return {
      success: true,
      data: formattedResult,
      error: null,
    };
  } catch (error) {
    console.error(`[DynamoDB] Error querying by applicationId:`, error);
    return {
      success: false,
      data: null,
      error: `DynamoDB query failed: ${error.message}`,
    };
  }
};

/**
 * Get processing status for a file key
 * Returns only the processing status without full result
 *
 * @param {String} fileKey - S3 file key
 * @returns {Promise<Object>} Processing status
 *
 * @example
 * const status = await getProcessingStatus('district-001/raw-audio/1704067200000-a1b2c3d4.wav');
 * // Returns: { status: 'completed' | 'processing' | 'failed' | 'not_found' }
 */
const getProcessingStatus = async (fileKey) => {
  if (!fileKey || typeof fileKey !== "string") {
    throw new Error("fileKey is required and must be a string");
  }

  try {
    const result = await getAudioProcessingResult(fileKey);

    if (!result.success || !result.data) {
      return {
        status: "not_found",
        processingStatus: null,
      };
    }

    return {
      status: "found",
      processingStatus: result.data.processingStatus,
      processedAt: result.data.processedAt,
      hasTranscription: !!result.data.transcription,
      hasExtractedFields: Object.keys(result.data.extractedFields || {}).length > 0,
    };
  } catch (error) {
    console.error(`[DynamoDB] Error getting processing status:`, error);
    return {
      status: "error",
      processingStatus: null,
      error: error.message,
    };
  }
};

// ============================================================================
// WRITE OPERATIONS (For Lambda/Internal Use)
// ============================================================================

/**
 * Create or update audio processing result
 * Called by Lambda after transcription/extraction completion
 *
 * @param {Object} data - Audio processing data
 * @param {String} data.fileKey - S3 file key
 * @param {String} data.applicationId - Associated application ID
 * @param {String} data.transcription - Transcribed text
 * @param {Object} data.extractedFields - Extracted fields object
 * @param {String} data.processingStatus - Status: 'completed' | 'processing' | 'failed'
 * @param {Number} data.confidence - Confidence score (0-1)
 * @returns {Promise<Object>} Save result
 * @internal
 *
 * @example
 * // Called by Lambda
 * const result = await saveAudioProcessingResult({
 *   fileKey: 'district-001/raw-audio/1704067200000-a1b2c3d4.wav',
 *   applicationId: 'APP-12345678-ABC123',
 *   transcription: 'My name is John Doe...',
 *   extractedFields: { fullName: 'John Doe', age: 35 },
 *   processingStatus: 'completed',
 *   confidence: 0.92
 * });
 */
const saveAudioProcessingResult = async (data = {}) => {
  const { fileKey, applicationId, transcription, extractedFields, processingStatus, confidence } = data;

  if (!fileKey) {
    throw new Error("fileKey is required");
  }

  try {
    console.log(`[DynamoDB] Saving audio processing result for fileKey: ${fileKey}`);

    const now = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Item: {
        fileKey,
        applicationId: applicationId || null,
        transcription: transcription || null,
        extractedFields: extractedFields || {},
        processingStatus: processingStatus || "unknown",
        confidence: confidence || null,
        processedAt: now,
        updatedAt: now,
        createdAt: now,
      },
    };

    const command = new PutCommand(params);
    await docClient.send(command);

    console.log(`[DynamoDB] Successfully saved processing result for fileKey: ${fileKey}`);

    return {
      success: true,
      message: "Audio processing result saved",
      fileKey,
    };
  } catch (error) {
    console.error(`[DynamoDB] Error saving audio processing result:`, error);
    return {
      success: false,
      message: "Failed to save audio processing result",
      error: error.message,
    };
  }
};

/**
 * Update processing status
 * Used to mark processing as in-progress, completed, or failed
 *
 * @param {String} fileKey - S3 file key
 * @param {String} status - New status
 * @param {String} errorMessage - Error message if failed
 * @returns {Promise<Object>} Update result
 * @internal
 */
const updateProcessingStatus = async (fileKey, status, errorMessage = null) => {
  if (!fileKey) {
    throw new Error("fileKey is required");
  }

  try {
    console.log(`[DynamoDB] Updating processing status for ${fileKey} to: ${status}`);

    const updateData = {
      processingStatus: status,
      updatedAt: new Date().toISOString(),
    };

    if (errorMessage && status === "failed") {
      updateData.errorMessage = errorMessage;
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { fileKey },
      UpdateExpression: "SET #status = :status, #updated = :updated" + 
                        (errorMessage ? ", #error = :error" : ""),
      ExpressionAttributeNames: {
        "#status": "processingStatus",
        "#updated": "updatedAt",
        ...(errorMessage ? { "#error": "errorMessage" } : {}),
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updated": updateData.updatedAt,
        ...(errorMessage ? { ":error": errorMessage } : {}),
      },
    };

    const command = new UpdateCommand(params);
    await docClient.send(command);

    console.log(`[DynamoDB] Successfully updated status for fileKey: ${fileKey}`);

    return {
      success: true,
      message: "Processing status updated",
    };
  } catch (error) {
    console.error(`[DynamoDB] Error updating processing status:`, error);
    return {
      success: false,
      message: "Failed to update processing status",
      error: error.message,
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Client exports
  dynamoClient,
  docClient,
  
  // Read operations
  getAudioProcessingResult,
  getAudioProcessingByApplicationId,
  getProcessingStatus,
  
  // Write operations (internal/Lambda use)
  saveAudioProcessingResult,
  updateProcessingStatus,
  
  // Constants
  TABLE_NAME,
};
