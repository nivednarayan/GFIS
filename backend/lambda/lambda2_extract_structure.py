"""
Lambda 2 — Transcribe Output JSON → Bedrock Field Extraction → DynamoDB STRUCTURED
====================================================================================
Trigger : S3 PutObject on "gfis-s3-78",
          prefix "district-001/transcribe-output/"

What it does:
    1. Recovers applicationId from the Transcribe output filename.
       Lambda 1 wrote:  gfis-{unix_ts}-{safe_app_id}.json
       Recovery:        re.sub(r'^gfis-\\d+-', '', stem)  → original applicationId
    2. Reads transcript text from the Transcribe output JSON.
    3. Calls Bedrock Nova Lite to extract structured fields.
    4. update_item (NOT put_item) → writes Transcript, aiAnalysis,
       ApplicationStatus = "STRUCTURED"
       This DynamoDB change fires Lambda 3 via DynamoDB Streams.

CRITICAL — never call put_item here:
    The record was created by /api/applications/create (frontend draft).
    put_item would create a second record under a new UUID, the frontend
    would keep polling the original draft and loop forever on "processing…".
"""

import json
import re
import urllib.parse
from datetime import datetime, timezone

import boto3

s3       = boto3.client("s3")
bedrock  = boto3.client("bedrock-runtime")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = "GFIS_Applications"
MODEL_ID   = "apac.amazon.nova-lite-v1:0"

table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    print("Event:", json.dumps(event))

    # ── 1. Parse S3 event ────────────────────────────────────────────────────────────
    record = event["Records"][0]
    bucket = record["s3"]["bucket"]["name"]
    key    = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

    print(f"Transcribe output file: {key}")

    # ── 2. Recover applicationId from the filename ───────────────────────────────────
    #
    # Filename: district-001/transcribe-output/gfis-{timestamp}-{safe_app_id}.json
    #
    # WRONG (old approach):
    #   re.search(r'(APP-[A-Z0-9-]+)', key)
    #   → only matches legacy APP-* IDs; UUID stems will NEVER match
    #   → returns 400 for every real application
    #
    # CORRECT:
    #   strip ".json", strip the "gfis-{digits}-" prefix → original applicationId
    stem           = key.split("/")[-1].replace(".json", "")   # "gfis-1741234567-abc123-..."
    application_id = re.sub(r"^gfis-\d+-", "", stem)           # "abc123-..."  (UUID)
    district_id    = key.split("/")[0]                          # "district-001"

    if not application_id or application_id == stem:
        # stem didn't start with gfis-{digits}- → not our file, skip safely
        print(f"Could not recover applicationId from: {key} — skipping")
        return {"statusCode": 200}

    print(f"Recovered ApplicationID: {application_id} | DistrictID: {district_id}")

    # ── 3. Read transcript from Transcribe output JSON ───────────────────────────────
    response        = s3.get_object(Bucket=bucket, Key=key)
    transcript_json = json.loads(response["Body"].read())

    try:
        transcript_text = transcript_json["results"]["transcripts"][0]["transcript"]
    except (KeyError, IndexError):
        transcript_text = ""

    if not transcript_text.strip():
        print("Empty transcript — marking as failed")
        table.update_item(
            Key={"DistrictID": district_id, "ApplicationID": application_id},
            UpdateExpression="SET ApplicationStatus = :s, updatedAt = :u",
            ExpressionAttributeValues={
                ":s": "failed",
                ":u": datetime.now(timezone.utc).isoformat(),
            },
        )
        return {"statusCode": 200}

    print(f"Transcript: {transcript_text}")

    # ── 4. Bedrock: extract structured fields ────────────────────────────────────────
    prompt = f"""You are extracting structured information from a rural welfare application.

Transcript: {transcript_text}

Return ONLY valid JSON with no extra text before or after:

{{
  "name": "person name or null",
  "age": 0,
  "scheme": "government scheme mentioned, or closest real scheme, or null",
  "district": "district if mentioned or null",
  "occupation": "occupation if mentioned or null",
  "incomeLevel": "low, medium, high, or unknown",
  "address": "address if mentioned or null",
  "phoneNumber": "phone number if mentioned or null",
  "applicationDate": "YYYY-MM-DD"
}}

Use null for missing fields. Use 0 for unknown age."""

    bedrock_response = bedrock.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 500, "temperature": 0},
    )

    model_output  = bedrock_response["output"]["message"]["content"][0]["text"]
    json_match    = re.search(r"\{.*?\}", model_output, re.DOTALL)
    structured_data = json.loads(json_match.group(0)) if json_match else {}

    print(f"Extracted fields: {structured_data}")

    # ── 5. Update existing draft record — set status to STRUCTURED ───────────────────
    # "STRUCTURED" triggers Lambda 3 via DynamoDB Streams.
    # Lambda 3 runs Bedrock risk analysis and sets the final status "ANALYZED",
    # which is what the frontend /audio-result polling endpoint waits for.
    table.update_item(
        Key={"DistrictID": district_id, "ApplicationID": application_id},
        UpdateExpression=(
            "SET aiAnalysis = :ai, "
            "    Transcript = :tx, "
            "    ApplicationStatus = :st, "
            "    updatedAt = :ts"
        ),
        ExpressionAttributeValues={
            ":ai": structured_data,
            ":tx": transcript_text,
            ":st": "STRUCTURED",  # ← triggers Lambda 3 via DynamoDB Streams
            ":ts": datetime.now(timezone.utc).isoformat(),
        },
    )

    print(f"Updated {application_id} → STRUCTURED. Lambda 3 will now trigger.")
    return {"statusCode": 200}
