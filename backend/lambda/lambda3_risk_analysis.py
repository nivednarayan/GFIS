"""
Lambda 3 — DynamoDB Streams → Bedrock Risk Analysis → DynamoDB ANALYZED
=========================================================================
Trigger : DynamoDB Streams on table "GFIS_Applications"
          (stream view type must be NEW_IMAGE or NEW_AND_OLD_IMAGES)

What it does:
    1. Fires on INSERT or MODIFY events where ApplicationStatus = "STRUCTURED"
       (set by Lambda 2 after field extraction is complete)
    2. Uses boto3 TypeDeserializer to unmarshal DynamoDB JSON format
       (handles nested maps M, lists L, booleans BOOL — not just S/N/NULL)
    3. Applies a fast rule-based rejection if no scheme is mentioned
    4. Otherwise calls Bedrock Nova Lite for risk assessment
    5. update_item → riskLevel, RiskScore, decisionReason,
       ApplicationStatus = "ANALYZED"
       This is the final state — the frontend /audio-result polling stops here.
"""

import json
import re
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.types import TypeDeserializer

bedrock  = boto3.client("bedrock-runtime")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = "GFIS_Applications"
MODEL_ID   = "apac.amazon.nova-lite-v1:0"

table        = dynamodb.Table(TABLE_NAME)
deserializer = TypeDeserializer()


def unmarshal(dynamodb_image: dict) -> dict:
    """
    Convert a DynamoDB Streams NewImage (raw DynamoDB JSON with type descriptors)
    into a plain Python dict.

    TypeDeserializer handles all DynamoDB types recursively:
      S, N, BOOL, NULL, B, M (nested maps), L (lists), SS, NS, BS
    """
    return {k: deserializer.deserialize(v) for k, v in dynamodb_image.items()}


def lambda_handler(event, context):
    for record in event["Records"]:

        # ── 1. Only act on data-change events ────────────────────────────────────────
        if record["eventName"] not in ("INSERT", "MODIFY"):
            continue

        new_image = record["dynamodb"].get("NewImage")
        if not new_image:
            continue

        # ── 2. Filter: only process records that just became STRUCTURED ───────────────
        status_attr = new_image.get("ApplicationStatus")
        if not status_attr or status_attr.get("S") != "STRUCTURED":
            continue

        # ── 3. Unmarshal full record ──────────────────────────────────────────────────
        parsed       = unmarshal(new_image)
        district_id  = parsed.get("DistrictID")
        app_id       = parsed.get("ApplicationID")
        ai_data      = parsed.get("aiAnalysis") or {}

        if not district_id or not app_id:
            print("Missing DistrictID or ApplicationID — skipping")
            continue

        print(f"Analyzing risk for: {app_id}")

        # ── 4. Rule-based fast rejection: no scheme mentioned ─────────────────────────
        scheme = ai_data.get("scheme")
        if not scheme or str(scheme).lower() in ("null", "none", ""):
            table.update_item(
                Key={"DistrictID": district_id, "ApplicationID": app_id},
                UpdateExpression=(
                    "SET riskLevel = :r, "
                    "    RiskScore = :s, "
                    "    decisionReason = :d, "
                    "    ApplicationStatus = :st, "
                    "    updatedAt = :u"
                ),
                ExpressionAttributeValues={
                    ":r":  "high",
                    ":s":  100,
                    ":d":  "Rejected: No government scheme was mentioned in the application.",
                    ":st": "ANALYZED",  # ← final state; frontend polling stops here
                    ":u":  datetime.now(timezone.utc).isoformat(),
                },
            )
            print(f"Rejected (no scheme): {app_id}")
            continue

        # ── 5. Bedrock risk analysis ──────────────────────────────────────────────────
        prompt = f"""You are evaluating a government welfare application for risk and eligibility.

Application data:
{json.dumps(ai_data, indent=2)}

Return ONLY valid JSON with no extra text:

{{
  "riskLevel": "low, medium, or high",
  "RiskScore": 0,
  "decisionReason": "short explanation of the decision"
}}"""

        try:
            response = bedrock.converse(
                modelId=MODEL_ID,
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={"maxTokens": 200, "temperature": 0},
            )
            model_output = response["output"]["message"]["content"][0]["text"]
            print(f"Model output: {model_output}")

            json_match = re.search(r"\{.*?\}", model_output, re.DOTALL)
            risk_data  = json.loads(json_match.group(0)) if json_match else {}
        except Exception as e:
            print(f"Bedrock error: {e}")
            risk_data = {
                "riskLevel":     "unknown",
                "RiskScore":     0,
                "decisionReason": f"AI analysis failed: {str(e)}",
            }

        # ── 6. Write final result ─────────────────────────────────────────────────────
        table.update_item(
            Key={"DistrictID": district_id, "ApplicationID": app_id},
            UpdateExpression=(
                "SET riskLevel = :r, "
                "    RiskScore = :s, "
                "    decisionReason = :d, "
                "    ApplicationStatus = :st, "
                "    updatedAt = :u"
            ),
            ExpressionAttributeValues={
                ":r":  risk_data.get("riskLevel", "unknown"),
                ":s":  risk_data.get("RiskScore", 0),
                ":d":  risk_data.get("decisionReason", "No explanation provided"),
                ":st": "ANALYZED",  # ← final state; frontend polling stops here
                ":u":  datetime.now(timezone.utc).isoformat(),
            },
        )

        print(f"Finished analysis for {app_id} → ANALYZED")

    return {"statusCode": 200}
