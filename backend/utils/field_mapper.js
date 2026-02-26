// backend/utils/fieldMapper.js

function extractName(text) {
  const match = text.match(/name is (\w+)/);
  return match ? match[1] : null;
}

function extractAge(text) {
  const match = text.match(/age (\d{1,3})/);
  return match ? parseInt(match[1]) : null;
}

function extractScheme(text) {
  if (text.includes("old age pension") || text.includes("senior citizen pension")) {
    return "OLD_AGE_PENSION";
  }
  return null;
}

function extractIntent(text) {
  if (text.includes("apply")) return "APPLY";
  if (text.includes("status")) return "CHECK_STATUS";
  if (text.includes("rejected")) return "CHECK_REJECTION";
  return "APPLY";
}

module.exports = {
  extractName,
  extractAge,
  extractScheme,
  extractIntent
};