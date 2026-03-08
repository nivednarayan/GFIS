"""
Lambda 1 — S3 Audio Upload → Start AWS Transcribe
==================================================
Trigger : S3 PutObject on "gfis-s3-78",
          prefix "district-001/raw-audio/"

Canonical S3 key format (set by the frontend + /api/applications/create):
    district-001/raw-audio/{applicationId}/{timestamp}-{random}.wav

What it does:
    1. Extracts applicationId from key position [2] — NOT by regex.
       applicationIds are now UUIDs (e.g. f8a241d6-4b3c-...) so any
       pattern like APP-[A-Z0-9-] will silently fail to match.
    2. update_item → ApplicationStatus = "processing"
       (NOT put_item — the draft record already exists; we must not
        overwrite it or the frontend loses the item it is polling)
    3. Starts Transcribe job whose name encodes the full applicationId
       so Lambda 2 can recover it without an extra DB lookup:
         job_name = gfis-{unix_ts}-{safe_app_id}
         recovery  = re.sub(r'^gfis-\d+-', '', stem)
"""

import json
import re
import time
import urllib.parse
from datetime import datetime, timezone

import boto3

transcribe = boto3.client("transcribe")
dynamodb   = boto3.resource("dynamodb")

TABLE_NAME    = "GFIS_Applications"
OUTPUT_BUCKET = "gfis-s3-78"
OUTPUT_PREFIX = "district-001/transcribe-output/"

table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    print("Event:", json.dumps(event))

    # ── 1. Parse S3 event ────────────────────────────────────────────────────────────
    record = event["Records"][0]
    bucket = record["s3"]["bucket"]["name"]
    key    = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

    print(f"Processing audio file: {key}")

    # ── 2. Extract applicationId from the canonical path position ────────────────────
    #
    # WRONG (old approach):
    #   re.search(r'(APP-[A-Z0-9-]+)', key)
    #   → only matches legacy APP-* IDs; UUID applicationIds will NEVER match
    #   → falls back to "unknown" silently, poisoning every downstream step
    #
    # CORRECT:
    #   split by "/" → ["district-001", "raw-audio", "{applicationId}", "file.wav"]
    #                                                       ↑ index 2
    key_parts = key.split("/")
    if len(key_parts) < 4 or key_parts[1] != "raw-audio":
        print(f"Skipping non-canonical key: {key}")
        return {"statusCode": 200}

    district_id    = key_parts[0]   # "district-001"
    application_id = key_parts[2]   # UUID or any valid applicationId

    print(f"DistrictID: {district_id} | ApplicationID: {application_id}")

    # ── 3. Build Transcribe job name with embedded applicationId ─────────────────────
    #
    # Transcribe allows: letters, digits, hyphens, underscores (max 200 chars).
    # Hyphens in UUIDs are fine. Colons/dots are not — sanitize just in case.
    safe_app_id = re.sub(r"[^a-zA-Z0-9_-]", "-", application_id)
    job_name    = f"gfis-{int(time.time())}-{safe_app_id}"

    # OutputKey: explicit path so Lambda 2's S3 trigger prefix matches exactly
    output_key = f"{OUTPUT_PREFIX}{job_name}.json"

    print(f"Starting job: {job_name}")

    # ── 4. Mark record as "processing" (update, never put) ──────────────────────────
    try:
        table.update_item(
            Key={"DistrictID": district_id, "ApplicationID": application_id},
            UpdateExpression="SET ApplicationStatus = :s, fileKey = :f, updatedAt = :u",
            ExpressionAttributeValues={
                ":s": "processing",   # lowercase — matches /audio-result backend convention
                ":f": key,
                ":u": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as e:
        # Non-fatal: log and continue so Transcribe still starts
        print(f"DB update warning: {e}")

    # ── 5. Start Transcribe job ──────────────────────────────────────────────────────
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={"MediaFileUri": f"s3://{bucket}/{key}"},
        MediaFormat="wav",
        LanguageCode="en-IN",
        OutputBucketName=OUTPUT_BUCKET,
        OutputKey=output_key,
    )

    return {"statusCode": 200, "body": "Transcription Started"}
