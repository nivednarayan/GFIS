function calculateConfidence(passed, total) {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

module.exports = calculateConfidence;