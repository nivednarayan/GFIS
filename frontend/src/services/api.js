const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = {
	/**
	 * Step 1: Request a pre-signed upload URL from backend
	 * GET /api/upload-url
	 */
	getUploadUrl: async () => {
		const response = await fetch(`${API_BASE_URL}/upload-url`, {
			method: "GET",
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch upload URL: ${response.status}`);
		}

		const data = await response.json();

		if (!data?.uploadUrl || !data?.fileKey) {
			throw new Error("Invalid upload URL response");
		}

		return {
			uploadUrl: data.uploadUrl,
			fileKey: data.fileKey,
		};
	},

	/**
	 * Step 2: Upload file directly to S3 using the pre-signed URL
	 */
	uploadToS3: async (uploadUrl, audioFile) => {
		const response = await fetch(uploadUrl, {
			method: "PUT",
			body: audioFile,
			headers: {
				"Content-Type": "audio/wav",
			},
		});

		if (!response.ok) {
			throw new Error(`S3 upload failed: ${response.status}`);
		}

		return true;
	},

	/**
	 * Convenience helper: request URL + upload file
	 */
	uploadAudioFile: async (audioFile) => {
		const { uploadUrl, fileKey } = await api.getUploadUrl();
		await api.uploadToS3(uploadUrl, audioFile);

		return {
			uploadUrl,
			fileKey,
		};
	},
};

export default api;
