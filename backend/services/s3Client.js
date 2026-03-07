const { S3Client } = require("@aws-sdk/client-s3");

/**
 * Configured AWS S3 client (SDK v3)
 *
 * Uses:
 * - region from process.env.AWS_REGION
 * - default AWS credential provider chain (IAM role, env vars, shared config, etc.)
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

module.exports = s3Client;


