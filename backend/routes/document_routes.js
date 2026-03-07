const express = require("express");
const { generateUploadUrl } = require("../services/s3UploadService");

const router = express.Router();

router.get("/upload-url", async (req, res) => {
	try {
		const { uploadUrl, fileKey } = await generateUploadUrl();

		return res.json({
			uploadUrl,
			fileKey,
		});
	} catch (error) {
		return res.status(500).json({
			error: "Failed to generate upload URL",
			message: error.message,
		});
	}
});

module.exports = router;
