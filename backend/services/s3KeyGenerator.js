/**
 * Canonical GFIS raw-audio S3 key generator.
 *
 * IMPORTANT:
 * This prefix must remain stable because downstream Lambda parsing relies on it.
 * Canonical format:
 * district-001/raw-audio/{applicationId}/{timestamp}-{random}.wav
 */
function generateAudioKey(applicationId) {
  if (!applicationId || typeof applicationId !== "string") {
    throw new Error("applicationId is required");
  }

  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2);

  return `district-001/raw-audio/${applicationId}/${timestamp}-${random}.wav`;
}

module.exports = { generateAudioKey };
