function validateApplication(data) {
  const { name, age } = data;

  let errors = [];
  let passedChecks = 0;
  let totalChecks = 2;

  // Required fields
  if (!name || age === undefined) {
    errors.push("MISSING_FIELDS");
  } else {
    passedChecks++;
  }

  // Age rule
  if (age >= 60) {
    passedChecks++;
  } else {
    errors.push("AGE_TOO_LOW");
  }

  return {
    isValid: errors.length === 0,
    errors,
    passedChecks,
    totalChecks
  };
}

module.exports = validateApplication;