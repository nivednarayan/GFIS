"""
Lambda 2 — Transcribe Output JSON → Bedrock Field Extraction → DynamoDB STRUCTURED
====================================================================================
Trigger : S3 PutObject on "gfis-s3-78",
          prefix "district-001/transcribe-output/"

UPDATES:
  - FIX: Aligned JSON keys with Frontend expected field names (mobileNumber, aadhaarNumber).
  - KEEPS: Read-Merge-Write logic and Age 0 fix.
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

    # ── 2. Recover applicationId from the filename ───────────────────────────────────
    stem           = key.split("/")[-1].replace(".json", "")
    application_id = re.sub(r"^gfis-\d+-", "", stem)
    district_id    = key.split("/")[0]

    if not application_id or application_id == stem:
        print(f"Skipping invalid key: {key}")
        return {"statusCode": 200}

    # ── 3. Read NEW transcript text ──────────────────────────────────────────────────
    response        = s3.get_object(Bucket=bucket, Key=key)
    transcript_json = json.loads(response["Body"].read())

    try:
        new_transcript_text = transcript_json["results"]["transcripts"][0]["transcript"]
    except (KeyError, IndexError):
        new_transcript_text = ""

    if not new_transcript_text.strip():
        print("Empty transcript — no update needed")
        return {"statusCode": 200}

    print(f"New Transcript: {new_transcript_text}")

    # ── 4. FETCH HISTORY (Context Separation) ────────────────────────────────────────
    try:
        existing_record = table.get_item(
            Key={"DistrictID": district_id, "ApplicationID": application_id}
        )
        item = existing_record.get("Item", {})
        current_ai_analysis = item.get("aiAnalysis", {})
        history_context = item.get("TranscriptHistory", item.get("Transcript", ""))
        
    except Exception as e:
        print(f"Error fetching record: {e}")
        current_ai_analysis = {}
        history_context = ""

    separator = " " if history_context else ""
    full_conversation_context = f"{history_context}{separator}{new_transcript_text}"

    # ── 5. Bedrock Prompt (Updated Keys for Frontend Compatibility) ──────────────────
    prompt = f"""You are a helpful AI filling a government application form. 
    
History of conversation: "{full_conversation_context}"

Task: Extract structured data based on the history, focusing on the latest update.

Return ONLY JSON.
1. If a field is NOT mentioned or implied, return null. 
2. For 'age', return 0 only if explicitly stated as 0.
3. Generate a 'chat_response': A short, friendly phrase confirming ONLY what was just updated.

{{
  "fullName": "person name or null",
  "age": 0,
  "scheme": "scheme name or null",
  "district": "district or null",
  "occupation": "occupation or null",
  "income": "annual income or null",
  "address": "address or null",
  "mobileNumber": "phone number (10 digits) or null",
  "aadhaarNumber": "aadhaar number (12 digits) or null",
  "rationCardNumber": "ration card number or null",
  "dateOfBirth": "YYYY-MM-DD or null",
  "applicationDate": "YYYY-MM-DD",
  "chat_response": "Short confirmation message"
}}"""

    bedrock_response = bedrock.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 500, "temperature": 0},
    )

    model_output = bedrock_response["output"]["message"]["content"][0]["text"]
    json_match   = re.search(r"\{.*?\}", model_output, re.DOTALL)
    new_extracted_data = json.loads(json_match.group(0)) if json_match else {}

    print(f"Newly Extracted: {new_extracted_data}")

    # ── 6. MERGE LOGIC (Fixing the 0 Bug) ────────────────────────────────────────────
    final_merged_data = current_ai_analysis.copy()
    chat_response_text = new_extracted_data.pop("chat_response", "Updated details.")

    for field, value in new_extracted_data.items():
        # Ignore nulls, empty strings, and 0 (to protect age)
        if value is not None and value != "null" and value != "" and value != 0:
            final_merged_data[field] = value

    # ── 7. Update DynamoDB ───────────────────────────────────────────────────────────
    table.update_item(
        Key={"DistrictID": district_id, "ApplicationID": application_id},
        UpdateExpression=(
            "SET aiAnalysis = :ai, "
            "    Transcript = :tx, "         
            "    TranscriptHistory = :th, " 
            "    chatResponse = :cr, "       
            "    ApplicationStatus = :st, "
            "    updatedAt = :ts"
        ),
        ExpressionAttributeValues={
            ":ai": final_merged_data,
            ":tx": new_transcript_text,        
            ":th": full_conversation_context,  
            ":cr": chat_response_text,
            ":st": "STRUCTURED",
            ":ts": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {"statusCode": 200} 