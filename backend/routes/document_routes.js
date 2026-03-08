const express = require("express");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { generateUploadUrl } = require("../services/s3UploadService");
const { generateAudioKey } = require("../services/s3KeyGenerator");
const { docClient } = require("../services/dynamoService");

const router = express.Router();

router.get("/upload-url", async (req, res) => {
	try {
		const { applicationId } = req.query;

		if (!applicationId || typeof applicationId !== "string") {
			return res.status(400).json({
				error: "applicationId is required",
				message: "Provide applicationId in query string",
			});
		}

		const fileKey = generateAudioKey(applicationId);
		const uploadUrl = await generateUploadUrl(fileKey);

		// Merge 'processing' status into the existing draft — never overwrite it.
		try {
			const districtId = fileKey.split("/")[0] || "district-001";
			await docClient.send(
				new UpdateCommand({
					TableName: process.env.DYNAMODB_TABLE || "GFIS_Applications",
					Key: {
						DistrictID: districtId,
						ApplicationID: applicationId,
					},
					UpdateExpression: "SET ApplicationStatus = :status, fileKey = :fileKey, updatedAt = :updatedAt",
					ExpressionAttributeValues: {
						":status": "processing",
						":fileKey": fileKey,
						":updatedAt": new Date().toISOString(),
					},
				})
			);
			console.log(`[UPLOAD-URL] Marked ApplicationID: ${applicationId} as processing`);
		} catch (markerError) {
			console.warn("[UPLOAD-URL] Could not write processing marker:", markerError.message);
		}

		return res.json({
			uploadUrl,
			fileKey,
			applicationId,
		});
	} catch (error) {
		return res.status(500).json({
			error: "Failed to generate upload URL",
			message: error.message,
		});
	}
});

module.exports = router;
