const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = require("./s3Client");

/**
 * Generates a pre-signed S3 upload URL for raw audio files.
 *
 * Path format:
 * district-001/raw-audio/{timestamp}-{random}.wav
 *
 * @returns {Promise<{uploadUrl: string, fileKey: string}>}
 */
const generateUploadUrl = async () => {
  const bucketName = process.env.S3_BUCKET;

  if (!bucketName) {
    throw new Error("S3_BUCKET environment variable is required");
  }

  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  const fileKey = `district-001/raw-audio/${timestamp}-${random}.wav`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: "audio/wav",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60,
  });

  return {
    uploadUrl,
    fileKey,
  };
};

module.exports = {
  generateUploadUrl,
};
